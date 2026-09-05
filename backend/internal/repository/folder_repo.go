package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// FolderRepo mengakses tabel kemenag_arsip.folders.
type FolderRepo struct {
	pool *pgxpool.Pool
}

const folderColumns = `id, name, parent_id, bidang_id, COALESCE(is_restricted, false), COALESCE(is_starred, false), color, created_by, COALESCE(created_at, now()), COALESCE(updated_at, created_at, now()), deleted_at`

func scanFolder(row pgx.Row) (*domain.Folder, error) {
	var f domain.Folder
	err := row.Scan(&f.ID, &f.Name, &f.ParentID, &f.BidangID, &f.IsRestricted,
		&f.IsStarred, &f.Color, &f.CreatedBy, &f.CreatedAt, &f.UpdatedAt, &f.DeletedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// ListByParent mengambil folder aktif milik satu parent (nil = root), dengan filter opsional bidangID.
func (r *FolderRepo) ListByParent(ctx context.Context, parentID *string, bidangID *string) ([]domain.Folder, error) {
	var query string
	var args []any
	if parentID == nil || *parentID == "" || *parentID == "root" {
		if bidangID != nil && *bidangID != "" {
			query = `SELECT ` + folderColumns + ` FROM kemenag_arsip.folders WHERE deleted_at IS NULL AND parent_id IS NULL AND (id IN (SELECT folder_id FROM kemenag_arsip.bidang_folders WHERE bidang_id = $1::uuid) OR bidang_id = $1::uuid) ORDER BY name ASC`
			args = append(args, *bidangID)
		} else {
			query = `SELECT ` + folderColumns + ` FROM kemenag_arsip.folders WHERE deleted_at IS NULL AND parent_id IS NULL ORDER BY name ASC`
		}
	} else {
		if len(*parentID) != 36 {
			return []domain.Folder{}, nil
		}
		query = `SELECT ` + folderColumns + ` FROM kemenag_arsip.folders WHERE deleted_at IS NULL AND parent_id = $1::uuid ORDER BY name ASC`
		args = append(args, *parentID)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Folder{}
	for rows.Next() {
		f, err := scanFolder(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *f)
	}
	return items, rows.Err()
}

// ListAll mengambil seluruh folder aktif (untuk pohon pindah/salin), dengan filter opsional bidangID.
func (r *FolderRepo) ListAll(ctx context.Context, bidangID *string) ([]domain.Folder, error) {
	var query string
	var args []any
	if bidangID != nil && *bidangID != "" {
		query = `
			SELECT ` + folderColumns + ` FROM kemenag_arsip.folders f
			WHERE f.deleted_at IS NULL AND kemenag_arsip.can_bidang_access_folder($1::uuid, f.id)
			ORDER BY f.name ASC`
		args = append(args, *bidangID)
	} else {
		query = `
			SELECT ` + folderColumns + ` FROM kemenag_arsip.folders
			WHERE deleted_at IS NULL
			ORDER BY name ASC`
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Folder{}
	for rows.Next() {
		f, err := scanFolder(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *f)
	}
	return items, rows.Err()
}

// CanBidangAccess memeriksa apakah bidang memiliki hak akses ke folder ini (atau ancestor-nya).
func (r *FolderRepo) CanBidangAccess(ctx context.Context, bidangID, folderID string) (bool, error) {
	folderID = strings.TrimSpace(folderID)
	if folderID == "" || folderID == "root" || len(folderID) != 36 {
		return true, nil
	}
	var allowed bool
	err := r.pool.QueryRow(ctx, `SELECT kemenag_arsip.can_bidang_access_folder($1::uuid, $2::uuid)`, bidangID, folderID).Scan(&allowed)
	return allowed, err
}

// GetByID mengambil satu folder aktif.
func (r *FolderRepo) GetByID(ctx context.Context, id string) (*domain.Folder, error) {
	f, err := scanFolder(r.pool.QueryRow(ctx, `
		SELECT `+folderColumns+` FROM kemenag_arsip.folders WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return f, err
}

// GetByIDAnyStatus mengambil folder termasuk yang sudah dihapus.
func (r *FolderRepo) GetByIDAnyStatus(ctx context.Context, id string) (*domain.Folder, error) {
	f, err := scanFolder(r.pool.QueryRow(ctx, `
		SELECT `+folderColumns+` FROM kemenag_arsip.folders WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return f, err
}

// Create menyimpan folder baru dan mengembalikan hasilnya.
func (r *FolderRepo) Create(ctx context.Context, name string, parentID, bidangID, createdBy *string) (*domain.Folder, error) {
	f, err := scanFolder(r.pool.QueryRow(ctx, `
		INSERT INTO kemenag_arsip.folders (name, parent_id, bidang_id, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING `+folderColumns, name, parentID, bidangID, createdBy))
	if err != nil {
		return nil, err
	}
	return f, nil
}

// Rename mengganti nama folder.
func (r *FolderRepo) Rename(ctx context.Context, id, name string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders SET name = $1, updated_at = now() WHERE id = $2`, name, id)
	return err
}

// UpdateParent memindahkan folder ke parent baru.
func (r *FolderRepo) UpdateParent(ctx context.Context, id string, parentID *string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders SET parent_id = $1, updated_at = now() WHERE id = $2`, parentID, id)
	return err
}

// GetBidangID mengambil bidang_id sebuah folder.
func (r *FolderRepo) GetBidangID(ctx context.Context, id string) (*string, error) {
	id = strings.TrimSpace(id)
	if id == "" || id == "root" || id == "undefined" || id == "null" || len(id) != 36 {
		return nil, nil
	}
	var bidangID *string
	err := r.pool.QueryRow(ctx, `SELECT bidang_id FROM kemenag_arsip.folders WHERE id = $1`, id).Scan(&bidangID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return bidangID, err
}

// ExistsNameAtParent memeriksa apakah nama sudah dipakai di parent yang sama.
func (r *FolderRepo) ExistsNameAtParent(ctx context.Context, name string, parentID *string) (bool, error) {
	var query string
	var args []any
	if parentID == nil || *parentID == "" || *parentID == "root" {
		query = `SELECT EXISTS(SELECT 1 FROM kemenag_arsip.folders WHERE deleted_at IS NULL AND LOWER(name) = LOWER($1) AND parent_id IS NULL)`
		args = []any{name}
	} else {
		query = `SELECT EXISTS(SELECT 1 FROM kemenag_arsip.folders WHERE deleted_at IS NULL AND LOWER(name) = LOWER($1) AND parent_id = $2::uuid)`
		args = []any{name, *parentID}
	}
	var exists bool
	err := r.pool.QueryRow(ctx, query, args...).Scan(&exists)
	return exists, err
}

// SoftDelete menandai folder sebagai terhapus.
func (r *FolderRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders SET deleted_at = now(), updated_at = now() WHERE id = $1`, id)
	return err
}

// SoftDeleteBatch menandai banyak folder terhapus sekaligus.
func (r *FolderRepo) SoftDeleteBatch(ctx context.Context, ids []string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders SET deleted_at = now(), updated_at = now() WHERE id = ANY($1)`, ids)
	return err
}

// Restore membatalkan penandaan terhapus.
func (r *FolderRepo) Restore(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders SET deleted_at = NULL, updated_at = now() WHERE id = $1`, id)
	return err
}

// RestoreBatch memulihkan banyak folder sekaligus.
func (r *FolderRepo) RestoreBatch(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders SET deleted_at = NULL, updated_at = now() WHERE id = ANY($1)`, ids)
	return err
}

// HardDelete menghapus baris folder permanen (cascade ke anak).
func (r *FolderRepo) HardDelete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM kemenag_arsip.folders WHERE id = $1`, id)
	return err
}

// HardDeleteBatch menghapus banyak folder permanen sekaligus.
func (r *FolderRepo) HardDeleteBatch(ctx context.Context, ids []string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM kemenag_arsip.folders WHERE id = ANY($1)`, ids)
	return err
}

// ListDeleted mengambil folder yang berada di recycle bin.
func (r *FolderRepo) ListDeleted(ctx context.Context) ([]domain.Folder, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+folderColumns+` FROM kemenag_arsip.folders
		WHERE deleted_at IS NOT NULL
		ORDER BY deleted_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Folder{}
	for rows.Next() {
		f, err := scanFolder(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *f)
	}
	return items, rows.Err()
}