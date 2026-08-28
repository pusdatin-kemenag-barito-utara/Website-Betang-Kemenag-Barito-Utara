package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/auth"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

// LoginResult adalah hasil sukses proses login.
type LoginResult struct {
	Session     *domain.Session
	Name        string
	Role        string
	Email       string
	IsSuperAdmin bool
}

// AuthService menangani autentikasi, sesi, dan otorisasi.
type AuthService struct {
	supabase *auth.SupabaseClient
	pusdatin *repository.PusdatinRepo
	cfg      *config.Config
}

// ErrInvalidCredentials dipakai bila kredensial salah.
var ErrInvalidCredentials = errors.New("email atau password yang Anda masukkan salah")

// ErrAccountInactive dipakai bila akun dinonaktifkan.
var ErrAccountInactive = errors.New("Akun Anda sedang dinonaktifkan. Silakan hubungi administrator.")

// ErrNoPermission dipakai bila user tidak punya akses aplikasi.
var ErrNoPermission = errors.New("Anda tidak memiliki hak akses untuk aplikasi E-Arsip.")

// Login memvalidasi Turnstile, memeriksa kredensial ke Supabase, lalu
// memastikan user terdaftar di pusdatin dengan izin aplikasi e-arsip.
func (s *AuthService) Login(ctx context.Context, email, password, turnstileToken string, rememberMe bool) (*LoginResult, error) {
	if turnstileToken == "" {
		return nil, errors.New("Verifikasi keamanan tidak lengkap. Silakan muat ulang halaman dan coba lagi.")
	}

	// 1) Validasi Turnstile.
	if err := s.verifyTurnstile(ctx, turnstileToken); err != nil {
		return nil, err
	}

	// 2) Autentikasi ke Supabase Auth.
	tokens, err := s.supabase.SignInWithPassword(ctx, strings.TrimSpace(email), password)
	if err != nil {
		return nil, err
	}

	// 3) Ambil metadata user dari pusdatin.
	meta, err := s.pusdatin.GetUserByEmail(ctx, tokens.Email)
	if err != nil {
		log.Printf("[AUTH ERROR] Gagal memuat data pengguna %s dari pusdatin: %v", tokens.Email, err)
		return nil, fmt.Errorf("gagal memuat data pengguna dari sistem terpusat (%v)", err)
	}
	if meta == nil {
		return nil, errors.New("Akun Anda tidak terdaftar di sistem terpusat.")
	}
	if !strings.EqualFold(meta.Status, "active") {
		return nil, ErrAccountInactive
	}
	if !meta.HasPermission(s.cfg.PusdatinAppID) {
		return nil, ErrNoPermission
	}

	// 4) Susun sesi.
	session := &domain.Session{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    time.Now().Unix() + tokens.ExpiresIn,
		UserID:       tokens.UserID,
		Email:        tokens.Email,
	}

	return &LoginResult{
		Session:      session,
		Name:         meta.Name,
		Role:         meta.Role,
		Email:        meta.Email,
		IsSuperAdmin: meta.IsSuperAdmin(),
	}, nil
}

// VerifySession memvalidasi sesi dari cookie; jika token kedaluwarsa dan
// refresh diizinkan, token diperbarui lewat Supabase.
func (s *AuthService) VerifySession(ctx context.Context, raw string, allowRefresh bool) (*domain.Session, error) {
	session, err := decodeSession(raw)
	if err != nil {
		return nil, errors.New("sesi tidak valid")
	}

	_, err = s.supabase.VerifyAccessToken(session.AccessToken)
	if err == nil {
		return session, nil
	}

	if !allowRefresh || session.RefreshToken == "" {
		return nil, errors.New("sesi kedaluwarsa")
	}

	tokens, err := s.supabase.RefreshToken(ctx, session.RefreshToken)
	if err != nil {
		return nil, err
	}
	session.AccessToken = tokens.AccessToken
	session.RefreshToken = tokens.RefreshToken
	session.ExpiresAt = time.Now().Unix() + tokens.ExpiresIn
	session.UserID = tokens.UserID
	session.Email = tokens.Email
	return session, nil
}

// EncodeSession menyandikan sesi menjadi nilai cookie (base64 JSON).
func EncodeSession(session *domain.Session) string {
	raw, _ := json.Marshal(session)
	return base64.RawURLEncoding.EncodeToString(raw)
}

func decodeSession(raw string) (*domain.Session, error) {
	data, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, err
	}
	var session domain.Session
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, err
	}
	if session.AccessToken == "" {
		return nil, errors.New("sesi kosong")
	}
	return &session, nil
}

// verifyTurnstile memvalidasi token Turnstile ke Cloudflare.
func (s *AuthService) verifyTurnstile(ctx context.Context, token string) error {
	form := url.Values{}
	form.Set("secret", s.cfg.TurnstileSecretKey)
	form.Set("response", token)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return errors.New("verifikasi keamanan gagal. Silakan coba lagi.")
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return errors.New("respon verifikasi tidak valid")
	}
	if !result.Success {
		return errors.New("Verifikasi keamanan gagal. Silakan coba lagi.")
	}
	return nil
}

// UserMeta mengambil metadata pusdatin untuk user yang sedang login.
func (s *AuthService) UserMeta(ctx context.Context, email string) (*domain.PusdatinUser, error) {
	return s.pusdatin.GetUserByEmail(ctx, email)
}