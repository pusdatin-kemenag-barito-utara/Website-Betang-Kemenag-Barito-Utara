package handler

import (
	"strings"

	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// FolderHandler menangani endpoint folder dan operasi item.
type FolderHandler struct {
	folders *service.FolderService
	files   *service.FileService
}

// NewFolderHandler membuat handler folder.
func NewFolderHandler(folders *service.FolderService, files *service.FileService) *FolderHandler {
	return &FolderHandler{folders: folders, files: files}
}

// Contents mengambil isi direktori (folder + file), dengan dukungan
// parameter query `q` untuk pencarian global.
func (h *FolderHandler) Contents(c fiber.Ctx) error {
	folderID := c.Params("folderId")
	query := strings.TrimSpace(c.Query("q"))
	user := currentUser(c)

	parentID := cleanUUID(folderID)
	contents, err := h.folders.Contents(c.Context(), parentID, query, user)
	if err != nil {
		if strings.Contains(err.Error(), "tidak memiliki izin") {
			return writeFail(c, fiber.StatusForbidden, err.Error())
		}
		if strings.Contains(err.Error(), "tidak ditemukan") {
			return writeFail(c, fiber.StatusNotFound, err.Error())
		}
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat isi folder.")
	}
	return writeOK(c, contents)
}

// Breadcrumbs mengambil jalur folder dari akar hingga folder saat ini.
func (h *FolderHandler) Breadcrumbs(c fiber.Ctx) error {
	folderID := c.Params("folderId")
	cleanID := cleanUUID(folderID)
	if cleanID == nil {
		return writeOK(c, []any{})
	}
	user := currentUser(c)
	paths, err := h.folders.Breadcrumbs(c.Context(), *cleanID, user)
	if err != nil {
		if strings.Contains(err.Error(), "tidak memiliki izin") {
			return writeFail(c, fiber.StatusForbidden, err.Error())
		}
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat jalur folder.")
	}
	return writeOK(c, paths)
}

// Tree mengambil seluruh folder untuk pohon pindah/salin.
func (h *FolderHandler) Tree(c fiber.Ctx) error {
	user := currentUser(c)
	tree, err := h.folders.Tree(c.Context(), user)
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat pohon folder.")
	}
	return writeOK(c, tree)
}

// Create membuat folder baru.
func (h *FolderHandler) Create(c fiber.Ctx) error {
	var req struct {
		Name     string `json:"name"`
		ParentID string `json:"parentId"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}

	user := currentUser(c)
	parentID := cleanUUID(req.ParentID)
	created, err := h.folders.Create(c.Context(), req.Name, parentID, user.ID, user.Email, clientIP(c), user.BidangID)
	if err != nil {
		return writeError(c, err)
	}
	return writeOK(c, created)
}

// RenameItem mengganti nama folder atau file.
func (h *FolderHandler) RenameItem(c fiber.Ctx) error {
	var req struct {
		ID      string `json:"id"`
		Type    string `json:"type"`
		NewName string `json:"newName"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)

	switch req.Type {
	case "folder":
		if err := h.folders.Rename(c.Context(), req.ID, req.NewName, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	case "file":
		if err := h.files.Rename(c.Context(), req.ID, req.NewName, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	default:
		return writeFail(c, fiber.StatusBadRequest, "Jenis item tidak dikenal.")
	}
	return writeOK(c, fiber.Map{"id": req.ID})
}

// MoveItem memindahkan folder atau file ke folder lain.
func (h *FolderHandler) MoveItem(c fiber.Ctx) error {
	var req struct {
		ID             string `json:"id"`
		Type           string `json:"type"`
		TargetFolderID string `json:"targetFolderId"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)

	var target *string
	if req.TargetFolderID != "" && req.TargetFolderID != "root" {
		target = &req.TargetFolderID
	}

	switch req.Type {
	case "folder":
		if err := h.folders.Move(c.Context(), req.ID, target, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	case "file":
		if err := h.files.Move(c.Context(), req.ID, target, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	default:
		return writeFail(c, fiber.StatusBadRequest, "Jenis item tidak dikenal.")
	}
	return writeOK(c, nil)
}

// CopyItem menyalin folder (rekursif) atau file ke folder lain.
func (h *FolderHandler) CopyItem(c fiber.Ctx) error {
	var req struct {
		ID             string `json:"id"`
		Type           string `json:"type"`
		TargetFolderID string `json:"targetFolderId"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)

	var target *string
	if req.TargetFolderID != "" && req.TargetFolderID != "root" {
		target = &req.TargetFolderID
	}

	switch req.Type {
	case "folder":
		if err := h.folders.Copy(c.Context(), req.ID, target, user.ID, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	case "file":
		if err := h.files.Copy(c.Context(), req.ID, target, user.ID, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	default:
		return writeFail(c, fiber.StatusBadRequest, "Jenis item tidak dikenal.")
	}
	return writeOK(c, nil)
}

// DeleteItem menandai folder atau file sebagai terhapus (soft delete).
func (h *FolderHandler) DeleteItem(c fiber.Ctx) error {
	var req struct {
		ID   string `json:"id"`
		Type string `json:"type"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)

	switch req.Type {
	case "folder":
		if err := h.folders.Delete(c.Context(), req.ID, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	case "file":
		if err := h.files.SoftDelete(c.Context(), req.ID, user.Email, clientIP(c)); err != nil {
			return writeError(c, err)
		}
	default:
		return writeFail(c, fiber.StatusBadRequest, "Jenis item tidak dikenal.")
	}
	return writeOK(c, nil)
}

// DeleteItemsBatch menandai banyak item terhapus sekaligus.
func (h *FolderHandler) DeleteItemsBatch(c fiber.Ctx) error {
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
	if err := h.folders.DeleteBatch(c.Context(), items, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, nil)
}

// ToggleStar mengubah status berbintang sebuah file atau folder.
func (h *FolderHandler) ToggleStar(c fiber.Ctx) error {
	var req struct {
		ID        string `json:"id"`
		Type      string `json:"type"`
		IsStarred bool   `json:"isStarred"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	if err := h.folders.ToggleStar(c.Context(), req.ID, req.Type, req.IsStarred); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{"isStarred": req.IsStarred})
}

// UpdateColor mengubah warna folder.
func (h *FolderHandler) UpdateColor(c fiber.Ctx) error {
	folderID := c.Params("id")
	var req struct {
		Color *string `json:"color"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	if err := h.folders.UpdateColor(c.Context(), folderID, req.Color); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{"color": req.Color})
}

// Starred mengambil seluruh file dan folder yang dibintangi.
func (h *FolderHandler) Starred(c fiber.Ctx) error {
	user := currentUser(c)
	contents, err := h.folders.ListStarred(c.Context(), user)
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat item berbintang.")
	}
	return writeOK(c, contents)
}