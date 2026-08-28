package service

import (
	"context"
	"errors"
	"strings"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

// BidangService menangani operasi CRUD bidang (seksi/departemen).
type BidangService struct {
	repo   *repository.BidangRepo
	audits *Services
}

// List mengembalikan seluruh bidang beserta jumlah dokumen aktif.
func (s *BidangService) List(ctx context.Context) ([]domain.BidangWithCount, error) {
	return s.repo.ListWithCounts(ctx)
}

// Create menambah bidang baru. Nama duplikat ditolak (tidak peka huruf).
func (s *BidangService) Create(ctx context.Context, name string, actorEmail, ip string) (*domain.Bidang, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("Nama bidang tidak boleh kosong.")
	}
	existing, err := s.repo.FindByName(ctx, name, "")
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("Bidang dengan nama ini sudah ada.")
	}
	if err := s.repo.Create(ctx, name); err != nil {
		return nil, err
	}
	created, err := s.repo.FindByName(ctx, name, "")
	if err != nil {
		return nil, err
	}
	_ = s.audits.LogAudit(ctx, actorEmail, "INSERT", "Bidang: "+name, nil, created, ip)
	return created, nil
}

// Update mengubah nama dan urutan bidang.
func (s *BidangService) Update(ctx context.Context, id, name string, sortOrder int, actorEmail, ip string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("Nama bidang tidak boleh kosong.")
	}
	existing, err := s.repo.FindByName(ctx, name, id)
	if err != nil {
		return err
	}
	if existing != nil {
		return errors.New("Bidang dengan nama ini sudah ada.")
	}
	if err := s.repo.Update(ctx, id, name, sortOrder); err != nil {
		return err
	}
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Bidang: "+name, nil, map[string]any{"id": id, "name": name}, ip)
	return nil
}

// Delete menghapus bidang. Penghapusan ditolak bila masih ada file aktif.
func (s *BidangService) Delete(ctx context.Context, id, actorEmail, ip string) error {
	count, err := s.repo.CountActiveFiles(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("Bidang masih memiliki dokumen aktif dan tidak dapat dihapus.")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	_ = s.audits.LogAudit(ctx, actorEmail, "DELETE", "Bidang ID: "+id, nil, nil, ip)
	return nil
}

// Reorder memperbarui urutan bidang.
func (s *BidangService) Reorder(ctx context.Context, items []domain.Bidang, actorEmail, ip string) error {
	if len(items) == 0 {
		return nil
	}
	for i := range items {
		items[i].SortOrder = i
	}
	if err := s.repo.Reorder(ctx, items); err != nil {
		return err
	}
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Urutan bidang", nil, map[string]any{"count": len(items)}, ip)
	return nil
}