package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// FileRepo mengakses koleksi files di PocketBase.
type FileRepo struct {
	pb *pocketbase.Client
}

// NewFileRepo membuat instance FileRepo baru.
func NewFileRepo(pb *pocketbase.Client) *FileRepo {
	return &FileRepo{pb: pb}
}

type pbFile struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	FolderID     string `json:"folder_id"`
	BidangID     string `json:"bidang_id"`
	R2ObjectKey  string `json:"r2_object_key"`
	MimeType     string `json:"mime_type"`
	SizeBytes    int64  `json:"size_bytes"`
	IsRestricted bool   `json:"is_restricted"`
	IsStarred    bool   `json:"is_starred"`
	UploadedBy   string `json:"uploaded_by"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	DeletedAt    string `json:"deleted_at"`
	Created      string `json:"created"`
	Updated      string `json:"updated"`
}

func (f *pbFile) toDomain() domain.File {
	var folder *string
	if f.FolderID != "" && f.FolderID != "root" {
		folder = &f.FolderID
	}
	var bidang *string
	if f.BidangID != "" {
		bidang = &f.BidangID
	}
	var uploadedBy *string
	if f.UploadedBy != "" {
		uploadedBy = &f.UploadedBy
	}

	createdAt, _ := time.Parse(time.RFC3339Nano, f.CreatedAt)
	if createdAt.IsZero() {
		createdAt, _ = time.Parse(time.RFC3339Nano, f.Created)
	}
	updatedAt, _ := time.Parse(time.RFC3339Nano, f.UpdatedAt)
	if updatedAt.IsZero() {
		updatedAt, _ = time.Parse(time.RFC3339Nano, f.Updated)
	}

	var deletedAt *time.Time
	if f.DeletedAt != "" && f.DeletedAt != "null" {
		t, err := time.Parse(time.RFC3339Nano, f.DeletedAt)
		if err == nil {
			deletedAt = &t
		}
	}

	return domain.File{
		ID:           f.ID,
		Name:         f.Name,
		FolderID:     folder,
		BidangID:     bidang,
		R2ObjectKey:  f.R2ObjectKey,
		MimeType:     f.MimeType,
		SizeBytes:    f.SizeBytes,
		IsRestricted: f.IsRestricted,
		IsStarred:    f.IsStarred,
		UploadedBy:   uploadedBy,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
		DeletedAt:    deletedAt,
	}
}

// ListByFolder mengambil file aktif milik satu folder (nil = root), dengan filter opsional bidangID.
func (r *FileRepo) ListByFolder(ctx context.Context, folderID *string, bidangID *string) ([]domain.File, error) {
	filter := `deleted_at = ""`
	if folderID == nil || *folderID == "" || *folderID == "root" {
		filter += ` && folder_id = ""`
	} else {
		filter += fmt.Sprintf(` && folder_id = "%s"`, *folderID)
	}

	if bidangID != nil && *bidangID != "" {
		filter += fmt.Sprintf(` && bidang_id = "%s"`, *bidangID)
	}

	var records []pbFile
	_, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  filter,
		Sort:    "-created_at",
		PerPage: 1000,
	}, &records)
	if err != nil {
		return nil, err
	}

	items := make([]domain.File, len(records))
	for i, rec := range records {
		items[i] = rec.toDomain()
	}
	return items, nil
}

// GetByID mengambil satu file aktif.
func (r *FileRepo) GetByID(ctx context.Context, id string) (*domain.File, error) {
	var rec pbFile
	err := r.pb.Get(ctx, "files", id, &rec)
	if err != nil {
		if errors.Is(err, pocketbase.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	if rec.DeletedAt != "" && rec.DeletedAt != "null" {
		return nil, nil
	}
	d := rec.toDomain()
	return &d, nil
}

// FindByNameInFolder mencari file aktif dengan nama sama di folder yang sama.
func (r *FileRepo) FindByNameInFolder(ctx context.Context, name string, folderID *string) (*domain.File, error) {
	filter := fmt.Sprintf(`deleted_at = "" && name = "%s"`, strings.ReplaceAll(name, `"`, `\"`))
	if folderID == nil || *folderID == "" || *folderID == "root" {
		filter += ` && folder_id = ""`
	} else {
		filter += fmt.Sprintf(` && folder_id = "%s"`, *folderID)
	}

	var list []pbFile
	_, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  filter,
		PerPage: 1,
	}, &list)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	d := list[0].toDomain()
	return &d, nil
}

// Create menyimpan metadata file baru dan mengembalikan hasilnya.
func (r *FileRepo) Create(ctx context.Context, f *domain.File) (*domain.File, error) {
	newID := f.ID
	if newID == "" {
		newID = uuid.New().String()
	}
	now := time.Now().Format(time.RFC3339Nano)

	data := map[string]interface{}{
		"id":            newID,
		"name":          f.Name,
		"r2_object_key": f.R2ObjectKey,
		"mime_type":     f.MimeType,
		"size_bytes":    f.SizeBytes,
		"is_restricted": f.IsRestricted,
		"created_at":    now,
		"updated_at":    now,
	}
	if f.FolderID != nil && *f.FolderID != "root" {
		data["folder_id"] = *f.FolderID
	}
	if f.BidangID != nil {
		data["bidang_id"] = *f.BidangID
	}
	if f.UploadedBy != nil {
		data["uploaded_by"] = *f.UploadedBy
	}

	var created pbFile
	err := r.pb.Create(ctx, "files", data, &created)
	if err != nil {
		return nil, err
	}
	d := created.toDomain()
	return &d, nil
}

// UpdateObjectKey memperbarui object key versi terbaru sebuah file.
func (r *FileRepo) UpdateObjectKey(ctx context.Context, id, objectKey, mimeType string, sizeBytes int64, uploadedBy *string) error {
	data := map[string]interface{}{
		"r2_object_key": objectKey,
		"mime_type":     mimeType,
		"size_bytes":    sizeBytes,
		"updated_at":    time.Now().Format(time.RFC3339Nano),
	}
	if uploadedBy != nil {
		data["uploaded_by"] = *uploadedBy
	}
	return r.pb.Update(ctx, "files", id, data, nil)
}

// Rename mengganti nama file.
func (r *FileRepo) Rename(ctx context.Context, id, name string) error {
	return r.pb.Update(ctx, "files", id, map[string]interface{}{
		"name":       name,
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// UpdateFolder memindahkan file ke folder lain.
func (r *FileRepo) UpdateFolder(ctx context.Context, id string, folderID *string) error {
	fID := ""
	if folderID != nil && *folderID != "root" {
		fID = *folderID
	}
	return r.pb.Update(ctx, "files", id, map[string]interface{}{
		"folder_id":  fID,
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// GetBidangID mengambil bidang_id sebuah file.
func (r *FileRepo) GetBidangID(ctx context.Context, id string) (*string, error) {
	f, err := r.GetByID(ctx, id)
	if err != nil || f == nil {
		return nil, err
	}
	return f.BidangID, nil
}

// SoftDelete menandai file sebagai terhapus.
func (r *FileRepo) SoftDelete(ctx context.Context, id string) error {
	now := time.Now().Format(time.RFC3339Nano)
	return r.pb.Update(ctx, "files", id, map[string]interface{}{
		"deleted_at": now,
		"updated_at": now,
	}, nil)
}

// SoftDeleteBatch menandai banyak file terhapus sekaligus.
func (r *FileRepo) SoftDeleteBatch(ctx context.Context, ids []string) error {
	now := time.Now().Format(time.RFC3339Nano)
	for _, id := range ids {
		_ = r.pb.Update(ctx, "files", id, map[string]interface{}{
			"deleted_at": now,
			"updated_at": now,
		}, nil)
	}
	return nil
}

// Restore membatalkan penandaan terhapus.
func (r *FileRepo) Restore(ctx context.Context, id string) error {
	return r.pb.Update(ctx, "files", id, map[string]interface{}{
		"deleted_at": "",
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// RestoreBatch memulihkan banyak file sekaligus.
func (r *FileRepo) RestoreBatch(ctx context.Context, ids []string) error {
	for _, id := range ids {
		_ = r.Restore(ctx, id)
	}
	return nil
}

// HardDelete menghapus baris file permanen.
func (r *FileRepo) HardDelete(ctx context.Context, id string) error {
	return r.pb.Delete(ctx, "files", id)
}

// HardDeleteBatch menghapus banyak file permanen sekaligus.
func (r *FileRepo) HardDeleteBatch(ctx context.Context, ids []string) error {
	for _, id := range ids {
		_ = r.pb.Delete(ctx, "files", id)
	}
	return nil
}

// ListDeleted mengambil file yang berada di recycle bin.
func (r *FileRepo) ListDeleted(ctx context.Context) ([]domain.File, error) {
	var records []pbFile
	_, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  `deleted_at != ""`,
		Sort:    "-deleted_at",
		PerPage: 2000,
	}, &records)
	if err != nil {
		return nil, err
	}

	items := make([]domain.File, len(records))
	for i, rec := range records {
		items[i] = rec.toDomain()
	}
	return items, nil
}