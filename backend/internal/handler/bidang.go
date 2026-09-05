package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// BidangHandler menangani endpoint CRUD bidang.
type BidangHandler struct {
	svc *service.BidangService
}

// NewBidangHandler membuat handler bidang.
func NewBidangHandler(svc *service.BidangService) *BidangHandler {
	return &BidangHandler{svc: svc}
}

// List mengembalikan seluruh bidang beserta jumlah dokumen.
func (h *BidangHandler) List(c fiber.Ctx) error {
	items, err := h.svc.List(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat bidang.")
	}
	return writeOK(c, items)
}

// Create menambah bidang baru (super admin).
func (h *BidangHandler) Create(c fiber.Ctx) error {
	var req struct {
		Name                 string   `json:"name"`
		FolderIDs            []string `json:"folderIds"`
		AutoCreateRootFolder bool     `json:"autoCreateRootFolder"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)
	created, err := h.svc.Create(c.Context(), req.Name, req.FolderIDs, req.AutoCreateRootFolder, user.ID, user.Email, clientIP(c))
	if err != nil {
		return writeError(c, err)
	}
	return writeOK(c, created)
}

// GetFolders mengambil daftar ID folder root yang diizinkan untuk satu bidang.
func (h *BidangHandler) GetFolders(c fiber.Ctx) error {
	id := c.Params("id")
	ids, err := h.svc.GetAccessibleFolderIDs(c.Context(), id)
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat hak akses folder.")
	}
	return writeOK(c, ids)
}

// SetFolders memperbarui daftar ID folder root yang diizinkan untuk satu bidang.
func (h *BidangHandler) SetFolders(c fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		FolderIDs []string `json:"folderIds"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)
	if err := h.svc.SetAccessibleFolders(c.Context(), id, req.FolderIDs, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{"success": true})
}

// Update mengubah nama/urutan bidang (super admin).
func (h *BidangHandler) Update(c fiber.Ctx) error {
	var req struct {
		Name      string `json:"name"`
		SortOrder int    `json:"sortOrder"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	id := c.Params("id")
	user := currentUser(c)
	if err := h.svc.Update(c.Context(), id, req.Name, req.SortOrder, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{"id": id})
}

// Delete menghapus bidang (super admin).
func (h *BidangHandler) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	user := currentUser(c)
	if err := h.svc.Delete(c.Context(), id, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, nil)
}

// Reorder memperbarui urutan bidang (super admin).
func (h *BidangHandler) Reorder(c fiber.Ctx) error {
	var req struct {
		Items []struct {
			ID string `json:"id"`
		} `json:"items"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)

	items := make([]domain.Bidang, 0, len(req.Items))
	for i, item := range req.Items {
		items = append(items, domain.Bidang{ID: item.ID, SortOrder: i})
	}
	if err := h.svc.Reorder(c.Context(), items, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, nil)
}