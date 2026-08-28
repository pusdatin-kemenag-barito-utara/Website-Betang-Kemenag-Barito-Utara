package handler

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// FileHandler menangani endpoint khusus file.
type FileHandler struct {
	svc *service.FileService
}

// NewFileHandler membuat handler file.
func NewFileHandler(svc *service.FileService) *FileHandler {
	return &FileHandler{svc: svc}
}

// PresignUpload membuat URL PUT presigned untuk upload langsung ke R2.
func (h *FileHandler) PresignUpload(c fiber.Ctx) error {
	var req struct {
		FilePath    string `json:"filePath"`
		ContentType string `json:"contentType"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	url, err := h.svc.PresignUpload(c.Context(), req.FilePath, req.ContentType)
	if err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{
		"presignedUrl": url,
		"r2ObjectKey":  req.FilePath,
	})
}

// SaveMetadata menyimpan metadata file setelah upload selesai.
func (h *FileHandler) SaveMetadata(c fiber.Ctx) error {
	var req struct {
		Name        string `json:"name"`
		FolderID    string `json:"folderId"`
		R2ObjectKey string `json:"r2ObjectKey"`
		MimeType    string `json:"mimeType"`
		SizeBytes   int64  `json:"sizeBytes"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	user := currentUser(c)
	folderID := cleanUUID(req.FolderID)
	created, err := h.svc.SaveMetadata(c.Context(), req.Name, folderID, req.R2ObjectKey,
		req.MimeType, req.SizeBytes, user.ID, user.Email, clientIP(c))
	if err != nil {
		return writeError(c, err)
	}
	return writeOK(c, created)
}

// Upload mengunggah file via multipart form langsung ke Cloudflare R2.
func (h *FileHandler) Upload(c fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return writeFail(c, fiber.StatusBadRequest, "File wajib disertakan.")
	}

	rawFolderID := c.FormValue("folderId")
	name := c.FormValue("name")
	if name == "" {
		name = fileHeader.Filename
	}

	pFolderID := cleanUUID(rawFolderID)

	file, err := fileHeader.Open()
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal membaca file.")
	}
	defer file.Close()

	user := currentUser(c)
	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	created, err := h.svc.DirectUpload(c.Context(), name, pFolderID, file, fileHeader.Size, mimeType, user.ID, user.Email, clientIP(c))
	if err != nil {
		return writeError(c, err)
	}
	return writeOK(c, created)
}

// PresignDownload membuat URL GET presigned; query `download=1` memaksa
// unduhan (attachment), tanpa itu berarti pratinjau inline.
func (h *FileHandler) PresignDownload(c fiber.Ctx) error {
	var req struct {
		R2ObjectKey  string `json:"r2ObjectKey"`
		R2Key        string `json:"r2_object_key"`
		DownloadName string `json:"downloadName"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}

	key := req.R2ObjectKey
	if key == "" {
		key = req.R2Key
	}
	if key == "" {
		return writeFail(c, fiber.StatusBadRequest, "r2ObjectKey wajib diisi.")
	}

	var name *string
	if req.DownloadName != "" {
		name = &req.DownloadName
	}
	url, err := h.svc.PresignDownload(c.Context(), key, name)
	if err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{"presignedUrl": url})
}

// StreamFile melakukan streaming langsung isi objek dari R2 ke client (bebas CORS & cepat).
func (h *FileHandler) StreamFile(c fiber.Ctx) error {
	key := c.Query("key")
	if key == "" {
		key = c.Query("r2ObjectKey")
	}
	if key == "" {
		return writeFail(c, fiber.StatusBadRequest, "Parameter key wajib diisi.")
	}

	obj, err := h.svc.GetObjectStream(c.Context(), key)
	if err != nil {
		return writeError(c, err)
	}

	if obj.ContentType != nil && *obj.ContentType != "" {
		c.Set(fiber.HeaderContentType, *obj.ContentType)
	} else {
		c.Set(fiber.HeaderContentType, "application/octet-stream")
	}
	c.Set(fiber.HeaderCacheControl, "public, max-age=3600")

	return c.SendStream(obj.Body)
}

// Versions mengambil riwayat versi sebuah file.
func (h *FileHandler) Versions(c fiber.Ctx) error {
	fileID := c.Params("fileId")
	cleanID := cleanUUID(fileID)
	if cleanID == nil {
		return writeOK(c, []domain.FileVersion{})
	}
	versions, err := h.svc.Versions(c.Context(), *cleanID)
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat versi file.")
	}
	return writeOK(c, versions)
}

// RestoreVersion mengembalikan file ke versi tertentu.
func (h *FileHandler) RestoreVersion(c fiber.Ctx) error {
	var req struct {
		FileID    string `json:"fileId"`
		VersionID string `json:"versionId"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	cleanFileID := cleanUUID(req.FileID)
	cleanVersionID := cleanUUID(req.VersionID)
	if cleanFileID == nil || cleanVersionID == nil {
		return writeFail(c, fiber.StatusBadRequest, "ID berkas atau versi tidak valid.")
	}
	user := currentUser(c)
	if err := h.svc.RestoreVersion(c.Context(), *cleanFileID, *cleanVersionID, user.ID, user.Email, clientIP(c)); err != nil {
		return writeError(c, err)
	}
	return writeOK(c, nil)
}

// ZipDownload mengunduh sekumpulan item sebagai satu arsip ZIP yang
// di-stream dari server (menggantikan pendekatan JSZip di browser).
func (h *FileHandler) ZipDownload(c fiber.Ctx) error {
	var req struct {
		Items []domain.DownloadFileRequest `json:"items"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Data permintaan tidak valid.")
	}
	if len(req.Items) == 0 {
		return writeFail(c, fiber.StatusBadRequest, "Tidak ada item yang dipilih.")
	}

	name := "arsip.zip"
	if len(req.Items) == 1 {
		base := req.Items[0].ID
		name = base + ".zip"
	}

	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, sanitizeFilename(name)))

	if err := h.svc.ZipDownload(c.Context(), req.Items, c); err != nil {
		return writeError(c, err)
	}
	return nil
}

// sanitizeFilename memastikan nama file unduhan tidak mengandung karakter berbahaya.
func sanitizeFilename(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "arsip.zip"
	}
	return strings.ReplaceAll(name, `"`, "_")
}

// Stats mengembalikan ringkasan statistik untuk halaman dashboard.
func (h *FileHandler) Stats(c fiber.Ctx) error {
	stats, err := h.svc.Stats(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat statistik dashboard.")
	}
	return writeOK(c, stats)
}

// ShareLink membuat URL unduh/pratinjau presigned sementara dengan masa berlaku (1h, 24h, 7d).
func (h *FileHandler) ShareLink(c fiber.Ctx) error {
	fileID := c.Params("id")
	var req struct {
		ExpiryHours int `json:"expiryHours"`
	}
	if err := c.Bind().Body(&req); err != nil || req.ExpiryHours <= 0 {
		req.ExpiryHours = 24 // default 24 jam
	}
	if req.ExpiryHours > 168 {
		req.ExpiryHours = 168 // maksimal 7 hari
	}

	url, err := h.svc.GenerateShareLink(c.Context(), fileID, time.Duration(req.ExpiryHours)*time.Hour)
	if err != nil {
		return writeError(c, err)
	}
	return writeOK(c, fiber.Map{
		"shareUrl":    url,
		"expiryHours": req.ExpiryHours,
	})
}