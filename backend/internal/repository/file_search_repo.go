package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// Search mencari file berdasarkan substring nama, dengan filter opsional bidangID.
func (r *FileRepo) Search(ctx context.Context, query string, bidangID *string) ([]domain.File, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []domain.File{}, nil
	}

	filter := fmt.Sprintf(`deleted_at = "" && name ~ "%s"`, strings.ReplaceAll(query, `"`, `\"`))
	if bidangID != nil && *bidangID != "" {
		filter += fmt.Sprintf(` && bidang_id = "%s"`, *bidangID)
	}

	var records []pbFile
	_, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  filter,
		Sort:    "-created_at",
		PerPage: 200,
	}, &records)
	if err != nil {
		return nil, err
	}

	items := make([]domain.File, len(records))
	for i, rec := range records {
		items[i] = rec.toDomain()
	}
	return items, nil
}

// Stats menghitung ringkasan statistik dashboard: total file aktif, total
// ukuran, unggahan 24 jam terakhir, unggahan bulan ini, dan 5 unggahan terbaru.
func (r *FileRepo) Stats(ctx context.Context, bidangID *string) (totalFiles, totalStorage, recent24h, thisMonth int64, recent []domain.RecentUpload, err error) {
	filter := `deleted_at = ""`
	if bidangID != nil && *bidangID != "" {
		filter += fmt.Sprintf(` && bidang_id = "%s"`, *bidangID)
	}

	var records []pbFile
	_, err = r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  filter,
		Sort:    "-created_at",
		PerPage: 5000,
	}, &records)
	if err != nil {
		return 0, 0, 0, 0, nil, err
	}

	now := time.Now()
	oneDayAgo := now.Add(-24 * time.Hour)
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	recent = make([]domain.RecentUpload, 0, 5)

	for i, rec := range records {
		totalFiles++
		totalStorage += rec.SizeBytes

		t, _ := time.Parse(time.RFC3339Nano, rec.CreatedAt)
		if t.IsZero() {
			t, _ = time.Parse(time.RFC3339Nano, rec.Created)
		}

		if t.After(oneDayAgo) {
			recent24h++
		}
		if t.After(startOfMonth) {
			thisMonth++
		}

		if i < 5 {
			recent = append(recent, domain.RecentUpload{
				ID:        rec.ID,
				Name:      rec.Name,
				MimeType:  rec.MimeType,
				SizeBytes: rec.SizeBytes,
				CreatedAt: t,
			})
		}
	}

	return totalFiles, totalStorage, recent24h, thisMonth, recent, nil
}

// ToggleStar mengubah status bintang sebuah file.
func (r *FileRepo) ToggleStar(ctx context.Context, fileID string, isStarred bool) error {
	return r.pb.Update(ctx, "files", fileID, map[string]interface{}{
		"is_starred": isStarred,
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// ListStarred mengambil seluruh file aktif yang dibintangi, dengan filter opsional bidangID.
func (r *FileRepo) ListStarred(ctx context.Context, bidangID *string) ([]domain.File, error) {
	filter := `deleted_at = "" && is_starred = true`
	if bidangID != nil && *bidangID != "" {
		filter += fmt.Sprintf(` && bidang_id = "%s"`, *bidangID)
	}

	var records []pbFile
	_, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  filter,
		Sort:    "-updated_at,-created_at",
		PerPage: 500,
	}, &records)
	if err != nil {
		return nil, err
	}

	items := make([]domain.File, len(records))
	for i, rec := range records {
		items[i] = rec.toDomain()
	}
	return items, nil
}
