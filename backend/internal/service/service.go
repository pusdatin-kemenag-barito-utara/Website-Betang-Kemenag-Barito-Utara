// Package service berisi logika bisnis aplikasi, terpisah dari handler HTTP
// dan akses data. Setiap domain memiliki service sendiri.
package service

import (
	"context"
	"errors"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/auth"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/storage"
)

// Services mengumpulkan seluruh service agar mudah di-inject ke handler.
type Services struct {
	Auth        *AuthService
	Bidang      *BidangService
	Folder      *FolderService
	File        *FileService
	Trash       *TrashService
	Settings    *SettingsService
	Storage     *StorageService
	Maintenance *MaintenanceService

	repos   *repository.Repos
	r2      *storage.R2Storage
	cfg     *config.Config
	supabase *auth.SupabaseClient
}

// New membangun seluruh service beserta dependensinya.
func New(repos *repository.Repos, r2 *storage.R2Storage, supabase *auth.SupabaseClient, cfg *config.Config) *Services {
	s := &Services{
		repos:    repos,
		r2:       r2,
		cfg:      cfg,
		supabase: supabase,
	}
	s.Auth = &AuthService{supabase: supabase, pusdatin: repos.Pusdatin, cfg: cfg}
	s.Bidang = &BidangService{repo: repos.Bidang, audits: s}
	s.Folder = &FolderService{folders: repos.Folder, files: repos.File, r2: r2, audits: s}
	s.File = &FileService{files: repos.File, folders: repos.Folder, r2: r2, audits: s}
	s.Trash = &TrashService{trash: repos.Trash, folders: repos.Folder, files: repos.File, audits: s}
	s.Settings = &SettingsService{repo: repos.Settings, pusdatin: repos.Pusdatin, audits: s}
	s.Storage = &StorageService{repo: repos.Storage, quotaGB: cfg.StorageQuotaGB}
	s.Maintenance = &MaintenanceService{pusdatinURL: cfg.PusdatinURL, appID: cfg.PusdatinAppID}
	return s
}

// LogAudit mencatat aktivitas pengguna ke audit pusdatin.
func (s *Services) LogAudit(ctx context.Context, email, action, target string, before, after any, ip string) error {
	if s.repos.Pusdatin == nil {
		return nil
	}
	return s.repos.Pusdatin.LogAudit(ctx, action, target, "kemenag_arsip", email, before, after, ip)
}

// PusdatinUserByEmail mengambil meta user dari sistem pusdatin.
func (s *Services) PusdatinUserByEmail(ctx context.Context, email string) (*domain.PusdatinUser, error) {
	return s.repos.Pusdatin.GetUserByEmail(ctx, email)
}

// ErrNotFound dipakai untuk membedakan error "tidak ditemukan".
var ErrNotFound = errors.New("data tidak ditemukan")