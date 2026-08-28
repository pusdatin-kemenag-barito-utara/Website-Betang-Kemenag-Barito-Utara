// Package handler berisi HTTP handler Fiber. Handler hanya bertugas
// menerjemahkan request/response; logika bisnis ada di lapisan service.
package handler

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/middleware"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// Handlers mengumpulkan seluruh handler agar mudah didaftarkan ke router.
type Handlers struct {
	Auth        *AuthHandler
	Health      *HealthHandler
	Bidang      *BidangHandler
	Folder      *FolderHandler
	File        *FileHandler
	Trash       *TrashHandler
	Settings    *SettingsHandler
	Storage     *StorageHandler
	Maintenance *MaintenanceHandler
}

// New membuat seluruh handler dari service dan pool database yang tersedia.
func New(services *service.Services, pool *pgxpool.Pool) *Handlers {
	return &Handlers{
		Auth:        NewAuthHandler(services.Auth, services),
		Health:      NewHealthHandler(pool),
		Bidang:      NewBidangHandler(services.Bidang),
		Folder:      NewFolderHandler(services.Folder, services.File),
		File:        NewFileHandler(services.File),
		Trash:       NewTrashHandler(services.Trash),
		Settings:    NewSettingsHandler(services.Settings, services.Auth),
		Storage:     NewStorageHandler(services.Storage),
		Maintenance: NewMaintenanceHandler(services.Maintenance),
	}
}

// writeOK mengirimkan respons sukses dengan bentuk {success, data}.
func writeOK(c fiber.Ctx, data any) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

// writeFail mengirimkan respons gagal dengan bentuk {success, error}.
func writeFail(c fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(fiber.Map{
		"success": false,
		"error":   msg,
	})
}

// writeError memetakan error domain ke status HTTP yang sesuai.
func writeError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, service.ErrNotFound):
		return writeFail(c, fiber.StatusNotFound, "Data tidak ditemukan.")
	case errors.Is(err, service.ErrInvalidCredentials):
		return writeFail(c, fiber.StatusUnauthorized, err.Error())
	case errors.Is(err, service.ErrAccountInactive), errors.Is(err, service.ErrNoPermission):
		return writeFail(c, fiber.StatusForbidden, err.Error())
	default:
		return writeFail(c, fiber.StatusBadRequest, err.Error())
	}
}

// currentUser mengambil user terautentikasi dari Locals.
func currentUser(c fiber.Ctx) *domain.AuthUser {
	user, ok := c.Locals(middleware.KeyAuthUser).(*domain.AuthUser)
	if !ok || user == nil {
		return &domain.AuthUser{}
	}
	return user
}

// clientIP mengambil IP klien dengan dukungan proxy X-Forwarded-For.
func clientIP(c fiber.Ctx) string {
	if ip := c.Get("X-Forwarded-For"); ip != "" {
		for _, part := range splitComma(ip) {
			if part != "" {
				return part
			}
		}
	}
	return c.IP()
}

func splitComma(s string) []string {
	result := []string{}
	current := ""
	for _, r := range s {
		if r == ',' {
			result = append(result, current)
			current = ""
			continue
		}
		current += string(r)
	}
	result = append(result, current)
	return result
}

// cleanUUID membersihkan dan memvalidasi string UUID agar tidak memicu error sintaks PostgreSQL.
func cleanUUID(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" || s == "root" || s == "undefined" || s == "null" || s == "starred" {
		return nil
	}
	return &s
}