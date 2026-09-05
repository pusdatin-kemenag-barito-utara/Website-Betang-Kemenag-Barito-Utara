package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/middleware"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// AuthHandler menangani login, logout, dan informasi sesi.
type AuthHandler struct {
	auth   *service.AuthService
	authMW *middleware.AuthMiddleware
}

// NewAuthHandler membuat handler autentikasi.
func NewAuthHandler(auth *service.AuthService, _ *service.Services) *AuthHandler {
	return &AuthHandler{auth: auth}
}

// SetAuthMiddleware dipanggil saat server dibangun untuk injeksi cookie.
func (h *AuthHandler) SetAuthMiddleware(m *middleware.AuthMiddleware) {
	h.authMW = m
}

// Login memproses autentikasi pengguna.
func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req struct {
		Email          string `json:"email"`
		Password       string `json:"password"`
		TurnstileToken string `json:"turnstileToken"`
		RememberMe     bool   `json:"rememberMe"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}

	result, err := h.auth.Login(c.Context(), req.Email, req.Password, req.TurnstileToken, req.RememberMe)
	if err != nil {
		return writeError(c, err)
	}

	// Simpan sesi ke cookie httpOnly.
	if h.authMW != nil {
		h.authMW.SetSessionCookie(c, result.Session, !req.RememberMe)
		if !req.RememberMe {
			c.Cookie(&fiber.Cookie{
				Name:   "session_only",
				Value:  "true",
				Path:   "/",
				Secure: h.authMW.Secure(),
			})
		}
	}

	return writeOK(c, fiber.Map{
		"user": fiber.Map{
			"name":         result.Name,
			"email":        result.Email,
			"role":         result.Role,
			"isSuperAdmin": result.IsSuperAdmin,
		},
	})
}

// Logout menghapus sesi dan cookie.
func (h *AuthHandler) Logout(c fiber.Ctx) error {
	c.Set("Clear-Site-Data", `"cache"`)
	if h.authMW != nil {
		h.authMW.ClearSession(c)
		c.Cookie(&fiber.Cookie{Name: "session_only", Value: "", Path: "/", MaxAge: -1})
	}
	return writeOK(c, nil)
}

// Me mengembalikan informasi user yang sedang login.
func (h *AuthHandler) Me(c fiber.Ctx) error {
	user := currentUser(c)
	if user.Email == "" {
		return writeFail(c, fiber.StatusUnauthorized, "Sesi tidak valid.")
	}

	meta, err := h.auth.UserMeta(c.Context(), user.Email)
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat data pengguna.")
	}
	if meta == nil {
		return writeFail(c, fiber.StatusNotFound, "Akun Anda tidak terdaftar di sistem terpusat.")
	}

	status := "inactive"
	if meta.IsActive {
		status = "active"
	}

	return writeOK(c, fiber.Map{
		"user": fiber.Map{
			"id":           meta.ID,
			"name":         meta.FullName,
			"fullName":     meta.FullName,
			"username":     meta.Username,
			"email":        meta.Email,
			"role":         meta.Role,
			"bidangId":     meta.BidangID,
			"bidangName":   meta.BidangName,
			"status":       status,
			"isActive":     meta.IsActive,
			"isSuperAdmin": meta.IsSuperAdmin(),
		},
	})
}