package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// TrashHandler menangani endpoint recycle bin.
type TrashHandler struct {
	svc *service.TrashService
}

// NewTrashHandler membuat handler recycle bin.
func NewTrashHandler(svc *service.TrashService) *TrashHandler {
	return &TrashHandler{svc: svc}
}

// List mengambil seluruh item di recycle bin.
func (h *TrashHandler) List(c fiber.Ctx) error {
	items, err := h.svc.List(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat recycle bin.")
	}
	return writeOK(c, items)
}

// Restore memulihkan satu item dari recycle bin.
func (h *TrashHandler) Restore(c fiber.Ctx) error {
	var req struct {
		ID   string `json:"id"`
		Type string `json:"type"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)
	if err := h.svc.Restore(c.Context(), req.ID, req.Type, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, nil)
}

// RestoreBatch memulihkan banyak item sekaligus dari recycle bin.
func (h *TrashHandler) RestoreBatch(c fiber.Ctx) error {
	var req struct {
		Items []struct {
			ID   string `json:"id"`
			Type string `json:"type"`
		} `json:"items"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)

	items := make([]domain.TrashItem, 0, len(req.Items))
	for _, item := range req.Items {
		items = append(items, domain.TrashItem{ID: item.ID, Type: item.Type})
	}
	if err := h.svc.RestoreBatch(c.Context(), items, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, nil)
}

// PermanentDelete menghapus item dari database secara permanen.
func (h *TrashHandler) PermanentDelete(c fiber.Ctx) error {
	var req struct {
		Items []struct {
			ID   string `json:"id"`
			Type string `json:"type"`
		} `json:"items"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)

	items := make([]domain.TrashItem, 0, len(req.Items))
	for _, item := range req.Items {
		items = append(items, domain.TrashItem{ID: item.ID, Type: item.Type})
	}
	if err := h.svc.PermanentDelete(c.Context(), items, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, nil)
}