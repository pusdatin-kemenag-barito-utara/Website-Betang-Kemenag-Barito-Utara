package service

import (
	"context"
	"errors"
	"strconv"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

// TrashService menangani recycle bin (folder dan file yang dihapus sementara).
type TrashService struct {
	trash   *repository.TrashRepo
	folders *repository.FolderRepo
	files   *repository.FileRepo
	audits  *Services
}

// List mengambil seluruh item di recycle bin.
func (s *TrashService) List(ctx context.Context) ([]domain.TrashItem, error) {
	return s.trash.List(ctx)
}

// Restore memulihkan satu item (folder atau file) dari recycle bin.
func (s *TrashService) Restore(ctx context.Context, id, itemType, actorEmail, ip string) error {
	var err error
	switch itemType {
	case "folder":
		err = s.folders.Restore(ctx, id)
	case "file":
		err = s.files.Restore(ctx, id)
	default:
		return errors.New("jenis item tidak dikenal")
	}
	if err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Restore "+itemType+" ID: "+id, nil, map[string]any{"id": id}, ip)
	return nil
}

// RestoreBatch memulihkan banyak item (folder dan file) sekaligus dari recycle bin.
func (s *TrashService) RestoreBatch(ctx context.Context, items []domain.TrashItem, actorEmail, ip string) error {
	fileIDs := []string{}
	folderIDs := []string{}
	for _, item := range items {
		switch item.Type {
		case "file":
			fileIDs = append(fileIDs, item.ID)
		case "folder":
			folderIDs = append(folderIDs, item.ID)
		}
	}
	if len(fileIDs) > 0 {
		if err := s.files.RestoreBatch(ctx, fileIDs); err != nil {
			return err
		}
	}
	if len(folderIDs) > 0 {
		if err := s.folders.RestoreBatch(ctx, folderIDs); err != nil {
			return err
		}
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Restore "+strconv.Itoa(len(items))+" item", nil, nil, ip)
	return nil
}

// PermanentDelete menghapus item dari database secara permanen.
// Catatan: object R2 tidak dihapus di sini (paritas dengan perilaku lama);
// pembersihan storage dapat ditambahkan kemudian sebagai tugas pemeliharaan.
func (s *TrashService) PermanentDelete(ctx context.Context, items []domain.TrashItem, actorEmail, ip string) error {
	fileIDs := []string{}
	folderIDs := []string{}
	for _, item := range items {
		switch item.Type {
		case "file":
			fileIDs = append(fileIDs, item.ID)
		case "folder":
			folderIDs = append(folderIDs, item.ID)
		}
	}
	if len(fileIDs) > 0 {
		if err := s.files.HardDeleteBatch(ctx, fileIDs); err != nil {
			return err
		}
	}
	if len(folderIDs) > 0 {
		if err := s.folders.HardDeleteBatch(ctx, folderIDs); err != nil {
			return err
		}
	}
	_ = s.audits.LogAudit(ctx, actorEmail, "DELETE", "Hapus permanen "+strconv.Itoa(len(items))+" item", nil, nil, ip)
	return nil
}