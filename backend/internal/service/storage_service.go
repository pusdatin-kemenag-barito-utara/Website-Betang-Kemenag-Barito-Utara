package service

import (
	"context"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

// StorageService menghitung penggunaan penyimpanan terhadap kuota.
type StorageService struct {
	repo     *repository.StorageRepo
	quotaGB  float64
}

// Usage mengembalikan penggunaan penyimpanan dan persentase kuota.
func (s *StorageService) Usage(ctx context.Context) (*domain.StorageUsage, error) {
	used, err := s.repo.SumActiveSizes(ctx)
	if err != nil {
		return nil, err
	}
	limit := int64(s.quotaGB * 1024 * 1024 * 1024)
	percentage := 0.0
	if limit > 0 {
		percentage = float64(used) / float64(limit) * 100
	}
	return &domain.StorageUsage{
		UsedBytes:  used,
		LimitBytes: limit,
		Percentage: percentage,
	}, nil
}