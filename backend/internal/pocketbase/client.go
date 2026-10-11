// Package pocketbase menyediakan client REST API PocketBase untuk SI BETANG.
package pocketbase

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// ErrNotFound menandakan record tidak ditemukan di PocketBase.
var ErrNotFound = errors.New("record tidak ditemukan")

// Client membungkus komunikasi REST API ke PocketBase server.
type Client struct {
	baseURL       string
	adminEmail    string
	adminPassword string

	adminToken string
	tokenExp   time.Time
	tokenMu    sync.RWMutex

	httpClient *http.Client
}

// NewClient membuat instance PocketBase Client baru.
func NewClient(baseURL, adminEmail, adminPassword string) (*Client, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" {
		return nil, errors.New("POCKETBASE_URL tidak boleh kosong")
	}

	c := &Client{
		baseURL:       baseURL,
		adminEmail:    adminEmail,
		adminPassword: adminPassword,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	// Cek koneksi awal dan autentikasi admin superuser
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if adminEmail != "" && adminPassword != "" {
		if err := c.authenticateAdmin(ctx); err != nil {
			return nil, fmt.Errorf("autentikasi superuser PocketBase gagal: %w", err)
		}
	}

	return c, nil
}

// authenticateAdmin login sebagai superuser ke PocketBase.
func (c *Client) authenticateAdmin(ctx context.Context) error {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	payload, _ := json.Marshal(map[string]string{
		"identity": c.adminEmail,
		"password": c.adminPassword,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/api/collections/_superusers/auth-with-password",
		bytes.NewReader(payload),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("status %d: %s", resp.StatusCode, string(body))
	}

	var res struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	c.adminToken = res.Token
	// Set masa berlaku token (PocketBase default 1-14 hari, anggap 24 jam)
	c.tokenExp = time.Now().Add(24 * time.Hour)
	return nil
}

// getAdminToken mengambil admin token yang masih valid atau me-refresh otomatis.
func (c *Client) getAdminToken(ctx context.Context) (string, error) {
	c.tokenMu.RLock()
	token := c.adminToken
	expired := time.Now().After(c.tokenExp) || token == ""
	c.tokenMu.RUnlock()

	if expired {
		if err := c.authenticateAdmin(ctx); err != nil {
			return "", err
		}
		c.tokenMu.RLock()
		token = c.adminToken
		c.tokenMu.RUnlock()
	}

	return token, nil
}

// Ping memeriksa apakah server PocketBase aktif dan sehat.
func (c *Client) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/health", nil)
	if err != nil {
		return err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("health check returned status %d", resp.StatusCode)
	}
	return nil
}

// AuthRecord adalah representasi user auth yang dikembalikan PocketBase.
type AuthRecord struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	BidangID  string `json:"bidang_id"`
	IsActive  bool   `json:"is_active"`
	AvatarURL string `json:"avatar_url"`
	Verified  bool   `json:"verified"`
	Created   string `json:"created"`
	Updated   string `json:"updated"`
}

// ToDomainUser mengonversi AuthRecord menjadi domain.User.
func (a *AuthRecord) ToDomainUser() *domain.User {
	var bID *string
	if a.BidangID != "" {
		bID = &a.BidangID
	}
	var avatar *string
	if a.AvatarURL != "" {
		avatar = &a.AvatarURL
	}

	role := a.Role
	if role == "" {
		role = "Admin Bidang"
	}

	created, _ := time.Parse(time.RFC3339Nano, a.Created)
	if created.IsZero() {
		created, _ = time.Parse("2006-01-02 15:04:05.000Z", a.Created)
	}
	updated, _ := time.Parse(time.RFC3339Nano, a.Updated)
	if updated.IsZero() {
		updated, _ = time.Parse("2006-01-02 15:04:05.000Z", a.Updated)
	}

	name := a.Name
	if name == "" {
		name = a.Username
	}

	return &domain.User{
		ID:        a.ID,
		Email:     a.Email,
		Username:  a.Username,
		FullName:  name,
		Role:      role,
		BidangID:  bID,
		IsActive:  a.IsActive,
		AvatarURL: avatar,
		CreatedAt: created,
		UpdatedAt: updated,
	}
}

// AuthResponse adalah payload sukses login / refresh user.
type AuthResponse struct {
	Token  string     `json:"token"`
	Record AuthRecord `json:"record"`
}

// UserAuthWithPassword melakukan autentikasi email / username dan password ke koleksi users.
func (c *Client) UserAuthWithPassword(ctx context.Context, identity, password string) (*AuthResponse, error) {
	payload, _ := json.Marshal(map[string]string{
		"identity": identity,
		"password": password,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/api/collections/users/auth-with-password",
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("koneksi ke PocketBase gagal: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, errors.New("email atau password yang Anda masukkan salah")
	}

	var res AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

// UserAuthRefresh me-refresh token autentikasi user.
func (c *Client) UserAuthRefresh(ctx context.Context, token string) (*AuthResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/api/collections/users/auth-refresh",
		nil,
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, errors.New("sesi kedaluwarsa")
	}

	var res AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

// ListParams opsi untuk pencarian dan pagination.
type ListParams struct {
	Page    int
	PerPage int
	Sort    string
	Filter  string
	Expand  string
}

// ListResponse pembungkus respon pagination PocketBase.
type ListResponse struct {
	Page       int             `json:"page"`
	PerPage    int             `json:"perPage"`
	TotalItems int             `json:"totalItems"`
	TotalPages int             `json:"totalPages"`
	Items      json.RawMessage `json:"items"`
}

// List mengambil daftar record dari sebuah koleksi.
func (c *Client) List(ctx context.Context, collection string, params ListParams, dest any) (*ListResponse, error) {
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return nil, err
	}

	q := url.Values{}
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PerPage <= 0 {
		params.PerPage = 500
	}
	q.Set("page", fmt.Sprintf("%d", params.Page))
	q.Set("perPage", fmt.Sprintf("%d", params.PerPage))
	if params.Sort != "" {
		q.Set("sort", params.Sort)
	}
	if params.Filter != "" {
		q.Set("filter", params.Filter)
	}
	if params.Expand != "" {
		q.Set("expand", params.Expand)
	}

	urlStr := fmt.Sprintf("%s/api/collections/%s/records?%s", c.baseURL, collection, q.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlStr, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list %s failed (%d): %s", collection, resp.StatusCode, string(body))
	}

	var lr ListResponse
	if err := json.NewDecoder(resp.Body).Decode(&lr); err != nil {
		return nil, err
	}

	if dest != nil {
		if err := json.Unmarshal(lr.Items, dest); err != nil {
			return nil, fmt.Errorf("unmarshal list items failed: %w", err)
		}
	}

	return &lr, nil
}

// Get mengambil satu record berdasarkan ID.
func (c *Client) Get(ctx context.Context, collection, id string, dest any) error {
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}

	urlStr := fmt.Sprintf("%s/api/collections/%s/records/%s", c.baseURL, collection, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlStr, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("get %s/%s failed (%d): %s", collection, id, resp.StatusCode, string(body))
	}

	if dest != nil {
		return json.NewDecoder(resp.Body).Decode(dest)
	}
	return nil
}

// Create membuat record baru di koleksi.
func (c *Client) Create(ctx context.Context, collection string, data any, dest any) error {
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}

	bodyBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}

	urlStr := fmt.Sprintf("%s/api/collections/%s/records", c.baseURL, collection)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, urlStr, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("create in %s failed (%d): %s", collection, resp.StatusCode, string(body))
	}

	if dest != nil {
		return json.NewDecoder(resp.Body).Decode(dest)
	}
	return nil
}

// Update memperbarui record yang ada.
func (c *Client) Update(ctx context.Context, collection, id string, data any, dest any) error {
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}

	bodyBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}

	urlStr := fmt.Sprintf("%s/api/collections/%s/records/%s", c.baseURL, collection, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, urlStr, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("update %s/%s failed (%d): %s", collection, id, resp.StatusCode, string(body))
	}

	if dest != nil {
		return json.NewDecoder(resp.Body).Decode(dest)
	}
	return nil
}

// Delete menghapus record berdasarkan ID.
func (c *Client) Delete(ctx context.Context, collection, id string) error {
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}

	urlStr := fmt.Sprintf("%s/api/collections/%s/records/%s", c.baseURL, collection, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, urlStr, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete %s/%s failed (%d): %s", collection, id, resp.StatusCode, string(body))
	}
	return nil
}
