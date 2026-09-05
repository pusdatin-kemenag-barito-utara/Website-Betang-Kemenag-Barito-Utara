package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// BidangRepo mengakses tabel kemenag_arsip.bidang.
type BidangRepo struct {
	pool *pgxpool.Pool
}

// List mengembalikan seluruh bidang aktif sesuai urutan.
func (r *BidangRepo) List(ctx context.Context) ([]domain.Bidang, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, sort_order, created_at
		FROM kemenag_arsip.bidang
		ORDER BY sort_order ASC, name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.Bidang{}
	for rows.Next() {
		var b domain.Bidang
		if err := rows.Scan(&b.ID, &b.Name, &b.SortOrder, &b.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, rows.Err()
}

// ListWithCounts mengembalikan bidang beserta jumlah dokumen aktif dan daftar folder root yang diakses.
func (r *BidangRepo) ListWithCounts(ctx context.Context) ([]domain.BidangWithCount, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT b.id, b.name, b.sort_order, b.created_at,
		       COUNT(DISTINCT f.id) FILTER (WHERE f.deleted_at IS NULL) AS doc_count,
		       COALESCE(array_agg(DISTINCT bf.folder_id::text) FILTER (WHERE bf.folder_id IS NOT NULL), '{}') AS folder_ids,
		       COALESCE(array_agg(DISTINCT fold.name) FILTER (WHERE fold.name IS NOT NULL), '{}') AS folder_names
		FROM kemenag_arsip.bidang b
		LEFT JOIN kemenag_arsip.files f ON f.bidang_id = b.id
		LEFT JOIN kemenag_arsip.bidang_folders bf ON bf.bidang_id = b.id
		LEFT JOIN kemenag_arsip.folders fold ON fold.id = bf.folder_id AND fold.deleted_at IS NULL
		GROUP BY b.id, b.name, b.sort_order, b.created_at
		ORDER BY b.sort_order ASC, b.name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.BidangWithCount{}
	for rows.Next() {
		var b domain.BidangWithCount
		if err := rows.Scan(&b.ID, &b.Name, &b.SortOrder, &b.CreatedAt, &b.DocCount, &b.AccessibleFolderIDs, &b.AccessibleFolderNames); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, rows.Err()
}

// GetAccessibleFolderIDs mengambil daftar ID folder root yang dapat diakses oleh satu bidang.
func (r *BidangRepo) GetAccessibleFolderIDs(ctx context.Context, bidangID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT folder_id::text
		FROM kemenag_arsip.bidang_folders
		WHERE bidang_id = $1::uuid`, bidangID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// SetAccessibleFolders memperbarui daftar folder root yang dapat diakses oleh satu bidang.
func (r *BidangRepo) SetAccessibleFolders(ctx context.Context, bidangID string, folderIDs []string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM kemenag_arsip.bidang_folders WHERE bidang_id = $1::uuid`, bidangID); err != nil {
		return err
	}

	for _, fID := range folderIDs {
		fID = strings.TrimSpace(fID)
		if len(fID) == 36 {
			if _, err := tx.Exec(ctx, `
				INSERT INTO kemenag_arsip.bidang_folders (bidang_id, folder_id)
				VALUES ($1::uuid, $2::uuid)
				ON CONFLICT DO NOTHING`, bidangID, fID); err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

// FindByName mencari bidang dengan nama yang sama (tidak peka huruf besar/kecil),
// opsional mengecualikan satu id (dipakai saat update).
func (r *BidangRepo) FindByName(ctx context.Context, name, excludeID string) (*domain.Bidang, error) {
	query := `SELECT id, name, sort_order, created_at FROM kemenag_arsip.bidang WHERE LOWER(name) = LOWER($1)`
	args := []any{name}
	if excludeID != "" {
		query += ` AND id <> $2`
		args = append(args, excludeID)
	}
	var b domain.Bidang
	err := r.pool.QueryRow(ctx, query, args...).Scan(&b.ID, &b.Name, &b.SortOrder, &b.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// Create menyimpan bidang baru dengan urutan berikutnya.
func (r *BidangRepo) Create(ctx context.Context, name string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO kemenag_arsip.bidang (name, sort_order)
		SELECT $1, COALESCE(MAX(sort_order), 0) + 1 FROM kemenag_arsip.bidang`,
		name)
	return err
}

// Update mengubah nama dan urutan bidang.
func (r *BidangRepo) Update(ctx context.Context, id, name string, sortOrder int) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE kemenag_arsip.bidang SET name = $1, sort_order = $2 WHERE id = $3`,
		name, sortOrder, id)
	return err
}

// Delete menghapus bidang beserta relasi folder dan file (cascade).
func (r *BidangRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM kemenag_arsip.bidang WHERE id = $1`, id)
	return err
}

// Reorder memperbarui urutan seluruh bidang dalam satu transaksi.
func (r *BidangRepo) Reorder(ctx context.Context, items []domain.Bidang) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, item := range items {
		if _, err := tx.Exec(ctx,
			`UPDATE kemenag_arsip.bidang SET sort_order = $1 WHERE id = $2`,
			item.SortOrder, item.ID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// CountActiveFiles menghitung jumlah file aktif milik sebuah bidang.
func (r *BidangRepo) CountActiveFiles(ctx context.Context, bidangID string) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM kemenag_arsip.files WHERE bidang_id = $1 AND deleted_at IS NULL`,
		bidangID).Scan(&count)
	return count, err
}
