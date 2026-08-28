package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// StorageRepo menghitung penggunaan penyimpanan aplikasi.
type StorageRepo struct {
	pool *pgxpool.Pool
}

// SumActiveSizes menjumlahkan ukuran seluruh file aktif (belum dihapus).
func (r *StorageRepo) SumActiveSizes(ctx context.Context) (int64, error) {
	var total int64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(size_bytes), 0) FROM kemenag_arsip.files WHERE deleted_at IS NULL`).
		Scan(&total)
	return total, err
}