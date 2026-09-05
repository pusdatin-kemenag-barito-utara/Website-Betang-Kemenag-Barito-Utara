package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// TrashRepo menggabungkan akses recycle bin untuk folder dan file.
type TrashRepo struct {
	pool *pgxpool.Pool
}

// List mengambil seluruh item yang berada di recycle bin (folder + file),
// diurutkan dari yang paling baru dihapus. ExpiresAt adalah perkiraan
// kapan baris akan dihapus permanen (30 hari).
func (r *TrashRepo) List(ctx context.Context) ([]domain.TrashItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT 'folder' AS type, id, name, deleted_at,
		       (deleted_at + INTERVAL '30 days')::text AS expires_at,
		       '' AS r2_object_key, 'folder' AS mime_type, 0::bigint AS size_bytes
		FROM kemenag_arsip.folders WHERE deleted_at IS NOT NULL
		UNION ALL
		SELECT 'file' AS type, id, name, deleted_at,
		       (deleted_at + INTERVAL '30 days')::text AS expires_at,
		       COALESCE(r2_object_key, ''), COALESCE(mime_type, 'application/octet-stream'), COALESCE(size_bytes, 0)
		FROM kemenag_arsip.files WHERE deleted_at IS NOT NULL
		ORDER BY deleted_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.TrashItem{}
	for rows.Next() {
		var item domain.TrashItem
		if err := rows.Scan(
			&item.Type,
			&item.ID,
			&item.Name,
			&item.DeletedAt,
			&item.ExpiresAt,
			&item.R2ObjectKey,
			&item.MimeType,
			&item.SizeBytes,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}