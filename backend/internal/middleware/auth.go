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
	raw := c.Cookies(m.cfg.CookieName)
	if raw == "" {
		cookieHeader := c.Get("Cookie")
		if cookieHeader == "" {
			cookieHeader = c.Get("cookie")
		}
		if cookieHeader != "" {
			for _, part := range strings.Split(cookieHeader, ";") {
				part = strings.TrimSpace(part)
				if strings.HasPrefix(part, m.cfg.CookieName+"=") {
					raw = strings.TrimPrefix(part, m.cfg.CookieName+"=")
					break
				}
			}
		}
	}
	if raw == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Sesi tidak ditemukan. Silakan masuk kembali.",
		})
	}

	session, err := m.authService.VerifySession(c.Context(), raw, true)
	if err != nil {
		m.ClearSession(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Sesi kedaluwarsa. Silakan masuk kembali.",
		})
	}

	// Tulis ulang cookie bila refresh token menghasilkan sesi baru.
	encoded := service.EncodeSession(session)
	if encoded != raw {
		m.SetSessionCookie(c, session, c.Cookies("session_only") == "true")
	}

	c.Locals(KeyAuthUser, &domain.AuthUser{ID: session.UserID, Email: session.Email})
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

// ClearSession menghapus cookie sesi.
func (m *AuthMiddleware) ClearSession(c fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     m.cfg.CookieName,
		Value:    "",
		Path:     "/",
		Domain:   m.cfg.CookieDomain,
		MaxAge:   -1,
		HTTPOnly: true,
		SameSite: "Lax",
	})
}