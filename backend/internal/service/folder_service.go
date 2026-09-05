package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/storage"
)

type folderCacheEntry struct {
	contents  *FolderContents
	expiresAt time.Time
}

var (
	folderContentsCache   = make(map[string]folderCacheEntry)
	folderContentsCacheMu sync.RWMutex
)

// InvalidateFolderCache membersihkan cache isi folder saat ada perubahan.
func InvalidateFolderCache() {
	folderContentsCacheMu.Lock()
	defer folderContentsCacheMu.Unlock()
	folderContentsCache = make(map[string]folderCacheEntry)
}

// FolderService menangani operasi folder dan item (folder/file) secara umum:
// jelajah, pencarian, buat, rename, pindah, salin, dan hapus.
type FolderService struct {
	folders *repository.FolderRepo
	files   *repository.FileRepo
	r2      *storage.R2Storage
	audits  *Services
}

// FolderContents adalah isi satu direktori (folder + file + ukuran folder).
type FolderContents struct {
	Folders []domain.FolderSummary `json:"folders"`
	Files   []domain.File          `json:"files"`
}

// Contents mengambil isi direktori; jika query diisi, pencarian dilakukan
// global (mengabaikan parent). Admin Bidang dibatasi hanya pada bidang miliknya.
func (s *FolderService) Contents(ctx context.Context, parentID *string, query string, user *domain.AuthUser) (*FolderContents, error) {
	var bidangFilter *string
	if user != nil && !user.IsSuperAdmin && user.BidangID != nil && *user.BidangID != "" {
		bidangFilter = user.BidangID
	}

	// Validasi kepemilikan folder bila membuka subfolder tertentu
	if parentID != nil && *parentID != "" && *parentID != "root" {
		parentFolder, err := s.folders.GetByID(ctx, *parentID)
		if err != nil {
			return nil, err
		}
		if parentFolder == nil {
			return nil, errors.New("Folder tidak ditemukan.")
		}
		if bidangFilter != nil {
			allowed, err := s.folders.CanBidangAccess(ctx, *bidangFilter, *parentID)
			if err != nil {
				return nil, err
			}
			if !allowed {
				return nil, errors.New("Anda tidak memiliki izin untuk mengakses folder bidang lain.")
			}
		}
	}

	cacheKey := "root"
	if parentID != nil && *parentID != "" {
		cacheKey = *parentID
	}
	if bidangFilter != nil {
		cacheKey += ":bidang:" + *bidangFilter
	}
	if query != "" {
		cacheKey += ":q:" + query
	}

	// Cek cache RAM
	folderContentsCacheMu.RLock()
	if cached, ok := folderContentsCache[cacheKey]; ok && time.Now().Before(cached.expiresAt) {
		folderContentsCacheMu.RUnlock()
		return cached.contents, nil
	}
	folderContentsCacheMu.RUnlock()

	var folders []domain.Folder
	var files []domain.File
	var err error

	if query != "" {
		folders, err = s.folders.Search(ctx, query, bidangFilter)
		if err != nil {
			return nil, err
		}
		files, err = s.files.Search(ctx, query, bidangFilter)
		if err != nil {
			return nil, err
		}
	} else {
		folders, err = s.folders.ListByParent(ctx, parentID, bidangFilter)
		if err != nil {
			return nil, err
		}
		files, err = s.files.ListByFolder(ctx, parentID, bidangFilter)
		if err != nil {
			return nil, err
		}
	}

	// Ukuran folder dihitung via RPC batch.
	result := &FolderContents{Files: files, Folders: []domain.FolderSummary{}}
	if len(folders) > 0 {
		ids := make([]string, 0, len(folders))
		for _, f := range folders {
			ids = append(ids, f.ID)
		}
		sizes, err := s.folders.GetFolderSizes(ctx, ids)
		if err != nil {
			// Fallback aman: tetap tampilkan folder meskipun kalkulasi ukuran gagal
			sizes = map[string]int64{}
		}
		for _, f := range folders {
			result.Folders = append(result.Folders, domain.FolderSummary{Folder: f, TotalSize: sizes[f.ID]})
		}
	}

	// Simpan ke cache RAM selama 30 detik
	folderContentsCacheMu.Lock()
	folderContentsCache[cacheKey] = folderCacheEntry{
		contents:  result,
		expiresAt: time.Now().Add(30 * time.Second),
	}
	folderContentsCacheMu.Unlock()

	return result, nil
}

// Create membuat folder baru di bawah parent. Bidang diwarisi dari parent atau dari user jika root.
func (s *FolderService) Create(ctx context.Context, name string, parentID *string, actorID, actorEmail, ip string, userBidangID *string) (*domain.Folder, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("Nama folder tidak boleh kosong.")
	}
	bidangID, err := s.BidangIDForParent(ctx, parentID)
	if err != nil {
		return nil, err
	}
	if bidangID == nil && userBidangID != nil && *userBidangID != "" {
		bidangID = userBidangID
	}
	created, err := s.folders.Create(ctx, name, parentID, bidangID, &actorID)
	if err != nil {
		return nil, err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "INSERT", "Folder: "+name, nil, created, ip)
	return created, nil
}

// Rename mengganti nama folder.
func (s *FolderService) Rename(ctx context.Context, id, newName, actorEmail, ip string) error {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return errors.New("Nama folder tidak boleh kosong.")
	}
	if err := s.folders.Rename(ctx, id, newName); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Rename Folder ke "+newName, nil, map[string]any{"id": id, "name": newName}, ip)
	return nil
}

// Move memindahkan folder ke parent baru.
func (s *FolderService) Move(ctx context.Context, id string, targetParentID *string, actorEmail, ip string) error {
	if targetParentID != nil && id == *targetParentID {
		return errors.New("Tidak dapat memindahkan folder ke dalam dirinya sendiri")
	}
	if err := s.folders.UpdateParent(ctx, id, targetParentID); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Move Folder ke parent "+fmt.Sprint(targetParentID), nil, map[string]any{"id": id}, ip)
	return nil
}

// Delete menandai folder sebagai terhapus (soft delete).
func (s *FolderService) Delete(ctx context.Context, id, actorEmail, ip string) error {
	if err := s.folders.SoftDelete(ctx, id); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "DELETE", "Folder ID: "+id, nil, nil, ip)
	return nil
}

// DeleteBatch menandai banyak item (folder/file) terhapus sekaligus.
func (s *FolderService) DeleteBatch(ctx context.Context, items []domain.TrashItem, actorEmail, ip string) error {
	fileIDs := []string{}
	folderIDs := []string{}
	for _, item := range items {
		switch item.Type {
		case "file":
			fileIDs = append(fileIDs, item.ID)
		case "folder":
			folderIDs = append(folderIDs, item.ID)
		}
	}
	if len(fileIDs) > 0 {
		if err := s.files.SoftDeleteBatch(ctx, fileIDs); err != nil {
			return err
		}
	}
	if len(folderIDs) > 0 {
		if err := s.folders.SoftDeleteBatch(ctx, folderIDs); err != nil {
			return err
		}
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "DELETE", "Batch hapus "+strconv.Itoa(len(items))+" item", nil, nil, ip)
	return nil
}

// BidangIDForParent mengambil bidang dari parent folder (nil jika root).
func (s *FolderService) BidangIDForParent(ctx context.Context, parentID *string) (*string, error) {
	if parentID == nil || *parentID == "" {
		return nil, nil
	}
	return s.folders.GetBidangID(ctx, *parentID)
}

// ToggleStar mengubah status bintang item (file atau folder).
func (s *FolderService) ToggleStar(ctx context.Context, id, itemType string, isStarred bool) error {
	InvalidateFolderCache()
	if itemType == "folder" {
		return s.folders.ToggleStar(ctx, id, isStarred)
	}
	return s.files.ToggleStar(ctx, id, isStarred)
}

// UpdateColor mengubah warna folder.
func (s *FolderService) UpdateColor(ctx context.Context, folderID string, color *string) error {
	InvalidateFolderCache()
	return s.folders.UpdateColor(ctx, folderID, color)
}

// ListStarred mengambil seluruh folder dan file yang dibintangi, dengan filter bidang bila Admin Bidang.
func (s *FolderService) ListStarred(ctx context.Context, user *domain.AuthUser) (*FolderContents, error) {
	var bidangFilter *string
	if user != nil && !user.IsSuperAdmin && user.BidangID != nil && *user.BidangID != "" {
		bidangFilter = user.BidangID
	}
	starredFolders, err := s.folders.ListStarred(ctx, bidangFilter)
	if err != nil {
		return nil, err
	}
	starredFiles, err := s.files.ListStarred(ctx, bidangFilter)
	if err != nil {
		return nil, err
	}

	summaries := make([]domain.FolderSummary, len(starredFolders))
	for i, f := range starredFolders {
		summaries[i] = domain.FolderSummary{
			Folder:    f,
			TotalSize: 0,
		}
	}

	return &FolderContents{
		Folders: summaries,
		Files:   starredFiles,
	}, nil
}