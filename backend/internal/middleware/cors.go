package middleware

import (
	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
)

// CORSHandler menangani Cross-Origin Resource Sharing secara manual.
// Origin hanya diizinkan bila terdaftar pada CORS_ALLOWED_ORIGINS.
type CORSHandler struct {
	allowedOrigins map[string]bool
	secure         bool
}

// NewCORSHandler membuat handler CORS dari daftar origin yang diizinkan.
func NewCORSHandler(cfg *config.Config) *CORSHandler {
	allowed := make(map[string]bool, len(cfg.CORSAllowedOrigins))
	for _, origin := range cfg.CORSAllowedOrigins {
		allowed[origin] = true
	}
	return &CORSHandler{allowedOrigins: allowed, secure: cfg.CookieSecure}
}

// Handle adalah middleware CORS utama.
func (h *CORSHandler) Handle(c fiber.Ctx) error {
	origin := c.Get("Origin")

	// Bukan request lintas-asal (browser same-origin): lanjutkan langsung.
	if origin == "" || h.allowedOrigins[origin] {
		h.setHeaders(c, origin)
	}

	// Tangani preflight OPTIONS.
	if c.Method() == fiber.MethodOptions {
		if origin != "" && !h.allowedOrigins[origin] {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Status(fiber.StatusNoContent).SendString("")
	}

	return c.Next()
}

func (h *CORSHandler) setHeaders(c fiber.Ctx, origin string) {
	if origin != "" {
		c.Set("Access-Control-Allow-Origin", origin)
		c.Set("Vary", "Origin")
	}
	c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	c.Set("Access-Control-Allow-Credentials", "true")
	c.Set("Alt-Svc", `h3=":443"; ma=86400, h3-29=":443"; ma=86400`)
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("X-Frame-Options", "SAMEORIGIN")
	c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
	c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
}