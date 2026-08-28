package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// ListVersions mengambil riwayat versi sebuah file beserta nama pengunggah.
func (r *FileRepo) ListVersions(ctx context.Context, fileID string) ([]domain.FileVersion, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT v.id, v.file_id, v.r2_object_key, v.size_bytes, v.uploaded_by, v.created_at,
		       COALESCE(u.name, v.uploaded_by) AS full_name
		FROM kemenag_arsip.file_versions v
		LEFT JOIN kemenag_pusdatin.profiles u ON u.id::text = v.uploaded_by
		WHERE v.file_id = $1
		ORDER BY v.created_at DESC`, fileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.FileVersion{}
	for rows.Next() {
		var v domain.FileVersion
		var fullName *string
		if err := rows.Scan(&v.ID, &v.FileID, &v.R2ObjectKey, &v.SizeBytes,
			&v.UploadedBy, &v.CreatedAt, &fullName); err != nil {
			return nil, err
		}
		if fullName != nil {
			v.UploadedByUser = &domain.UserBrief{FullName: *fullName}
		}
		items = append(items, v)
	}
	return items, rows.Err()
}

// InsertVersion mencatat versi baru dari sebuah file.
func (r *FileRepo) InsertVersion(ctx context.Context, fileID, objectKey string, sizeBytes int64, uploadedBy *string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO kemenag_arsip.file_versions (file_id, r2_object_key, size_bytes, uploaded_by)
		VALUES ($1, $2, $3, $4)`, fileID, objectKey, sizeBytes, uploadedBy)
	return err
}

// GetVersionByID mengambil satu versi file.
func (r *FileRepo) GetVersionByID(ctx context.Context, versionID string) (*domain.FileVersion, error) {
	var v domain.FileVersion
	err := r.pool.QueryRow(ctx, `
		SELECT id, file_id, r2_object_key, size_bytes, uploaded_by, created_at
		FROM kemenag_arsip.file_versions WHERE id = $1`, versionID).
		Scan(&v.ID, &v.FileID, &v.R2ObjectKey, &v.SizeBytes, &v.UploadedBy, &v.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// GetObjectKeysByIDs mengambil pasangan id -> object key untuk sekumpulan file.
func (r *FileRepo) GetObjectKeysByIDs(ctx context.Context, ids []string) (map[string]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, r2_object_key FROM kemenag_arsip.files WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := map[string]string{}
	for rows.Next() {
		var id, key string
		if err := rows.Scan(&id, &key); err != nil {
			return nil, err
		}
		result[id] = key
	}
	return result, rows.Err()
}
