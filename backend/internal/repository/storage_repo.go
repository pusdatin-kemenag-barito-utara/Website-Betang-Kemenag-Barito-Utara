package repository

import (
	"context"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// StorageRepo menghitung penggunaan penyimpanan aplikasi di PocketBase.
type StorageRepo struct {
	pb *pocketbase.Client
}

// NewStorageRepo membuat instance StorageRepo baru.
func NewStorageRepo(pb *pocketbase.Client) *StorageRepo {
	return &StorageRepo{pb: pb}
}

// SumActiveSizes menjumlahkan ukuran seluruh file aktif (belum dihapus).
func (r *StorageRepo) SumActiveSizes(ctx context.Context) (int64, error) {
	var files []pbFile
	_, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		PerPage: 5000,
	}, &files)
	if err != nil {
		return 0, err
	}

	var total int64
	for _, f := range files {
		total += f.SizeBytes
	}
	return total, nil
}