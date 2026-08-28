package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// FileRepo mengakses tabel kemenag_arsip.files dan file_versions.
type FileRepo struct {
	pool *pgxpool.Pool
}

const fileColumns = `id, name, folder_id, bidang_id, r2_object_key, mime_type, size_bytes, COALESCE(is_restricted, false), COALESCE(is_starred, false), uploaded_by, COALESCE(created_at, now()), COALESCE(updated_at, created_at, now()), deleted_at`

func scanFile(row pgx.Row) (*domain.File, error) {
	var f domain.File
	err := row.Scan(&f.ID, &f.Name, &f.FolderID, &f.BidangID, &f.R2ObjectKey,
		&f.MimeType, &f.SizeBytes, &f.IsRestricted, &f.IsStarred, &f.UploadedBy,
		&f.CreatedAt, &f.UpdatedAt, &f.DeletedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// ListByFolder mengambil file aktif milik satu folder (nil = root).
func (r *FileRepo) ListByFolder(ctx context.Context, folderID *string) ([]domain.File, error) {
	var query string
	var args []any
	if folderID == nil || *folderID == "" || *folderID == "root" {
		query = `SELECT ` + fileColumns + ` FROM kemenag_arsip.files WHERE deleted_at IS NULL AND folder_id IS NULL ORDER BY created_at DESC`
	} else {
		if len(*folderID) != 36 {
			return []domain.File{}, nil
		}
		query = `SELECT ` + fileColumns + ` FROM kemenag_arsip.files WHERE deleted_at IS NULL AND folder_id = $1::uuid ORDER BY created_at DESC`
		args = append(args, *folderID)
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

// GetByID mengambil satu file aktif.
func (r *FileRepo) GetByID(ctx context.Context, id string) (*domain.File, error) {
	f, err := scanFile(r.pool.QueryRow(ctx, `
		SELECT `+fileColumns+` FROM kemenag_arsip.files WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return f, err
}

// FindByNameInFolder mencari file aktif dengan nama sama di folder yang sama.
func (r *FileRepo) FindByNameInFolder(ctx context.Context, name string, folderID *string) (*domain.File, error) {
	var query string
	var args []any
	if folderID == nil || *folderID == "" || *folderID == "root" {
		query = `SELECT ` + fileColumns + ` FROM kemenag_arsip.files WHERE deleted_at IS NULL AND LOWER(name) = LOWER($1) AND folder_id IS NULL`
		args = []any{name}
	} else {
		query = `SELECT ` + fileColumns + ` FROM kemenag_arsip.files WHERE deleted_at IS NULL AND LOWER(name) = LOWER($1) AND folder_id = $2::uuid`
		args = []any{name, *folderID}
	}

	f, err := scanFile(r.pool.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return f, err
}

// Create menyimpan metadata file baru dan mengembalikan hasilnya.
func (r *FileRepo) Create(ctx context.Context, f *domain.File) (*domain.File, error) {
	created, err := scanFile(r.pool.QueryRow(ctx, `
		INSERT INTO kemenag_arsip.files (name, folder_id, bidang_id, r2_object_key, mime_type, size_bytes, is_restricted, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+fileColumns,
		f.Name, f.FolderID, f.BidangID, f.R2ObjectKey, f.MimeType, f.SizeBytes,
		f.IsRestricted, f.UploadedBy))
	if err != nil {
		return nil, err
	}
	return created, nil
}

// UpdateObjectKey memperbarui object key versi terbaru sebuah file
// (dipakai saat upload versi baru).
func (r *FileRepo) UpdateObjectKey(ctx context.Context, id, objectKey, mimeType string, sizeBytes int64, uploadedBy *string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files SET r2_object_key = $1, mime_type = $2, size_bytes = $3,
		                uploaded_by = $4, updated_at = now()
		WHERE id = $5`, objectKey, mimeType, sizeBytes, uploadedBy, id)
	return err
}

// Rename mengganti nama file.
func (r *FileRepo) Rename(ctx context.Context, id, name string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files SET name = $1, updated_at = now() WHERE id = $2`, name, id)
	return err
}

// UpdateFolder memindahkan file ke folder lain.
func (r *FileRepo) UpdateFolder(ctx context.Context, id string, folderID *string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files SET folder_id = $1, updated_at = now() WHERE id = $2`, folderID, id)
	return err
}

// GetBidangID mengambil bidang_id sebuah file.
func (r *FileRepo) GetBidangID(ctx context.Context, id string) (*string, error) {
	id = strings.TrimSpace(id)
	if id == "" || id == "root" || id == "undefined" || id == "null" || len(id) != 36 {
		return nil, nil
	}
	var bidangID *string
	err := r.pool.QueryRow(ctx, `SELECT bidang_id FROM kemenag_arsip.files WHERE id = $1`, id).Scan(&bidangID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return bidangID, err
}

// SoftDelete menandai file sebagai terhapus.
func (r *FileRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files SET deleted_at = now(), updated_at = now() WHERE id = $1`, id)
	return err
}

// SoftDeleteBatch menandai banyak file terhapus sekaligus.
func (r *FileRepo) SoftDeleteBatch(ctx context.Context, ids []string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files SET deleted_at = now(), updated_at = now() WHERE id = ANY($1)`, ids)
	return err
}

// Restore membatalkan penandaan terhapus.
func (r *FileRepo) Restore(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files SET deleted_at = NULL, updated_at = now() WHERE id = $1`, id)
	return err
}

// RestoreBatch memulihkan banyak file sekaligus.
func (r *FileRepo) RestoreBatch(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.files SET deleted_at = NULL, updated_at = now() WHERE id = ANY($1)`, ids)
	return err
}

// HardDelete menghapus baris file permanen (cascade ke versi file).
func (r *FileRepo) HardDelete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM kemenag_arsip.files WHERE id = $1`, id)
	return err
}

// HardDeleteBatch menghapus banyak file permanen sekaligus.
func (r *FileRepo) HardDeleteBatch(ctx context.Context, ids []string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM kemenag_arsip.files WHERE id = ANY($1)`, ids)
	return err
}

// ListDeleted mengambil file yang berada di recycle bin.
func (r *FileRepo) ListDeleted(ctx context.Context) ([]domain.File, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+fileColumns+` FROM kemenag_arsip.files
		WHERE deleted_at IS NOT NULL
		ORDER BY deleted_at DESC`)
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