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
	"sync"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/auth"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

// LoginResult adalah hasil sukses proses login.
type LoginResult struct {
	Session      *domain.Session
	Name         string
	Role         string
	Email        string
	IsSuperAdmin bool
}

type userMetaCacheItem struct {
	user      *domain.User
	expiresAt time.Time
}

// AuthService menangani autentikasi, sesi, dan otorisasi.
type AuthService struct {
	supabase  *auth.SupabaseClient
	userRepo  *repository.UserRepo
	cfg       *config.Config
	metaMu    sync.RWMutex
	metaCache map[string]userMetaCacheItem
}

// NewAuthService membuat instance AuthService baru dengan in-memory cache metadata.
func NewAuthService(supabase *auth.SupabaseClient, userRepo *repository.UserRepo, cfg *config.Config) *AuthService {
	return &AuthService{
		supabase:  supabase,
		userRepo:  userRepo,
		cfg:       cfg,
		metaCache: make(map[string]userMetaCacheItem),
	}
}

// ErrInvalidCredentials dipakai bila kredensial salah.
var ErrInvalidCredentials = errors.New("email atau password yang Anda masukkan salah")

// ErrAccountInactive dipakai bila akun dinonaktifkan.
var ErrAccountInactive = errors.New("Akun Anda sedang dinonaktifkan. Silakan hubungi administrator.")

// ErrNoPermission dipakai bila user tidak punya hak akses.
var ErrNoPermission = errors.New("Anda tidak memiliki hak akses untuk tindakan ini.")

// Login memvalidasi Turnstile dan Supabase Auth secara paralel, lalu
// memastikan user terdaftar di tabel internal kemenag_arsip.users.
func (s *AuthService) Login(ctx context.Context, email, password, turnstileToken string, rememberMe bool) (*LoginResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	password = strings.TrimSpace(password)

	var (
		turnstileErr error
		tokens       *auth.Tokens
		authErr      error
		wg           sync.WaitGroup
	)

	// 1) Jalankan verifikasi Turnstile dan Autentikasi Supabase secara paralel
	// untuk menghemat waktu latensi jaringan (menghemat ~600-800ms).
	if s.cfg.TurnstileSecretKey != "" {
		if turnstileToken == "" {
			return nil, errors.New("Verifikasi keamanan tidak lengkap. Silakan muat ulang halaman dan coba lagi.")
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			turnstileErr = s.verifyTurnstile(ctx, turnstileToken)
		}()
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		tokens, authErr = s.supabase.SignInWithPassword(ctx, email, password)
	}()

	wg.Wait()

	if turnstileErr != nil {
		return nil, turnstileErr
	}
	if authErr != nil {
		return nil, authErr
	}

	// 2) Ambil metadata user dari tabel mandiri kemenag_arsip.users (atau cache).
	user, err := s.UserMeta(ctx, tokens.Email)
	if err != nil {
		log.Printf("[AUTH ERROR] Gagal memuat data pengguna %s dari basis data: %v", tokens.Email, err)
		return nil, fmt.Errorf("gagal memuat data profil pengguna (%v)", err)
	}

	// Auto-provisioning jika Super Admin utama baritoutara@kemenag.go.id belum terdaftar di tabel kemenag_arsip.users
	if user == nil && strings.EqualFold(tokens.Email, "baritoutara@kemenag.go.id") {
		autoUser := &domain.User{
			ID:       tokens.UserID,
			Email:    tokens.Email,
			Username: "baritoutara",
			FullName: "ADMIN KABUPATEN",
			Role:     "Super Admin",
			IsActive: true,
		}
		if createErr := s.userRepo.CreateUser(ctx, autoUser); createErr == nil {
			user = autoUser
			s.SetUserMetaCache(tokens.Email, autoUser, 60*time.Second)
		}
	}

	if user == nil {
		return nil, errors.New("Akun Anda belum terdaftar dalam sistem SI BETANG.")
	}
	if !user.IsActive {
		return nil, ErrAccountInactive
	}

	// Simpan ke cache metadata pengguna selama 60 detik agar panggilan langsung
	// ke middleware dan /auth/me setelah redirect berjalan instan (0 ms).
	s.SetUserMetaCache(user.Email, user, 60*time.Second)

	// 3) Susun sesi.
	session := &domain.Session{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    time.Now().Unix() + tokens.ExpiresIn,
		UserID:       tokens.UserID,
		Email:        tokens.Email,
	}

	return &LoginResult{
		Session:      session,
		Name:         user.FullName,
		Role:         user.Role,
		Email:        user.Email,
		IsSuperAdmin: user.IsSuperAdmin(),
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

// UserMeta mengambil metadata profil untuk user yang sedang login dari cache atau basis data.
func (s *AuthService) UserMeta(ctx context.Context, email string) (*domain.User, error) {
	normEmail := strings.ToLower(strings.TrimSpace(email))
	if normEmail == "" {
		return nil, nil
	}

	s.metaMu.RLock()
	if s.metaCache != nil {
		if item, ok := s.metaCache[normEmail]; ok && time.Now().Before(item.expiresAt) {
			s.metaMu.RUnlock()
			return item.user, nil
		}
	}
	s.metaMu.RUnlock()

	user, err := s.userRepo.GetUserByEmail(ctx, normEmail)
	if err != nil {
		return nil, err
	}

	if user != nil {
		s.SetUserMetaCache(normEmail, user, 30*time.Second)
	}

	return user, nil
}

// SetUserMetaCache menyimpan metadata user ke memory cache dengan TTL tertentu.
func (s *AuthService) SetUserMetaCache(email string, user *domain.User, ttl time.Duration) {
	normEmail := strings.ToLower(strings.TrimSpace(email))
	if normEmail == "" || user == nil {
		return
	}
	s.metaMu.Lock()
	if s.metaCache == nil {
		s.metaCache = make(map[string]userMetaCacheItem)
	}
	s.metaCache[normEmail] = userMetaCacheItem{
		user:      user,
		expiresAt: time.Now().Add(ttl),
	}
	s.metaMu.Unlock()
}

// InvalidateUserMeta menghapus metadata user dari memory cache saat ada perubahan profil/role.
func (s *AuthService) InvalidateUserMeta(email string) {
	normEmail := strings.ToLower(strings.TrimSpace(email))
	if normEmail == "" {
		return
	}
	s.metaMu.Lock()
	if s.metaCache != nil {
		delete(s.metaCache, normEmail)
	}
	s.metaMu.Unlock()
}