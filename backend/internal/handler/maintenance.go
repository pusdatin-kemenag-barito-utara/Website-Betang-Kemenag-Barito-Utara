package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// MaintenanceHandler menangani pengecekan status maintenance.
type MaintenanceHandler struct {
	svc *service.MaintenanceService
}

// NewMaintenanceHandler membuat handler maintenance.
func NewMaintenanceHandler(svc *service.MaintenanceService) *MaintenanceHandler {
	return &MaintenanceHandler{svc: svc}
}

// Status mengambil status aplikasi dari pusdatin.
func (h *MaintenanceHandler) Status(c fiber.Ctx) error {
	status, err := h.svc.Status(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusBadGateway, err.Error())
	}
	return writeOK(c, status)
}