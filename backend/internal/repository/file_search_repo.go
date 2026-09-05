package repository

import (
	"context"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// Search mencari file berdasarkan trigram fuzzy similarity, substring ILIKE, dan FTS, dengan filter opsional bidangID.
func (r *FileRepo) Search(ctx context.Context, query string, bidangID *string) ([]domain.File, error) {
	var sqlQuery string
	var args []any
	if bidangID != nil && *bidangID != "" {
		sqlQuery = `
			SELECT ` + fileColumns + ` FROM kemenag_arsip.files
			WHERE deleted_at IS NULL
			  AND bidang_id = $2::uuid
			  AND (
			    name ILIKE '%' || $1 || '%'
			    OR similarity(name, $1) > 0.2
			    OR (fts_doc IS NOT NULL AND fts_doc @@ plainto_tsquery('simple', $1))
			    OR (fts_doc IS NOT NULL AND fts_doc @@ websearch_to_tsquery('simple', $1))
			  )
			ORDER BY similarity(name, $1) DESC, created_at DESC`
		args = append(args, query, *bidangID)
	} else {
		sqlQuery = `
			SELECT ` + fileColumns + ` FROM kemenag_arsip.files
			WHERE deleted_at IS NULL
			  AND (
			    name ILIKE '%' || $1 || '%'
			    OR similarity(name, $1) > 0.2
			    OR (fts_doc IS NOT NULL AND fts_doc @@ plainto_tsquery('simple', $1))
			    OR (fts_doc IS NOT NULL AND fts_doc @@ websearch_to_tsquery('simple', $1))
			  )
			ORDER BY similarity(name, $1) DESC, created_at DESC`
		args = append(args, query)
	}

	rows, err := r.pool.Query(ctx, sqlQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.File{}
	for rows.Next() {
		f, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *f)
	}
	return items, rows.Err()
}

// Stats menghitung ringkasan statistik dashboard: total file aktif, total
// ukuran, unggahan 24 jam terakhir, unggahan bulan ini, dan 5 unggahan terbaru.
func (r *FileRepo) Stats(ctx context.Context) (totalFiles, totalStorage, recent24h, thisMonth int64, recent []domain.RecentUpload, err error) {
	err = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*)::bigint,
			COALESCE(SUM(size_bytes), 0)::bigint,
			COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours')::bigint,
			COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::bigint
		FROM kemenag_arsip.files
		WHERE deleted_at IS NULL`).
		Scan(&totalFiles, &totalStorage, &recent24h, &thisMonth)
	if err != nil {
		return 0, 0, 0, 0, nil, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, name, mime_type, size_bytes, created_at
		FROM kemenag_arsip.files
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 5`)
	if err != nil {
		return 0, 0, 0, 0, nil, err
	}
	defer rows.Close()

	recent = []domain.RecentUpload{}
	for rows.Next() {
		var u domain.RecentUpload
		if err := rows.Scan(&u.ID, &u.Name, &u.MimeType, &u.SizeBytes, &u.CreatedAt); err != nil {
			return 0, 0, 0, 0, nil, err
		}
		recent = append(recent, u)
	}
	return totalFiles, totalStorage, recent24h, thisMonth, recent, rows.Err()
}

// ToggleStar mengubah status bintang sebuah file.
func (r *FileRepo) ToggleStar(ctx context.Context, fileID string, isStarred bool) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files
		SET is_starred = $2, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL`, fileID, isStarred)
	return err
}
// ListStarred mengambil seluruh file aktif yang dibintangi, dengan filter opsional bidangID.
func (r *FileRepo) ListStarred(ctx context.Context, bidangID *string) ([]domain.File, error) {
	var query string
	var args []any
	if bidangID != nil && *bidangID != "" {
		query = `
			SELECT ` + fileColumns + ` FROM kemenag_arsip.files
			WHERE deleted_at IS NULL AND is_starred = true AND bidang_id = $1::uuid
			ORDER BY updated_at DESC, created_at DESC`
		args = append(args, *bidangID)
	} else {
		query = `
			SELECT ` + fileColumns + ` FROM kemenag_arsip.files
			WHERE deleted_at IS NULL AND is_starred = true
			ORDER BY updated_at DESC, created_at DESC`
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.File{}
	for rows.Next() {
		f, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *f)
	}
	return items, rows.Err()
}
