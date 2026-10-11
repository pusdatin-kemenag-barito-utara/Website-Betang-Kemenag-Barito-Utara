package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// BidangRepo mengakses koleksi bidang di PocketBase.
type BidangRepo struct {
	pb *pocketbase.Client
}

// NewBidangRepo membuat instance BidangRepo baru.
func NewBidangRepo(pb *pocketbase.Client) *BidangRepo {
	return &BidangRepo{pb: pb}
}

type pbBidang struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SortOrder int    `json:"sort_order"`
	CreatedAt string `json:"created_at"`
	Created   string `json:"created"`
}

func (b *pbBidang) toDomain() domain.Bidang {
	t, _ := time.Parse(time.RFC3339Nano, b.CreatedAt)
	if t.IsZero() {
		t, _ = time.Parse(time.RFC3339Nano, b.Created)
	}
	return domain.Bidang{
		ID:        b.ID,
		Name:      b.Name,
		SortOrder: b.SortOrder,
		CreatedAt: t,
	}
}

// List mengembalikan seluruh bidang aktif sesuai urutan.
func (r *BidangRepo) List(ctx context.Context) ([]domain.Bidang, error) {
	var records []pbBidang
	_, err := r.pb.List(ctx, "bidang", pocketbase.ListParams{
		Sort:    "sort_order,name",
		PerPage: 500,
	}, &records)
	if err != nil {
		return nil, err
	}

	res := make([]domain.Bidang, len(records))
	for i, b := range records {
		res[i] = b.toDomain()
	}
	return res, nil
}

type pbBidangFolder struct {
	ID        string `json:"id"`
	BidangID  string `json:"bidang_id"`
	FolderID  string `json:"folder_id"`
	CreatedAt string `json:"created_at"`
}

type pbFileSummary struct {
	ID        string `json:"id"`
	BidangID  string `json:"bidang_id"`
	DeletedAt string `json:"deleted_at"`
}

type pbFolderSummary struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	DeletedAt string `json:"deleted_at"`
}

// ListWithCounts mengembalikan bidang beserta jumlah dokumen aktif dan daftar folder root yang diakses.
func (r *BidangRepo) ListWithCounts(ctx context.Context) ([]domain.BidangWithCount, error) {
	bidangs, err := r.List(ctx)
	if err != nil {
		return nil, err
	}

	// Ambil file aktif untuk hitung doc_count
	var files []pbFileSummary
	_, _ = r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		PerPage: 5000,
	}, &files)

	fileCounts := make(map[string]int64)
	for _, f := range files {
		if f.BidangID != "" {
			fileCounts[f.BidangID]++
		}
	}

	// Ambil relasi bidang_folders
	var bfList []pbBidangFolder
	_, _ = r.pb.List(ctx, "bidang_folders", pocketbase.ListParams{
		PerPage: 1000,
	}, &bfList)

	// Ambil nama folder untuk pemetaan
	var folders []pbFolderSummary
	_, _ = r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		PerPage: 1000,
	}, &folders)
	folderNames := make(map[string]string)
	for _, fold := range folders {
		folderNames[fold.ID] = fold.Name
	}

	bidangFolderMap := make(map[string][]string)
	for _, bf := range bfList {
		bidangFolderMap[bf.BidangID] = append(bidangFolderMap[bf.BidangID], bf.FolderID)
	}

	items := make([]domain.BidangWithCount, len(bidangs))
	for i, b := range bidangs {
		fIDs := bidangFolderMap[b.ID]
		fNames := make([]string, 0, len(fIDs))
		for _, fid := range fIDs {
			if name, ok := folderNames[fid]; ok {
				fNames = append(fNames, name)
			}
		}

		items[i] = domain.BidangWithCount{
			Bidang:                b,
			DocCount:              fileCounts[b.ID],
			AccessibleFolderIDs:   fIDs,
			AccessibleFolderNames: fNames,
		}
	}

	return items, nil
}

// GetAccessibleFolderIDs mengambil daftar ID folder root yang dapat diakses oleh satu bidang.
func (r *BidangRepo) GetAccessibleFolderIDs(ctx context.Context, bidangID string) ([]string, error) {
	var list []pbBidangFolder
	_, err := r.pb.List(ctx, "bidang_folders", pocketbase.ListParams{
		Filter:  fmt.Sprintf(`bidang_id = "%s"`, bidangID),
		PerPage: 500,
	}, &list)
	if err != nil {
		return nil, err
	}

	ids := make([]string, len(list))
	for i, item := range list {
		ids[i] = item.FolderID
	}
	return ids, nil
}

// SetAccessibleFolders memperbarui daftar folder root yang dapat diakses oleh satu bidang.
func (r *BidangRepo) SetAccessibleFolders(ctx context.Context, bidangID string, folderIDs []string) error {
	// Ambil yang lama untuk dihapus
	var old []pbBidangFolder
	_, err := r.pb.List(ctx, "bidang_folders", pocketbase.ListParams{
		Filter:  fmt.Sprintf(`bidang_id = "%s"`, bidangID),
		PerPage: 500,
	}, &old)
	if err == nil {
		for _, item := range old {
			_ = r.pb.Delete(ctx, "bidang_folders", item.ID)
		}
	}

	// Insert yang baru
	for _, fid := range folderIDs {
		fid = strings.TrimSpace(fid)
		if fid == "" {
			continue
		}
		compactID := strings.ReplaceAll(bidangID, "-", "")[:16] + strings.ReplaceAll(fid, "-", "")[:16]
		data := map[string]interface{}{
			"id":         compactID,
			"bidang_id":  bidangID,
			"folder_id":  fid,
			"created_at": time.Now().Format(time.RFC3339Nano),
		}
		_ = r.pb.Create(ctx, "bidang_folders", data, nil)
	}

	return nil
}

// GetByID mengambil satu bidang berdasarkan UUID.
func (r *BidangRepo) GetByID(ctx context.Context, id string) (*domain.Bidang, error) {
	var rec pbBidang
	err := r.pb.Get(ctx, "bidang", id, &rec)
	if err != nil {
		if errors.Is(err, pocketbase.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	res := rec.toDomain()
	return &res, nil
}

// FindByName mencari bidang berdasarkan nama (case-insensitive).
func (r *BidangRepo) FindByName(ctx context.Context, name, excludeID string) (*domain.Bidang, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, nil
	}

	filter := fmt.Sprintf(`name = "%s"`, strings.ReplaceAll(name, `"`, `\"`))
	if excludeID != "" {
		filter += fmt.Sprintf(` && id != "%s"`, excludeID)
	}

	var list []pbBidang
	_, err := r.pb.List(ctx, "bidang", pocketbase.ListParams{
		Filter:  filter,
		PerPage: 1,
	}, &list)
	if err != nil || len(list) == 0 {
		return nil, err
	}

	res := list[0].toDomain()
	return &res, nil
}

// CountActiveFiles menghitung jumlah file aktif milik satu bidang.
func (r *BidangRepo) CountActiveFiles(ctx context.Context, bidangID string) (int64, error) {
	var list []pbFileSummary
	lr, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  fmt.Sprintf(`deleted_at = "" && bidang_id = "%s"`, bidangID),
		PerPage: 1,
	}, &list)
	if err != nil {
		return 0, err
	}
	return int64(lr.TotalItems), nil
}

// Create menambahkan bidang baru.
func (r *BidangRepo) Create(ctx context.Context, name string) error {
	data := map[string]interface{}{
		"name":       name,
		"sort_order": 0,
		"created_at": time.Now().Format(time.RFC3339Nano),
	}
	return r.pb.Create(ctx, "bidang", data, nil)
}

// Update memperbarui data bidang.
func (r *BidangRepo) Update(ctx context.Context, id, name string, sortOrder int) error {
	data := map[string]interface{}{
		"name":       name,
		"sort_order": sortOrder,
	}
	return r.pb.Update(ctx, "bidang", id, data, nil)
}

// Delete menghapus bidang secara permanen.
func (r *BidangRepo) Delete(ctx context.Context, id string) error {
	return r.pb.Delete(ctx, "bidang", id)
}

// Reorder memperbarui urutan seluruh bidang sekaligus.
func (r *BidangRepo) Reorder(ctx context.Context, items []domain.Bidang) error {
	for _, item := range items {
		_ = r.pb.Update(ctx, "bidang", item.ID, map[string]interface{}{
			"sort_order": item.SortOrder,
		}, nil)
	}
	return nil
}
