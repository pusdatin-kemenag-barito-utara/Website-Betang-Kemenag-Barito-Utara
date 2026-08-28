package handler

import (
	"errors"

	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// SettingsHandler menangani pengaturan aplikasi (khusus super admin).
type SettingsHandler struct {
	svc    *service.SettingsService
	auth   *service.AuthService
}

// NewSettingsHandler membuat handler pengaturan.
func NewSettingsHandler(svc *service.SettingsService, auth *service.AuthService) *SettingsHandler {
	return &SettingsHandler{svc: svc, auth: auth}
}

// ErrForbidden dipakai bila akses ditolak.
var ErrForbidden = errors.New("Anda tidak memiliki izin untuk melakukan tindakan ini.")

// Get mengambil pengaturan aplikasi.
func (h *SettingsHandler) Get(c fiber.Ctx) error {
	settings, err := h.svc.Get(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat pengaturan.")
	}
	return writeOK(c, settings)
}

// Update menyimpan pengaturan aplikasi (hanya super admin).
func (h *SettingsHandler) Update(c fiber.Ctx) error {
	user := currentUser(c)
	if !h.isSuperAdmin(c, user.Email) {
		return writeFail(c, fiber.StatusForbidden, ErrForbidden.Error())
	}

	var req struct {
		DisableRightClick      *bool `json:"disableRightClick"`
		DisableRightClickSnake *bool `json:"disable_right_click"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}

	val := true
	if req.DisableRightClick != nil {
		val = *req.DisableRightClick
	} else if req.DisableRightClickSnake != nil {
		val = *req.DisableRightClickSnake
	}

	if err := h.svc.Update(c.Context(), val, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{
		"disableRightClick":   val,
		"disable_right_click": val,
	})
}

// isSuperAdmin memeriksa apakah user berstatus super admin di pusdatin.
func (h *SettingsHandler) isSuperAdmin(c fiber.Ctx, email string) bool {
	if email == "" {
		return false
	}
	meta, err := h.auth.UserMeta(c.Context(), email)
	if err != nil || meta == nil {
		return false
	}
	return meta.IsSuperAdmin()
}