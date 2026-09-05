package handler

import (
	"github.com/gofiber/fiber/v3"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// UserHandler menangani endpoint pengelolaan pengguna sistem.
type UserHandler struct {
	userService *service.UserService
	authService *service.AuthService
}

// NewUserHandler membuat instance UserHandler baru.
func NewUserHandler(userService *service.UserService, authService *service.AuthService) *UserHandler {
	return &UserHandler{
		userService: userService,
		authService: authService,
	}
}

// checkSuperAdmin memastikan pengguna saat ini memiliki hak akses Super Admin.
func (h *UserHandler) checkSuperAdmin(c fiber.Ctx) (*domain.User, error) {
	cur := currentUser(c)
	if cur.Email == "" {
		return nil, fiber.NewError(fiber.StatusUnauthorized, "Sesi tidak valid.")
	}
	actor, err := h.authService.UserMeta(c.Context(), cur.Email)
	if err != nil || actor == nil {
		return nil, fiber.NewError(fiber.StatusUnauthorized, "Pengguna tidak ditemukan.")
	}
	if !actor.IsSuperAdmin() {
		return nil, fiber.NewError(fiber.StatusForbidden, "Hanya Super Admin yang diizinkan mengelola data pengguna.")
	}
	return actor, nil
}

// List menampilkan seluruh pengguna (hanya Super Admin).
func (h *UserHandler) List(c fiber.Ctx) error {
	if _, err := h.checkSuperAdmin(c); err != nil {
		return writeFail(c, fiber.StatusForbidden, err.Error())
	}

	users, err := h.userService.List(c.Context())
	if err != nil {
		return writeFail(c, fiber.StatusInternalServerError, "Gagal memuat daftar pengguna: "+err.Error())
	}

	return writeOK(c, fiber.Map{
		"users": users,
	})
}

// Create menambahkan pengguna baru ke sistem (hanya Super Admin).
func (h *UserHandler) Create(c fiber.Ctx) error {
	actor, err := h.checkSuperAdmin(c)
	if err != nil {
		return writeFail(c, fiber.StatusForbidden, err.Error())
	}

	var req service.CreateUserRequest
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Format data tidak valid.")
	}

	user, err := h.userService.Create(c.Context(), req, actor.Email, clientIP(c))
	if err != nil {
		return writeFail(c, fiber.StatusBadRequest, err.Error())
	}

	return writeOK(c, fiber.Map{
		"user": user,
	})
}

// Update memperbarui data pengguna (hanya Super Admin).
func (h *UserHandler) Update(c fiber.Ctx) error {
	actor, err := h.checkSuperAdmin(c)
	if err != nil {
		return writeFail(c, fiber.StatusForbidden, err.Error())
	}

	id := c.Params("id")
	if id == "" {
		return writeFail(c, fiber.StatusBadRequest, "ID pengguna wajib disertakan.")
	}

	var req service.UpdateUserRequest
	if err := c.Bind().Body(&req); err != nil {
		return writeFail(c, fiber.StatusBadRequest, "Format data tidak valid.")
	}

	user, err := h.userService.Update(c.Context(), id, req, actor.ID, actor.Email, clientIP(c))
	if err != nil {
		return writeFail(c, fiber.StatusBadRequest, err.Error())
	}

	return writeOK(c, fiber.Map{
		"user": user,
	})
}

// Delete menghapus akun pengguna (hanya Super Admin).
func (h *UserHandler) Delete(c fiber.Ctx) error {
	actor, err := h.checkSuperAdmin(c)
	if err != nil {
		return writeFail(c, fiber.StatusForbidden, err.Error())
	}

	id := c.Params("id")
	if id == "" {
		return writeFail(c, fiber.StatusBadRequest, "ID pengguna wajib disertakan.")
	}

	if err := h.userService.Delete(c.Context(), id, actor.ID, actor.Email, clientIP(c)); err != nil {
		return writeFail(c, fiber.StatusBadRequest, err.Error())
	}

	return writeOK(c, fiber.Map{
		"message": "Pengguna berhasil dihapus.",
	})
}
