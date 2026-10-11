package repository

import (
	"context"
	"sort"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// TrashRepo menggabungkan akses recycle bin untuk folder dan file di PocketBase.
type TrashRepo struct {
	pb *pocketbase.Client
}

// NewTrashRepo membuat instance TrashRepo baru.
func NewTrashRepo(pb *pocketbase.Client) *TrashRepo {
	return &TrashRepo{pb: pb}
}

// List mengambil seluruh item yang berada di recycle bin (folder + file).
func (r *TrashRepo) List(ctx context.Context) ([]domain.TrashItem, error) {
	var folders []pbFolder
	_, _ = r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  `deleted_at != ""`,
		PerPage: 1000,
	}, &folders)

	var files []pbFile
	_, _ = r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  `deleted_at != ""`,
		PerPage: 2000,
	}, &files)

	items := make([]domain.TrashItem, 0, len(folders)+len(files))

	for _, fold := range folders {
		t, _ := time.Parse(time.RFC3339Nano, fold.DeletedAt)
		exp := t.Add(30 * 24 * time.Hour).Format("2006-01-02 15:04:05")
		items = append(items, domain.TrashItem{
			Type:        "folder",
			ID:          fold.ID,
			Name:        fold.Name,
			DeletedAt:   fold.DeletedAt,
			ExpiresAt:   exp,
			R2ObjectKey: "",
			MimeType:    "folder",
			SizeBytes:   0,
		})
	}

	for _, f := range files {
		t, _ := time.Parse(time.RFC3339Nano, f.DeletedAt)
		exp := t.Add(30 * 24 * time.Hour).Format("2006-01-02 15:04:05")
		mime := f.MimeType
		if mime == "" {
			mime = "application/octet-stream"
		}
		items = append(items, domain.TrashItem{
			Type:        "file",
			ID:          f.ID,
			Name:        f.Name,
			DeletedAt:   f.DeletedAt,
			ExpiresAt:   exp,
			R2ObjectKey: f.R2ObjectKey,
			MimeType:    mime,
			SizeBytes:   f.SizeBytes,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].DeletedAt > items[j].DeletedAt
	})

	return items, nil
}