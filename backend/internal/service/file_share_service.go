package service

import (
	"context"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// Stats menghitung ringkasan statistik dashboard.
func (s *FileService) Stats(ctx context.Context) (*domain.DashboardStats, error) {
	totalFiles, totalStorage, recent24h, thisMonth, recent, err := s.files.Stats(ctx)
	if err != nil {
		return nil, err
	}
	return &domain.DashboardStats{
		TotalFiles:     totalFiles,
		TotalStorage:   totalStorage,
		Recent24hCount: recent24h,
		ThisMonthCount: thisMonth,
		RecentUploads:  recent,
	}, nil
}

// ToggleStar mengubah status bintang sebuah file.
func (s *FileService) ToggleStar(ctx context.Context, fileID string, isStarred bool) error {
	return s.files.ToggleStar(ctx, fileID, isStarred)
}

// GenerateShareLink membuat tautan unduh/pratinjau presigned dengan durasi kustom (misal: 1h, 24h, 7d).
func (s *FileService) GenerateShareLink(ctx context.Context, fileID string, expiryDuration time.Duration) (string, error) {
	f, err := s.files.GetByID(ctx, fileID)
	if err != nil {
		return "", err
	}
	if f == nil {
		return "", ErrNotFound
	}
	return s.r2.PresignDownload(ctx, f.R2ObjectKey, &f.Name, expiryDuration)
}
