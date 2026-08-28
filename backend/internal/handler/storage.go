package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// StorageHandler menangani widget penggunaan penyimpanan.
type StorageHandler struct {
	svc *service.StorageService
}

// NewStorageHandler membuat handler penggunaan storage.
func NewStorageHandler(svc *service.StorageService) *StorageHandler {
	return &StorageHandler{svc: svc}
}

// Usage mengembalikan penggunaan penyimpanan terhadap kuota.
func (h *StorageHandler) Usage(c fiber.Ctx) error {
	usage, err := h.svc.Usage(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat penggunaan penyimpanan.")
	}
	return writeOK(c, usage)
}