package service

import (
	"context"
	"errors"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// Breadcrumbs mengambil jalur folder (daun -> akar) via RPC.
// Jika user adalah Admin Bidang, memastikan folder tersebut miliknya.
func (s *FolderService) Breadcrumbs(ctx context.Context, folderID string, user *domain.AuthUser) ([]domain.Breadcrumb, error) {
	if folderID == "" || folderID == "root" {
		return nil, nil
	}
	if user != nil && !user.IsSuperAdmin && user.BidangID != nil && *user.BidangID != "" {
		allowed, err := s.folders.CanBidangAccess(ctx, *user.BidangID, folderID)
		if err != nil {
			return nil, err
		}
		if !allowed {
			return nil, errors.New("Anda tidak memiliki izin untuk mengakses folder ini.")
		}
	}
	return s.folders.GetFolderPath(ctx, folderID)
}

// Tree mengambil seluruh folder aktif (untuk pohon pindah/salin).
// Jika user adalah Admin Bidang, hanya mengambil folder di bidangnya.
func (s *FolderService) Tree(ctx context.Context, user *domain.AuthUser) ([]domain.Folder, error) {
	var bidangFilter *string
	if user != nil && !user.IsSuperAdmin && user.BidangID != nil && *user.BidangID != "" {
		bidangFilter = user.BidangID
	}
	return s.folders.ListAll(ctx, bidangFilter)
}
