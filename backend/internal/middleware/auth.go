// Package middleware berisi middleware HTTP Fiber: autentikasi dan CORS.
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// KeyAuthUser adalah key Locals untuk user terautentikasi.
const KeyAuthUser = "auth_user"

// AuthMiddleware memverifikasi sesi dari cookie di setiap request.
type AuthMiddleware struct {
	authService *service.AuthService
	cfg         *config.Config
}

// NewAuthMiddleware membuat middleware autentikasi.
func NewAuthMiddleware(authService *service.AuthService, cfg *config.Config) *AuthMiddleware {
	return &AuthMiddleware{authService: authService, cfg: cfg}
}

// RequireAuth memastikan request memiliki sesi valid; bila token kedaluwarsa,
// sesi dicoba diperbarui lewat refresh token.
func (m *AuthMiddleware) RequireAuth(c fiber.Ctx) error {
	// Kumpulkan seluruh kandidat cookie earsip-auth (baik dari c.Cookies maupun Cookie header raw)
	// untuk mengatasi situasi saat browser mengirimkan cookie ganda dari apex domain (.kemenag-baritoutara.com) dan subdomain.
	var candidates []string
	if direct := c.Cookies(m.cfg.CookieName); direct != "" {
		candidates = append(candidates, direct)
	}

	cookieHeader := c.Get("Cookie")
	if cookieHeader == "" {
		cookieHeader = c.Get("cookie")
	}
	if cookieHeader != "" {
		for _, part := range strings.Split(cookieHeader, ";") {
			part = strings.TrimSpace(part)
			if strings.HasPrefix(part, m.cfg.CookieName+"=") {
				val := strings.TrimPrefix(part, m.cfg.CookieName+"=")
				if val != "" {
					found := false
					for _, existing := range candidates {
						if existing == val {
							found = true
							break
						}
					}
					if !found {
						candidates = append(candidates, val)
					}
				}
			}
		}
	}

	if len(candidates) == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Sesi tidak ditemukan. Silakan masuk kembali.",
		})
	}

	// Evaluasi setiap kandidat cookie hingga menemukan sesi yang valid
	var validSession *domain.Session
	var chosenRaw string

	for _, raw := range candidates {
		session, err := m.authService.VerifySession(c.Context(), raw, true)
		if err == nil && session != nil {
			validSession = session
			chosenRaw = raw
			break
		}
	}

	if validSession == nil {
		m.ClearSession(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Sesi kedaluwarsa. Silakan masuk kembali.",
		})
	}

	// Tulis ulang cookie bila refresh token menghasilkan sesi baru.
	encoded := service.EncodeSession(validSession)
	if encoded != chosenRaw {
		m.SetSessionCookie(c, validSession, c.Cookies("session_only") == "true")
	}

	c.Locals(KeyAuthUser, &domain.AuthUser{ID: validSession.UserID, Email: validSession.Email})
	return c.Next()
}

// SetSessionCookie menulis cookie sesi httpOnly.
// Bila sessionOnly (remember me tidak dicentang), cookie menjadi session cookie (dihapus saat browser ditutup).
// Bila rememberMe aktif (!sessionOnly), cookie diberi masa berlaku 30 hari (2.592.000 detik).
const rememberMeMaxAge = 30 * 24 * 60 * 60 // 30 hari

func (m *AuthMiddleware) SetSessionCookie(c fiber.Ctx, session *domain.Session, sessionOnly bool) {
	cookie := &fiber.Cookie{
		Name:     m.cfg.CookieName,
		Value:    service.EncodeSession(session),
		Path:     "/",
		Domain:   m.cfg.CookieDomain,
		Secure:   m.cfg.CookieSecure,
		HTTPOnly: true,
		SameSite: "Lax",
	}
	if !sessionOnly {
		cookie.MaxAge = rememberMeMaxAge
	}
	c.Cookie(cookie)
}

// Secure mengembalikan pengaturan flag Secure pada cookie.
func (m *AuthMiddleware) Secure() bool {
	return m.cfg.CookieSecure
}

// ClearSession menghapus cookie sesi di level host dan level domain.
func (m *AuthMiddleware) ClearSession(c fiber.Ctx) {
	// Hapus cookie level host
	c.Cookie(&fiber.Cookie{
		Name:     m.cfg.CookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   m.cfg.CookieSecure,
	})
	// Hapus cookie level domain jika domain dikonfigurasi
	if m.cfg.CookieDomain != "" {
		c.Cookie(&fiber.Cookie{
			Name:     m.cfg.CookieName,
			Value:    "",
			Path:     "/",
			Domain:   m.cfg.CookieDomain,
			MaxAge:   -1,
			HTTPOnly: true,
			SameSite: "Lax",
			Secure:   m.cfg.CookieSecure,
		})
	}
}