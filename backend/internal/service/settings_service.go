package service

import (
	"context"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

// SettingsService menangani pengaturan aplikasi (hanya super admin).
type SettingsService struct {
	repo    *repository.SettingsRepo
	pusdatin *repository.PusdatinRepo
	audits  *Services
}

// Get mengambil pengaturan aplikasi.
func (s *SettingsService) Get(ctx context.Context) (*domain.AppSettings, error) {
	return s.repo.Get(ctx)
}

// Update menyimpan pengaturan aplikasi.
func (s *SettingsService) Update(ctx context.Context, disableRightClick bool, actorEmail, ip string) error {
	if err := s.repo.Update(ctx, disableRightClick); err != nil {
		return err
	}
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Pengaturan aplikasi",
		nil, map[string]any{"disable_right_click": disableRightClick}, ip)
	return nil
}