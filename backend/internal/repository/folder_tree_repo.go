package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// Search mencari folder berdasarkan substring nama, dengan filter opsional bidangID.
func (r *FolderRepo) Search(ctx context.Context, query string, bidangID *string) ([]domain.Folder, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []domain.Folder{}, nil
	}

	filter := fmt.Sprintf(`deleted_at = "" && name ~ "%s"`, strings.ReplaceAll(query, `"`, `\"`))
	if bidangID != nil && *bidangID != "" {
		filter += fmt.Sprintf(` && bidang_id = "%s"`, *bidangID)
	}

	var records []pbFolder
	_, err := r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  filter,
		Sort:    "name",
		PerPage: 100,
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

// GetFolderSizes menghitung ukuran total (rekursif) sekumpulan folder.
func (r *FolderRepo) GetFolderSizes(ctx context.Context, ids []string) (map[string]int64, error) {
	result := make(map[string]int64)
	if len(ids) == 0 {
		return result, nil
	}

	// Ambil seluruh file aktif
	var allFiles []pbFile
	_, err := r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		PerPage: 5000,
	}, &allFiles)
	if err != nil {
		return result, nil
	}

	// Ambil seluruh folder aktif untuk pemetaan pohon
	var allFolders []pbFolder
	_, _ = r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		PerPage: 2000,
	}, &allFolders)

	// Buat peta anak: parent_id -> []child_id
	childrenMap := make(map[string][]string)
	for _, fold := range allFolders {
		if fold.ParentID != "" {
			childrenMap[fold.ParentID] = append(childrenMap[fold.ParentID], fold.ID)
		}
	}

	// Peta file size langsung: folder_id -> total size
	directSize := make(map[string]int64)
	for _, f := range allFiles {
		if f.FolderID != "" {
			directSize[f.FolderID] += f.SizeBytes
		}
	}

	// Fungsi rekursif untuk menghitung total ukuran subfolder
	var calcFolderSize func(fid string) int64
	calcFolderSize = func(fid string) int64 {
		size := directSize[fid]
		for _, childID := range childrenMap[fid] {
			size += calcFolderSize(childID)
		}
		return size
	}

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id != "" && id != "root" {
			result[id] = calcFolderSize(id)
		}
	}

	return result, nil
}

// GetFolderPath mengambil jalur folder [daun -> akar].
func (r *FolderRepo) GetFolderPath(ctx context.Context, id string) ([]domain.Breadcrumb, error) {
	id = strings.TrimSpace(id)
	if id == "" || id == "root" {
		return []domain.Breadcrumb{}, nil
	}

	var path []domain.Breadcrumb
	currID := id

	for i := 0; i < 20; i++ {
		var f pbFolder
		err := r.pb.Get(ctx, "folders", currID, &f)
		if err != nil {
			break
		}
		path = append(path, domain.Breadcrumb{ID: f.ID, Name: f.Name})
		if f.ParentID == "" || f.ParentID == "root" {
			break
		}
		currID = f.ParentID
	}

	// Balik urutan agar dari akar -> daun
	for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
		path[i], path[j] = path[j], path[i]
	}

	return path, nil
}

// GetAllFilesInFolder mengambil seluruh file aktif di dalam folder beserta subfoldernya.
func (r *FolderRepo) GetAllFilesInFolder(ctx context.Context, folderID string) ([]domain.DownloadFile, error) {
	var allFolders []pbFolder
	_, _ = r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		PerPage: 2000,
	}, &allFolders)

	var allFiles []pbFile
	_, _ = r.pb.List(ctx, "files", pocketbase.ListParams{
		Filter:  `deleted_at = ""`,
		PerPage: 5000,
	}, &allFiles)

	folderNameMap := make(map[string]string)
	folderParentMap := make(map[string]string)
	for _, f := range allFolders {
		folderNameMap[f.ID] = f.Name
		folderParentMap[f.ID] = f.ParentID
	}

	// Tentukan apakah suatu folder berada di bawah folderID
	isDescendant := func(fid string) bool {
		curr := fid
		for i := 0; i < 20; i++ {
			if curr == folderID {
				return true
			}
			p, ok := folderParentMap[curr]
			if !ok || p == "" || p == "root" {
				break
			}
			curr = p
		}
		return false
	}

	// Bangun relative path dari folderID ke folder target
	buildRelPath := func(fid string) string {
		var segments []string
		curr := fid
		for i := 0; i < 20; i++ {
			if curr == folderID {
				break
			}
			name := folderNameMap[curr]
			if name != "" {
				segments = append([]string{name}, segments...)
			}
			curr = folderParentMap[curr]
		}
		return strings.Join(segments, "/")
	}

	var items []domain.DownloadFile
	for _, f := range allFiles {
		if f.FolderID == "" {
			continue
		}
		if isDescendant(f.FolderID) {
			rel := buildRelPath(f.FolderID)
			filePath := f.Name
			if rel != "" {
				filePath = rel + "/" + f.Name
			}
			items = append(items, domain.DownloadFile{
				R2ObjectKey: f.R2ObjectKey,
				Path:        filePath,
			})
		}
	}

	return items, nil
}

// ToggleStar mengubah status bintang sebuah folder.
func (r *FolderRepo) ToggleStar(ctx context.Context, folderID string, isStarred bool) error {
	return r.pb.Update(ctx, "folders", folderID, map[string]interface{}{
		"is_starred": isStarred,
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// UpdateColor mengubah warna kustom folder.
func (r *FolderRepo) UpdateColor(ctx context.Context, folderID string, color *string) error {
	colVal := ""
	if color != nil {
		colVal = *color
	}
	return r.pb.Update(ctx, "folders", folderID, map[string]interface{}{
		"color":      colVal,
		"updated_at": time.Now().Format(time.RFC3339Nano),
	}, nil)
}

// ListStarred mengambil seluruh folder aktif yang dibintangi, dengan filter opsional bidangID.
func (r *FolderRepo) ListStarred(ctx context.Context, bidangID *string) ([]domain.Folder, error) {
	filter := `deleted_at = "" && is_starred = true`
	if bidangID != nil && *bidangID != "" {
		filter += fmt.Sprintf(` && bidang_id = "%s"`, *bidangID)
	}

	var records []pbFolder
	_, err := r.pb.List(ctx, "folders", pocketbase.ListParams{
		Filter:  filter,
		Sort:    "-updated_at,-created_at",
		PerPage: 500,
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
