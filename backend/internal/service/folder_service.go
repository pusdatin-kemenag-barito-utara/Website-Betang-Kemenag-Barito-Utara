package service

import (
	"context"
	"errors"
	"fmt"
	"path"
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
// global (mengabaikan parent) seperti perilaku lama.
func (s *FolderService) Contents(ctx context.Context, parentID *string, query string) (*FolderContents, error) {
	cacheKey := "root"
	if parentID != nil && *parentID != "" {
		cacheKey = *parentID
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
		folders, err = s.folders.Search(ctx, query)
		if err != nil {
			return nil, err
		}
		files, err = s.files.Search(ctx, query)
		if err != nil {
			return nil, err
		}
	} else {
		folders, err = s.folders.ListByParent(ctx, parentID)
		if err != nil {
			return nil, err
		}
		files, err = s.files.ListByFolder(ctx, parentID)
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

// Breadcrumbs mengambil jalur folder (daun -> akar) via RPC.
func (s *FolderService) Breadcrumbs(ctx context.Context, folderID string) ([]domain.Breadcrumb, error) {
	if folderID == "" {
		return nil, nil
	}
	return s.folders.GetFolderPath(ctx, folderID)
}

// Tree mengambil seluruh folder aktif (untuk pohon pindah/salin).
func (s *FolderService) Tree(ctx context.Context) ([]domain.Folder, error) {
	return s.folders.ListAll(ctx)
}

// Create membuat folder baru di bawah parent. Bidang diwarisi dari parent.
func (s *FolderService) Create(ctx context.Context, name string, parentID *string, actorID, actorEmail, ip string) (*domain.Folder, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("Nama folder tidak boleh kosong.")
	}
	bidangID, err := s.BidangIDForParent(ctx, parentID)
	if err != nil {
		return nil, err
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

// Copy menyalin folder beserta seluruh isinya (rekursif) ke target.
func (s *FolderService) Copy(ctx context.Context, id string, targetParentID *string, actorID, actorEmail, ip string) error {
	if targetParentID != nil && id == *targetParentID {
		return errors.New("Tidak dapat menyalin folder ke dalam dirinya sendiri")
	}
	source, err := s.folders.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if source == nil {
		return ErrNotFound
	}
	bidangID, err := s.BidangIDForParent(ctx, targetParentID)
	if err != nil {
		return err
	}
	if err := s.copyFolderRecursive(ctx, source, targetParentID, bidangID, actorID, true); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "INSERT", "Copy Folder ke "+fmt.Sprint(targetParentID), nil, map[string]any{"id": id}, ip)
	return nil
}

// copyFolderRecursive menyalin satu folder dan seluruh isinya.
func (s *FolderService) copyFolderRecursive(ctx context.Context, source *domain.Folder, targetParentID *string, targetBidangID *string, actorID string, isTopLevel bool) error {
	newName := source.Name
	if isTopLevel {
		exists, err := s.folders.ExistsNameAtParent(ctx, newName, targetParentID)
		if err != nil {
			return err
		}
		if exists {
			newName = newName + " - Salinan"
		}
	}

	newFolder, err := s.folders.Create(ctx, newName, targetParentID, targetBidangID, &actorID)
	if err != nil {
		return err
	}

	// Salin file di dalam folder ini.
	files, err := s.files.ListByFolder(ctx, &source.ID)
	if err != nil {
		return err
	}
	for _, f := range files {
		if err := s.copySingleFile(ctx, &f, &newFolder.ID, targetBidangID, actorID, false); err != nil {
			return err
		}
	}

	// Salin subfolder secara rekursif.
	children, err := s.folders.ListByParent(ctx, &source.ID)
	if err != nil {
		return err
	}
	for _, child := range children {
		if err := s.copyFolderRecursive(ctx, &child, &newFolder.ID, targetBidangID, actorID, false); err != nil {
			return err
		}
	}
	return nil
}

// copySingleFile menyalin object R2 dan membuat baris file baru.
func (s *FolderService) copySingleFile(ctx context.Context, source *domain.File, targetFolderID *string, targetBidangID *string, actorID string, isTopLevel bool) error {
	newName := source.Name
	if isTopLevel {
		exists, err := s.files.FindByNameInFolder(ctx, newName, targetFolderID)
		if err != nil {
			return err
		}
		if exists != nil {
			ext := path.Ext(source.Name)
			base := strings.TrimSuffix(source.Name, ext)
			newName = base + " - Salinan" + ext
		}
	}

	// Object key baru: UUID acak + ekstensi (sama seperti perilaku lama).
	newObjectKey := fmt.Sprintf("%s%s", randomObjectID(), path.Ext(source.Name))

	if err := s.r2.CopyObject(ctx, source.R2ObjectKey, newObjectKey); err != nil {
		return err
	}

	_, err := s.files.Create(ctx, &domain.File{
		Name:        newName,
		FolderID:    targetFolderID,
		BidangID:    targetBidangID,
		R2ObjectKey: newObjectKey,
		MimeType:    source.MimeType,
		SizeBytes:   source.SizeBytes,
		UploadedBy:  &actorID,
	})
	return err
}

// BidangIDForParent mengambil bidang dari parent folder (nil jika root).
func (s *FolderService) BidangIDForParent(ctx context.Context, parentID *string) (*string, error) {
	if parentID == nil || *parentID == "" {
		return nil, nil
	}
	return s.folders.GetBidangID(ctx, *parentID)
}

// randomObjectID menghasilkan ID acak untuk object key (setara crypto.randomUUID).
func randomObjectID() string {
	var b [16]byte
	now := time.Now().UnixNano()
	for i := 0; i < 16; i++ {
		b[i] = byte(now >> (i % 8 * 8))
		now = now*6364136223846793005 + 1442695040888963407
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
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

// ListStarred mengambil seluruh folder dan file yang dibintangi.
func (s *FolderService) ListStarred(ctx context.Context) (*FolderContents, error) {
	starredFolders, err := s.folders.ListStarred(ctx)
	if err != nil {
		return nil, err
	}
	starredFiles, err := s.files.ListStarred(ctx)
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