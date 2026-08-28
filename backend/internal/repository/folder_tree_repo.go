package repository

import (
	"context"
	"strconv"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

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
