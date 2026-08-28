package repository

import (
	"context"
	"errors"
	"strconv"

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

// ListByParent mengambil folder aktif milik satu parent (nil = root).
func (r *FolderRepo) ListByParent(ctx context.Context, parentID *string) ([]domain.Folder, error) {
	var query string
	var args []any
	if parentID == nil || *parentID == "" || *parentID == "root" {
		query = `SELECT ` + folderColumns + ` FROM kemenag_arsip.folders WHERE deleted_at IS NULL AND parent_id IS NULL ORDER BY name ASC`
	} else {
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

// ListAll mengambil seluruh folder aktif (untuk pohon pindah/salin).
func (r *FolderRepo) ListAll(ctx context.Context) ([]domain.Folder, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+folderColumns+` FROM kemenag_arsip.folders
		WHERE deleted_at IS NULL
		ORDER BY name ASC`)
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

// Search mencari folder berdasarkan trigram fuzzy similarity, substring ILIKE, dan FTS.
func (r *FolderRepo) Search(ctx context.Context, query string) ([]domain.Folder, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+folderColumns+` FROM kemenag_arsip.folders
		WHERE deleted_at IS NULL
		  AND (
		    name ILIKE '%' || $1 || '%'
		    OR similarity(name, $1) > 0.2
		    OR (fts_doc IS NOT NULL AND fts_doc @@ plainto_tsquery('simple', $1))
		    OR (fts_doc IS NOT NULL AND fts_doc @@ websearch_to_tsquery('simple', $1))
		  )
		ORDER BY similarity(name, $1) DESC, name ASC`, query)
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

// GetFolderSizes menghitung ukuran total (rekursif) sekumpulan folder via RPC.
// total_size bertipe NUMERIC sehingga di-scan sebagai string.
func (r *FolderRepo) GetFolderSizes(ctx context.Context, ids []string) (map[string]int64, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT folder_id, total_size::text FROM kemenag_arsip.get_folders_size($1::uuid[])`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := map[string]int64{}
	for rows.Next() {
		var folderID string
		var totalSize string
		if err := rows.Scan(&folderID, &totalSize); err != nil {
			return nil, err
		}
		size, _ := strconv.ParseInt(totalSize, 10, 64)
		result[folderID] = size
	}
	return result, rows.Err()
}

// GetFolderPath mengambil jalur folder [daun -> akar] via RPC.
func (r *FolderRepo) GetFolderPath(ctx context.Context, id string) ([]domain.Breadcrumb, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name FROM kemenag_arsip.get_folder_path($1::uuid)`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Breadcrumb{}
	for rows.Next() {
		var b domain.Breadcrumb
		if err := rows.Scan(&b.ID, &b.Name); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, rows.Err()
}

// GetAllFilesInFolder mengambil seluruh file aktif di dalam folder beserta
// subfoldernya (via RPC), dengan path relatif untuk pembuatan ZIP.
func (r *FolderRepo) GetAllFilesInFolder(ctx context.Context, folderID string) ([]domain.DownloadFile, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT r2_object_key, relative_path, file_name
		FROM kemenag_arsip.get_all_files_in_folder($1::uuid)`, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.DownloadFile{}
	for rows.Next() {
		var key, path, name string
		if err := rows.Scan(&key, &path, &name); err != nil {
			return nil, err
		}
		// relative_path adalah jalur folder; gabungkan dengan nama file.
		items = append(items, domain.DownloadFile{R2ObjectKey: key, Path: path + "/" + name})
	}
	return items, rows.Err()
}

// ToggleStar mengubah status bintang sebuah folder.
func (r *FolderRepo) ToggleStar(ctx context.Context, folderID string, isStarred bool) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders
		SET is_starred = $2, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL`, folderID, isStarred)
	return err
}

// UpdateColor mengubah warna kustom folder.
func (r *FolderRepo) UpdateColor(ctx context.Context, folderID string, color *string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.folders
		SET color = $2, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL`, folderID, color)
	return err
}

// ListStarred mengambil seluruh folder aktif yang dibintangi.
func (r *FolderRepo) ListStarred(ctx context.Context) ([]domain.Folder, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+folderColumns+` FROM kemenag_arsip.folders
		WHERE deleted_at IS NULL AND is_starred = true
		ORDER BY updated_at DESC, created_at DESC`)
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