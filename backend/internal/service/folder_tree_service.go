package service

import (
	"context"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// Breadcrumbs mengambil jalur folder (daun -> akar) via RPC.
func (s *FolderService) Breadcrumbs(ctx context.Context, folderID string) ([]domain.Breadcrumb, error) {
	if folderID == "" {
		return nil, nil
	}
	return s.folders.GetFolderPath(ctx, folderID)
}

// Tree mengambil seluruh folder aktif (untuk pohon pindah/salin).
func (s *FolderService) Tree(ctx context.Context) ([]domain.Folder, error) {
	return s.folders.ListAll(ctx)
}
