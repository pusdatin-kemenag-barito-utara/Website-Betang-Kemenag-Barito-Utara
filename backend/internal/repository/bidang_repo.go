package repository

import (
	"context"
	"errors"

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

// ListWithCounts mengembalikan bidang beserta jumlah dokumen aktif per bidang.
func (r *BidangRepo) ListWithCounts(ctx context.Context) ([]domain.BidangWithCount, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT b.id, b.name, b.sort_order, b.created_at,
		       COUNT(f.id) FILTER (WHERE f.deleted_at IS NULL) AS doc_count
		FROM kemenag_arsip.bidang b
		LEFT JOIN kemenag_arsip.files f ON f.bidang_id = b.id
		GROUP BY b.id, b.name, b.sort_order, b.created_at
		ORDER BY b.sort_order ASC, b.name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []domain.BidangWithCount{}
	for rows.Next() {
		var b domain.BidangWithCount
		if err := rows.Scan(&b.ID, &b.Name, &b.SortOrder, &b.CreatedAt, &b.DocCount); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, rows.Err()
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
