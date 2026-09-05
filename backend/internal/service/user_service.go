package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/auth"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

// UserService mengelola operasi bisnis akun pengguna internal SI BETANG.
type UserService struct {
	repo     *repository.UserRepo
	supabase *auth.SupabaseClient
	audits   *Services
}

// NewUserService membuat instance UserService baru.
func NewUserService(repo *repository.UserRepo, supabase *auth.SupabaseClient, audits *Services) *UserService {
	return &UserService{
		repo:     repo,
		supabase: supabase,
		audits:   audits,
	}
}

// List mengambil seluruh daftar pengguna.
func (s *UserService) List(ctx context.Context) ([]domain.User, error) {
	return s.repo.ListUsers(ctx)
}

// GetByID mengambil satu pengguna berdasarkan ID.
func (s *UserService) GetByID(ctx context.Context, id string) (*domain.User, error) {
	return s.repo.GetUserByID(ctx, id)
}

// CreateRequest adalah payload permintaan pembuatan pengguna baru.
type CreateUserRequest struct {
	Email    string  `json:"email"`
	Username string  `json:"username"`
	FullName string  `json:"full_name"`
	Password string  `json:"password"`
	Role     string  `json:"role"`
	BidangID *string `json:"bidang_id"`
	IsActive *bool   `json:"is_active"`
}

// Create membuat akun di Supabase Auth dan menyimpan metadata di kemenag_arsip.users.
func (s *UserService) Create(ctx context.Context, req CreateUserRequest, actorEmail, ip string) (*domain.User, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	username := strings.ToLower(strings.TrimSpace(req.Username))
	fullName := strings.TrimSpace(req.FullName)
	password := strings.TrimSpace(req.Password)
	role := strings.TrimSpace(req.Role)

	if email == "" || !strings.Contains(email, "@") {
		return nil, errors.New("format email tidak valid")
	}
	if username == "" {
		username = strings.Split(email, "@")[0]
	}
	if fullName == "" {
		return nil, errors.New("nama lengkap wajib diisi")
	}
	if len(password) < 6 {
		return nil, errors.New("kata sandi minimal 6 karakter")
	}

	if role != "Super Admin" && role != "Admin Bidang" {
		role = "Admin Bidang"
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	// 1. Cek apakah user sudah terdaftar di kemenag_arsip.users
	existing, _ := s.repo.GetUserByEmail(ctx, email)
	if existing != nil {
		return nil, errors.New("email ini sudah digunakan oleh pengguna lain")
	}

	// 2. Buat akun di Supabase Auth
	authUserID, err := s.supabase.AdminCreateUser(ctx, email, password, fullName, username)
	if err != nil {
		return nil, err
	}

	// 3. Simpan ke database lokal kemenag_arsip.users
	user := &domain.User{
		ID:       authUserID,
		Email:    email,
		Username: username,
		FullName: fullName,
		Role:     role,
		BidangID: req.BidangID,
		IsActive: isActive,
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		// Rollback Supabase auth user jika gagal menyimpan di database
		_ = s.supabase.AdminDeleteUser(ctx, authUserID)
		return nil, fmt.Errorf("gagal menyimpan profil pengguna: %w", err)
	}

	if s.audits != nil {
		_ = s.audits.LogAudit(ctx, actorEmail, "CREATE", fmt.Sprintf("Pengguna %s (%s)", fullName, email), nil, user, ip)
	}

	return s.repo.GetUserByID(ctx, authUserID)
}

// UpdateRequest adalah payload pembaruan pengguna.
type UpdateUserRequest struct {
	FullName string  `json:"full_name"`
	Role     string  `json:"role"`
	BidangID *string `json:"bidang_id"`
	IsActive *bool   `json:"is_active"`
	Password string  `json:"password"`
}

// Update memperbarui data pengguna lokal dan opsional mengubah kata sandi di Auth.
func (s *UserService) Update(ctx context.Context, id string, req UpdateUserRequest, actorID, actorEmail, ip string) (*domain.User, error) {
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("pengguna tidak ditemukan")
	}

	// Proteksi Keamanan: Cegah Super Admin menonaktifkan atau mendegradasi akun sendiri yang sedang aktif
	if id == actorID {
		if req.IsActive != nil && !*req.IsActive {
			return nil, errors.New("tidak dapat menonaktifkan akun sendiri yang sedang digunakan")
		}
		if req.Role != "" && req.Role != "Super Admin" {
			return nil, errors.New("tidak dapat menurunkan peran Super Admin akun sendiri")
		}
	}

	fullName := strings.TrimSpace(req.FullName)
	if fullName != "" {
		user.FullName = fullName
	}

	role := strings.TrimSpace(req.Role)
	if role == "Super Admin" || role == "Admin Bidang" {
		user.Role = role
		// Jika Super Admin, bidang dikosongkan karena memiliki akses menyeluruh
		if role == "Super Admin" {
			user.BidangID = nil
		}
	}

	if user.Role != "Super Admin" && req.BidangID != nil {
		if *req.BidangID == "" {
			user.BidangID = nil
		} else {
			user.BidangID = req.BidangID
		}
	}

	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	// Validasi dan update password jika diisi
	password := strings.TrimSpace(req.Password)
	if password != "" && len(password) < 6 {
		return nil, errors.New("kata sandi baru minimal 6 karakter")
	}

	// Sinkronisasi metadata profil ke Supabase Auth
	metadata := map[string]any{
		"full_name": user.FullName,
		"name":      user.FullName,
		"role":      user.Role,
	}

	if err := s.supabase.AdminUpdateUser(ctx, id, "", password, metadata); err != nil {
		if password != "" {
			return nil, fmt.Errorf("gagal memperbarui kata sandi pengguna di Supabase: %w", err)
		}
	}

	if err := s.repo.UpdateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("gagal memperbarui database pengguna: %w", err)
	}

	if s.audits != nil {
		_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", fmt.Sprintf("Pengguna %s", user.Email), nil, user, ip)
	}

	return s.repo.GetUserByID(ctx, id)
}

// Delete menghapus pengguna dari database lokal dan Supabase Auth.
func (s *UserService) Delete(ctx context.Context, id, currentUserID, actorEmail, ip string) error {
	if id == currentUserID {
		return errors.New("Anda tidak dapat menghapus akun Anda sendiri")
	}

	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("pengguna tidak ditemukan")
	}

	// Hapus dari tabel lokal kemenag_arsip.users
	if err := s.repo.DeleteUser(ctx, id); err != nil {
		return fmt.Errorf("gagal menghapus dari basis data lokal: %w", err)
	}

	// Hapus dari Supabase Auth
	_ = s.supabase.AdminDeleteUser(ctx, id)

	if s.audits != nil {
		_ = s.audits.LogAudit(ctx, actorEmail, "DELETE", fmt.Sprintf("Pengguna %s (%s)", user.FullName, user.Email), user, nil, ip)
	}

	return nil
}
