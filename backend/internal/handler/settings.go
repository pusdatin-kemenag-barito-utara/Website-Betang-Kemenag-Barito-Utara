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

	current, err := h.svc.Get(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal mengambil pengaturan awal.")
	}

	var req struct {
		DisableRightClick       *bool   `json:"disableRightClick"`
		DisableRightClickSnake  *bool   `json:"disable_right_click"`
		DisablePrintShortcut    *bool   `json:"disablePrintShortcut"`
		DisablePrintShortcutSnake *bool `json:"disable_print_shortcut"`
		EnableWatermark         *bool   `json:"enableWatermark"`
		EnableWatermarkSnake    *bool   `json:"enable_watermark"`
		MaxUploadSizeMB         *int    `json:"maxUploadSizeMb"`
		MaxUploadSizeMBSnake    *int    `json:"max_upload_size_mb"`
		DefaultShareExpiryHours *int    `json:"defaultShareExpiryHours"`
		DefaultShareExpiryHoursSnake *int `json:"default_share_expiry_hours"`
		DefaultPdfViewerMode    *string `json:"defaultPdfViewerMode"`
		DefaultPdfViewerModeSnake *string `json:"default_pdf_viewer_mode"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}

	updated := *current

	if req.DisableRightClick != nil {
		updated.DisableRightClick = *req.DisableRightClick
	} else if req.DisableRightClickSnake != nil {
		updated.DisableRightClick = *req.DisableRightClickSnake
	}

	if req.DisablePrintShortcut != nil {
		updated.DisablePrintShortcut = *req.DisablePrintShortcut
	} else if req.DisablePrintShortcutSnake != nil {
		updated.DisablePrintShortcut = *req.DisablePrintShortcutSnake
	}

	if req.EnableWatermark != nil {
		updated.EnableWatermark = *req.EnableWatermark
	} else if req.EnableWatermarkSnake != nil {
		updated.EnableWatermark = *req.EnableWatermarkSnake
	}

	if req.MaxUploadSizeMB != nil && *req.MaxUploadSizeMB > 0 {
		updated.MaxUploadSizeMB = *req.MaxUploadSizeMB
	} else if req.MaxUploadSizeMBSnake != nil && *req.MaxUploadSizeMBSnake > 0 {
		updated.MaxUploadSizeMB = *req.MaxUploadSizeMBSnake
	}

	if req.DefaultShareExpiryHours != nil && *req.DefaultShareExpiryHours > 0 {
		updated.DefaultShareExpiryHours = *req.DefaultShareExpiryHours
	} else if req.DefaultShareExpiryHoursSnake != nil && *req.DefaultShareExpiryHoursSnake > 0 {
		updated.DefaultShareExpiryHours = *req.DefaultShareExpiryHoursSnake
	}

	if req.DefaultPdfViewerMode != nil && *req.DefaultPdfViewerMode != "" {
		updated.DefaultPdfViewerMode = *req.DefaultPdfViewerMode
	} else if req.DefaultPdfViewerModeSnake != nil && *req.DefaultPdfViewerModeSnake != "" {
		updated.DefaultPdfViewerMode = *req.DefaultPdfViewerModeSnake
	}

	if err := h.svc.Update(c.Context(), updated, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, updated)
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