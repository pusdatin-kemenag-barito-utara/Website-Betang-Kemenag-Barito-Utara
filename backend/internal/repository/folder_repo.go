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

// FolderRepo mengakses tabel kemenag_arsip.folders di PocketBase.
type FolderRepo struct {
	pb *pocketbase.Client
}

// NewFolderRepo membuat instance FolderRepo baru.
func NewFolderRepo(pb *pocketbase.Client) *FolderRepo {
	return &FolderRepo{pb: pb}
}

type pbFolder struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	ParentID     string `json:"parent_id"`
	BidangID     string `json:"bidang_id"`
	IsRestricted bool   `json:"is_restricted"`
	IsStarred    bool   `json:"is_starred"`
	Color        string `json:"color"`
	CreatedBy    string `json:"created_by"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	DeletedAt    string `json:"deleted_at"`
	Created      string `json:"created"`
	Updated      string `json:"updated"`
}

func (f *pbFolder) toDomain() domain.Folder {
	var parent *string
	if f.ParentID != "" && f.ParentID != "root" {
		parent = &f.ParentID
	}
	var bidang *string
	if f.BidangID != "" {
		bidang = &f.BidangID
	}
	var color *string
	if f.Color != "" && f.Color != "null" {
		color = &f.Color
	}
	var createdBy *string
	if f.CreatedBy != "" {
		createdBy = &f.CreatedBy
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

	return domain.Folder{
		ID:           f.ID,
		Name:         f.Name,
		ParentID:     parent,
		BidangID:     bidang,
		IsRestricted: f.IsRestricted,
		IsStarred:    f.IsStarred,
		Color:        color,
		CreatedBy:    createdBy,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
		DeletedAt:    deletedAt,
	}
}

// ListByParent mengambil folder aktif milik satu parent (nil = root), dengan filter opsional bidangID.
func (r *FolderRepo) ListByParent(ctx context.Context, parentID *string, bidangID *string) ([]domain.Folder, error) {
	filter := `deleted_at = ""`
	if parentID == nil || *parentID == "" || *parentID == "root" {
		filter += ` && parent_id = ""`
	} else {
		filter += fmt.Sprintf(` && parent_id = "%s"`, *parentID)
	}

	var records []pbFolder
	_, err := r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  filter,
		Sort:    "name",
		PerPage: 500,
	}, &records)
	if err != nil {
		return nil, err
	}

	// Filter bidangID jika berada di root
	var accessibleRootFolderIDs map[string]bool
	if (parentID == nil || *parentID == "" || *parentID == "root") && (bidangID != nil && *bidangID != "") {
		accessibleRootFolderIDs = make(map[string]bool)
		var bfList []pbBidangFolder
		_, _ = r.pb.List(ctx, "bidang_folders", pocketbase.ListParams{
			Filter:  fmt.Sprintf(`bidang_id = "%s"`, *bidangID),
			PerPage: 500,
		}, &bfList)
		for _, bf := range bfList {
			accessibleRootFolderIDs[bf.FolderID] = true
		}
	}

	items := make([]domain.Folder, 0, len(records))
	for _, rec := range records {
		d := rec.toDomain()
		if accessibleRootFolderIDs != nil {
			// Jika root, pastikan folder tersebut ditugaskan ke bidang atau memiliki bidang_id yang cocok
			if !accessibleRootFolderIDs[d.ID] && (d.BidangID == nil || *d.BidangID != *bidangID) {
				continue
			}
		}
		items = append(items, d)
	}

	return items, nil
}

// ListAll mengambil seluruh folder aktif (untuk pohon pindah/salin), dengan filter opsional bidangID.
func (r *FolderRepo) ListAll(ctx context.Context, bidangID *string) ([]domain.Folder, error) {
	var records []pbFolder
	_, err := r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		Sort:    "name",
		PerPage: 2000,
	}, &records)
	if err != nil {
		return nil, err
	}

	items := make([]domain.Folder, 0, len(records))
	for _, rec := range records {
		d := rec.toDomain()
		if bidangID != nil && *bidangID != "" {
			allowed, _ := r.CanBidangAccess(ctx, *bidangID, d.ID)
			if !allowed {
				continue
			}
		}
		items = append(items, d)
	}
	return items, nil
}

// CanBidangAccess memeriksa apakah bidang memiliki hak akses ke folder ini (atau ancestor-nya).
func (r *FolderRepo) CanBidangAccess(ctx context.Context, bidangID, folderID string) (bool, error) {
	folderID = strings.TrimSpace(folderID)
	if folderID == "" || folderID == "root" {
		return true, nil
	}

	// Cek apakah bidangID ditugaskan langsung ke folder
	var bfList []pbBidangFolder
	_, _ = r.pb.List(ctx, "bidang_folders", pocketbase.ListParams{
		Filter:  fmt.Sprintf(`bidang_id = "%s" && folder_id = "%s"`, bidangID, folderID),
		PerPage: 1,
	}, &bfList)
	if len(bfList) > 0 {
		return true, nil
	}

	currID := folderID
	for i := 0; i < 10; i++ {
		var f pbFolder
		err := r.pb.Get(ctx, "folders", currID, &f)
		if err != nil {
			break
		}
		if f.BidangID == bidangID {
			return true, nil
		}
		// Cek apakah ancestor ada di bidang_folders
		var ancBf []pbBidangFolder
		_, _ = r.pb.List(ctx, "bidang_folders", pocketbase.ListParams{
			Filter:  fmt.Sprintf(`bidang_id = "%s" && folder_id = "%s"`, bidangID, currID),
			PerPage: 1,
		}, &ancBf)
		if len(ancBf) > 0 {
			return true, nil
		}
		if f.ParentID == "" || f.ParentID == "root" {
			break
		}
		currID = f.ParentID
	}

	return false, nil
}

// GetByID mengambil satu folder aktif.
func (r *FolderRepo) GetByID(ctx context.Context, id string) (*domain.Folder, error) {
	var rec pbFolder
	err := r.pb.Get(ctx, "folders", id, &rec)
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

// GetByIDAnyStatus mengambil folder termasuk yang sudah dihapus.
func (r *FolderRepo) GetByIDAnyStatus(ctx context.Context, id string) (*domain.Folder, error) {
	var rec pbFolder
	err := r.pb.Get(ctx, "folders", id, &rec)
	if err != nil {
		if errors.Is(err, pocketbase.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	d := rec.toDomain()
	return &d, nil
}

// Create menyimpan folder baru dan mengembalikan hasilnya.
func (r *FolderRepo) Create(ctx context.Context, name string, parentID, bidangID, createdBy *string) (*domain.Folder, error) {
	newID := uuid.New().String()
	now := time.Now().Format(time.RFC3339Nano)

	data := map[string]interface{}{
		"id":         newID,
		"name":       name,
		"created_at": now,
		"updated_at": now,
	}
	if parentID != nil && *parentID != "root" {
		data["parent_id"] = *parentID
	}
	if bidangID != nil {
		data["bidang_id"] = *bidangID
	}
	if createdBy != nil {
		data["created_by"] = *createdBy
	}

	var created pbFolder
	err := r.pb.Create(ctx, "folders", data, &created)
	if err != nil {
		return nil, err
	}
	d := created.toDomain()
	return &d, nil
}

// Rename mengganti nama folder.
func (r *FolderRepo) Rename(ctx context.Context, id, name string) error {
	return r.pb.Update(ctx, "folders", id, map[string]interface{}{
		"name":       name,
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// UpdateParent memindahkan folder ke parent baru.
func (r *FolderRepo) UpdateParent(ctx context.Context, id string, parentID *string) error {
	pID := ""
	if parentID != nil && *parentID != "root" {
		pID = *parentID
	}
	return r.pb.Update(ctx, "folders", id, map[string]interface{}{
		"parent_id":  pID,
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// GetBidangID mengambil bidang_id sebuah folder.
func (r *FolderRepo) GetBidangID(ctx context.Context, id string) (*string, error) {
	f, err := r.GetByID(ctx, id)
	if err != nil || f == nil {
		return nil, err
	}
	return f.BidangID, nil
}

// ExistsNameAtParent memeriksa apakah nama sudah dipakai di parent yang sama.
func (r *FolderRepo) ExistsNameAtParent(ctx context.Context, name string, parentID *string) (bool, error) {
	filter := fmt.Sprintf(`deleted_at = "" && name = "%s"`, strings.ReplaceAll(name, `"`, `\"`))
	if parentID == nil || *parentID == "" || *parentID == "root" {
		filter += ` && parent_id = ""`
	} else {
		filter += fmt.Sprintf(` && parent_id = "%s"`, *parentID)
	}

	var list []pbFolder
	_, err := r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  filter,
		PerPage: 1,
	}, &list)
	if err != nil {
		return false, err
	}
	return len(list) > 0, nil
}

// SoftDelete menandai folder sebagai terhapus.
func (r *FolderRepo) SoftDelete(ctx context.Context, id string) error {
	now := time.Now().Format(time.RFC3339Nano)
	return r.pb.Update(ctx, "folders", id, map[string]interface{}{
		"deleted_at": now,
		"updated_at": now,
	}, nil)
}

// SoftDeleteBatch menandai banyak folder terhapus sekaligus.
func (r *FolderRepo) SoftDeleteBatch(ctx context.Context, ids []string) error {
	now := time.Now().Format(time.RFC3339Nano)
	for _, id := range ids {
		_ = r.pb.Update(ctx, "folders", id, map[string]interface{}{
			"deleted_at": now,
			"updated_at": now,
		}, nil)
	}
	return nil
}

// Restore membatalkan penandaan terhapus.
func (r *FolderRepo) Restore(ctx context.Context, id string) error {
	return r.pb.Update(ctx, "folders", id, map[string]interface{}{
		"deleted_at": "",
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// RestoreBatch memulihkan banyak folder sekaligus.
func (r *FolderRepo) RestoreBatch(ctx context.Context, ids []string) error {
	for _, id := range ids {
		_ = r.Restore(ctx, id)
	}
	return nil
}

// HardDelete menghapus baris folder permanen.
func (r *FolderRepo) HardDelete(ctx context.Context, id string) error {
	return r.pb.Delete(ctx, "folders", id)
}

// HardDeleteBatch menghapus banyak folder permanen sekaligus.
func (r *FolderRepo) HardDeleteBatch(ctx context.Context, ids []string) error {
	for _, id := range ids {
		_ = r.pb.Delete(ctx, "folders", id)
	}
	return nil
}

// ListDeleted mengambil folder yang berada di recycle bin.
func (r *FolderRepo) ListDeleted(ctx context.Context) ([]domain.Folder, error) {
	var records []pbFolder
	_, err := r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  `deleted_at != ""`,
		Sort:    "-deleted_at",
		PerPage: 1000,
	}, &records)
	if err != nil {
		return nil, err
	}

	items := make([]domain.Folder, len(records))
	for i, rec := range records {
		items[i] = rec.toDomain()
	}
	return items, nil
}