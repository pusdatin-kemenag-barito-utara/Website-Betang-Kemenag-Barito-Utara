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
func (s *SettingsService) Update(ctx context.Context, settings domain.AppSettings, actorEmail, ip string) error {
	if err := s.repo.Update(ctx, settings); err != nil {
		return err
	}
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Pengaturan aplikasi",
		nil, map[string]any{
			"disable_right_click":        settings.DisableRightClick,
			"disable_print_shortcut":     settings.DisablePrintShortcut,
			"enable_watermark":          settings.EnableWatermark,
			"max_upload_size_mb":         settings.MaxUploadSizeMB,
			"default_share_expiry_hours": settings.DefaultShareExpiryHours,
			"default_pdf_viewer_mode":    settings.DefaultPdfViewerMode,
		}, ip)
	return nil
}