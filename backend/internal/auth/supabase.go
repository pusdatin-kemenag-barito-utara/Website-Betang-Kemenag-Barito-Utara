// Package auth menangani komunikasi dengan Supabase Auth dan verifikasi JWT.
// Supabase tetap menjadi issuer token; aplikasi hanya memverifikasi dan
// mengelola siklus hidup sesi (login, refresh, logout).
package auth

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Tokens adalah hasil sukses dari operasi token Supabase.
type Tokens struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
	UserID       string
	Email        string
}

// SupabaseClient membungkus REST API Supabase Auth.
type SupabaseClient struct {
	url            string
	anonKey        string
	serviceRoleKey string
	jwtSecret      []byte
	http           *http.Client
}

// NewSupabaseClient membuat client Supabase Auth.
// jwtSecret dapat berupa base64 (encode 32 byte) atau plain text.
func NewSupabaseClient(url, anonKey, jwtSecret, serviceRoleKey string) *SupabaseClient {
	return &SupabaseClient{
		url:            url,
		anonKey:        anonKey,
		serviceRoleKey: serviceRoleKey,
		jwtSecret:      decodeJWTSecret(jwtSecret),
		http:           &http.Client{Timeout: 15 * time.Second},
	}
}

// decodeJWTSecret mencoba mendekode base64 terlebih dahulu; jika gagal,
// gunakan secret apa adanya.
func decodeJWTSecret(secret string) []byte {
	if decoded, err := base64.StdEncoding.DecodeString(secret); err == nil && len(decoded) >= 32 {
		return decoded
	}
	return []byte(secret)
}

// SignInWithPassword melakukan autentikasi email/password ke Supabase.
func (s *SupabaseClient) SignInWithPassword(ctx context.Context, email, password string) (*Tokens, error) {
	body, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.url+"/auth/v1/token?grant_type=password", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Authorization", "Bearer "+s.anonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("koneksi ke Supabase Auth gagal: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		var apiErr struct {
			Error            string `json:"error"`
			ErrorDescription string `json:"error_description"`
			Message          string `json:"msg"`
		}
		_ = json.Unmarshal(raw, &apiErr)
		msg := apiErr.ErrorDescription
		if msg == "" {
			msg = apiErr.Message
		}
		if msg == "" {
			msg = apiErr.Error
		}
		return nil, errors.New("email atau password yang Anda masukkan salah")
	}

	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
		User         struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("respon Supabase tidak valid: %w", err)
	}

	if result.AccessToken == "" {
		return nil, errors.New("respon Supabase Auth tidak berisi access token")
	}

	return &Tokens{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresIn:    result.ExpiresIn,
		UserID:       result.User.ID,
		Email:        result.User.Email,
	}, nil
}

// RefreshToken menukar refresh token dengan pasangan token baru.
func (s *SupabaseClient) RefreshToken(ctx context.Context, refreshToken string) (*Tokens, error) {
	body, _ := json.Marshal(map[string]string{"refresh_token": refreshToken})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.url+"/auth/v1/token?grant_type=refresh_token", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Authorization", "Bearer "+s.anonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, errors.New("refresh token tidak valid atau sudah kedaluwarsa")
	}

	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
		User         struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if result.AccessToken == "" {
		return nil, errors.New("respon refresh tidak berisi access token")
	}

	return &Tokens{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresIn:    result.ExpiresIn,
		UserID:       result.User.ID,
		Email:        result.User.Email,
	}, nil
}

// VerifyAccessToken memverifikasi tanda tangan dan masa berlaku JWT access token
// yang dikeluarkan oleh Supabase.
func (s *SupabaseClient) VerifyAccessToken(tokenString string) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode tanda tangan tidak didukung: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// AdminCreateUser membuat akun baru di Supabase Auth melalui Admin REST API.
func (s *SupabaseClient) AdminCreateUser(ctx context.Context, email, password, fullName, username string) (string, error) {
	if s.serviceRoleKey == "" {
		return "", errors.New("service role key tidak terkonfigurasi")
	}

	payload := map[string]any{
		"email":         strings.ToLower(strings.TrimSpace(email)),
		"password":      password,
		"email_confirm": true,
		"user_metadata": map[string]any{
			"full_name": strings.TrimSpace(fullName),
			"username":  strings.TrimSpace(username),
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.url+"/auth/v1/admin/users", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("apikey", s.serviceRoleKey)
	req.Header.Set("Authorization", "Bearer "+s.serviceRoleKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("koneksi admin Supabase gagal: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		var apiErr struct {
			Message string `json:"message"`
			Error   string `json:"error"`
			Msg     string `json:"msg"`
		}
		_ = json.Unmarshal(raw, &apiErr)
		msg := apiErr.Message
		if msg == "" {
			msg = apiErr.Msg
		}
		if msg == "" {
			msg = apiErr.Error
		}
		if strings.Contains(strings.ToLower(msg), "already") || strings.Contains(strings.ToLower(string(raw)), "already registered") {
			return "", errors.New("email ini sudah terdaftar di sistem autentikasi")
		}
		return "", fmt.Errorf("gagal membuat akun auth (%d): %s", resp.StatusCode, msg)
	}

	var res struct {
		ID   string `json:"id"`
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	_ = json.Unmarshal(raw, &res)
	userID := res.ID
	if userID == "" {
		userID = res.User.ID
	}
	if userID == "" {
		return "", errors.New("gagal mendapatkan ID pengguna baru dari Supabase")
	}
	return userID, nil
}

// AdminUpdateUser memperbarui email, password, dan/atau user_metadata di Supabase Auth.
func (s *SupabaseClient) AdminUpdateUser(ctx context.Context, id, email, password string, metadata map[string]any) error {
	if s.serviceRoleKey == "" {
		return errors.New("service role key tidak terkonfigurasi")
	}

	payload := map[string]any{}
	if email != "" {
		payload["email"] = strings.ToLower(strings.TrimSpace(email))
		payload["email_confirm"] = true
	}
	if password != "" {
		payload["password"] = password
	}
	if len(metadata) > 0 {
		payload["user_metadata"] = metadata
	}
	if len(payload) == 0 {
		return nil
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, s.url+"/auth/v1/admin/users/"+id, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("apikey", s.serviceRoleKey)
	req.Header.Set("Authorization", "Bearer "+s.serviceRoleKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("gagal memperbarui auth user (%d): %s", resp.StatusCode, string(raw))
	}
	return nil
}

// AdminDeleteUser menghapus akun dari Supabase Auth.
func (s *SupabaseClient) AdminDeleteUser(ctx context.Context, id string) error {
	if s.serviceRoleKey == "" {
		return errors.New("service role key tidak terkonfigurasi")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, s.url+"/auth/v1/admin/users/"+id, nil)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", s.serviceRoleKey)
	req.Header.Set("Authorization", "Bearer "+s.serviceRoleKey)

	resp, err := s.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 && resp.StatusCode != 404 {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("gagal menghapus auth user (%d): %s", resp.StatusCode, string(raw))
	}
	return nil
}

