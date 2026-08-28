package service

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/storage"
)

// FileService menangani operasi khusus file: metadata, presigned URL,
// versi file, dan unduhan ZIP.
type FileService struct {
	files   *repository.FileRepo
	folders *repository.FolderRepo
	r2      *storage.R2Storage
	audits  *Services
}

// PresignUpload membuat URL PUT presigned untuk upload langsung ke R2.
// Object key tetap ditentukan oleh client (seperti perilaku lama).
func (s *FileService) PresignUpload(ctx context.Context, objectKey, contentType string) (string, error) {
	if objectKey == "" {
		return "", errors.New("object key tidak valid")
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	return s.r2.PresignUpload(ctx, objectKey, contentType, time.Hour)
}

// SaveMetadata menyimpan metadata file setelah upload ke R2 selesai.
// Bila nama yang sama sudah ada di folder yang sama, file lama disimpan
// sebagai versi dan metadata diperbarui.
func (s *FileService) SaveMetadata(ctx context.Context, name string, folderID *string, objectKey, mimeType string, sizeBytes int64, actorID, actorEmail, ip string) (*domain.File, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("Nama file tidak boleh kosong.")
	}

	bidangID, err := s.BidangIDForFolder(ctx, folderID)
	if err != nil {
		return nil, err
	}

	existing, err := s.files.FindByNameInFolder(ctx, name, folderID)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		// Simpan file saat ini sebagai versi, lalu perbarui metadata.
		if err := s.files.InsertVersion(ctx, existing.ID, existing.R2ObjectKey, existing.SizeBytes, &actorID); err != nil {
			return nil, err
		}
		if err := s.files.UpdateObjectKey(ctx, existing.ID, objectKey, mimeType, sizeBytes, &actorID); err != nil {
			return nil, err
		}
		updated, err := s.files.GetByID(ctx, existing.ID)
		if err != nil {
			return nil, err
		}
		InvalidateFolderCache()
		_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "File: "+name, existing, updated, ip)
		return updated, nil
	}

	created, err := s.files.Create(ctx, &domain.File{
		Name:        name,
		FolderID:    folderID,
		BidangID:    bidangID,
		R2ObjectKey: objectKey,
		MimeType:    mimeType,
		SizeBytes:   sizeBytes,
		UploadedBy:  &actorID,
	})
	if err != nil {
		return nil, err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "INSERT", "File: "+name, nil, created, ip)
	return created, nil
}

// PresignDownload membuat URL GET presigned; tanpa nama berarti inline (pratinjau).
func (s *FileService) PresignDownload(ctx context.Context, objectKey string, downloadName *string) (string, error) {
	return s.r2.PresignDownload(ctx, objectKey, downloadName, time.Hour)
}

// GetObjectStream mengambil stream object langsung dari R2.
func (s *FileService) GetObjectStream(ctx context.Context, objectKey string) (*s3.GetObjectOutput, error) {
	return s.r2.GetObject(ctx, objectKey)
}

// Versions mengambil riwayat versi sebuah file.
func (s *FileService) Versions(ctx context.Context, fileID string) ([]domain.FileVersion, error) {
	return s.files.ListVersions(ctx, fileID)
}

// RestoreVersion mengembalikan file ke versi tertentu (versi saat ini
// disimpan lebih dulu sebagai versi baru).
func (s *FileService) RestoreVersion(ctx context.Context, fileID, versionID string, actorID, actorEmail, ip string) error {
	version, err := s.files.GetVersionByID(ctx, versionID)
	if err != nil {
		return err
	}
	if version == nil {
		return ErrNotFound
	}
	current, err := s.files.GetByID(ctx, fileID)
	if err != nil {
		return err
	}
	if current == nil {
		return ErrNotFound
	}

	if err := s.files.InsertVersion(ctx, current.ID, current.R2ObjectKey, current.SizeBytes, &actorID); err != nil {
		return err
	}
	if err := s.files.UpdateObjectKey(ctx, fileID, version.R2ObjectKey, current.MimeType, version.SizeBytes, &actorID); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Restore File Version untuk file ID: "+fileID, nil, map[string]any{"version_id": versionID}, ip)
	return nil
}

// DownloadItems menyusun daftar file yang harus dimasukkan ke ZIP.
func (s *FileService) DownloadItems(ctx context.Context, items []domain.DownloadFileRequest) ([]domain.DownloadFile, error) {
	result := []domain.DownloadFile{}
	for _, item := range items {
		if item.Type == "file" {
			f, err := s.files.GetByID(ctx, item.ID)
			if err != nil {
				return nil, err
			}
			if f == nil {
				continue
			}
			result = append(result, domain.DownloadFile{R2ObjectKey: f.R2ObjectKey, Path: f.Name})
		} else if item.Type == "folder" {
			nested, err := s.folders.GetAllFilesInFolder(ctx, item.ID)
			if err != nil {
				return nil, err
			}
			result = append(result, nested...)
		}
	}
	return result, nil
}

// ZipDownload menuliskan seluruh file ke dalam satu arsip ZIP yang di-stream
// langsung ke writer. Menggantikan pendekatan lama (JSZip di browser).
func (s *FileService) ZipDownload(ctx context.Context, items []domain.DownloadFileRequest, w io.Writer) error {
	files, err := s.DownloadItems(ctx, items)
	if err != nil {
		return err
	}

	zw := zip.NewWriter(w)
	for _, f := range files {
		rc, err := s.r2.OpenObject(ctx, f.R2ObjectKey)
		if err != nil {
			continue // file mungkin sudah tidak ada di R2; lewati.
		}
		header := &zip.FileHeader{
			Name:   sanitizeZipPath(f.Path),
			Method: zip.Deflate,
		}
		header.SetModTime(time.Now())
		entry, err := zw.CreateHeader(header)
		if err != nil {
			rc.Close()
			return err
		}
		if _, err := io.Copy(entry, rc); err != nil {
			rc.Close()
			return err
		}
		rc.Close()
	}
	return zw.Close()
}

// Rename mengganti nama file.
func (s *FileService) Rename(ctx context.Context, id, newName, actorEmail, ip string) error {
	newName = strings.TrimSpace(newName)
	if newName == "" {
		return errors.New("Nama file tidak boleh kosong.")
	}
	if err := s.files.Rename(ctx, id, newName); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Rename File ke "+newName, nil, map[string]any{"id": id, "name": newName}, ip)
	return nil
}

// Move memindahkan file ke folder lain.
func (s *FileService) Move(ctx context.Context, id string, targetFolderID *string, actorEmail, ip string) error {
	if err := s.files.UpdateFolder(ctx, id, targetFolderID); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "UPDATE", "Move File ke folder "+fmtTarget(targetFolderID), nil, map[string]any{"id": id}, ip)
	return nil
}

// SoftDelete menandai file sebagai terhapus (soft delete).
func (s *FileService) SoftDelete(ctx context.Context, id, actorEmail, ip string) error {
	if err := s.files.SoftDelete(ctx, id); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "DELETE", "File ID: "+id, nil, nil, ip)
	return nil
}

// Copy menyalin file ke folder lain (object R2 ikut disalin).
func (s *FileService) Copy(ctx context.Context, id string, targetFolderID *string, actorID, actorEmail, ip string) error {
	source, err := s.files.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if source == nil {
		return ErrNotFound
	}
	if err := s.copyFile(ctx, source, targetFolderID, true, actorID); err != nil {
		return err
	}
	InvalidateFolderCache()
	_ = s.audits.LogAudit(ctx, actorEmail, "INSERT", "Copy File ke folder "+fmtTarget(targetFolderID), nil, map[string]any{"id": id}, ip)
	return nil
}

// copyFile menyalin satu object R2 dan membuat baris file baru.
func (s *FileService) copyFile(ctx context.Context, source *domain.File, targetFolderID *string, isTopLevel bool, actorID string) error {
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

	newObjectKey := fmt.Sprintf("%s%s", randomObjectID(), path.Ext(source.Name))
	if err := s.r2.CopyObject(ctx, source.R2ObjectKey, newObjectKey); err != nil {
		return err
	}

	bidangID, err := s.BidangIDForFolder(ctx, targetFolderID)
	if err != nil {
		return err
	}

	_, err = s.files.Create(ctx, &domain.File{
		Name:        newName,
		FolderID:    targetFolderID,
		BidangID:    bidangID,
		R2ObjectKey: newObjectKey,
		MimeType:    source.MimeType,
		SizeBytes:   source.SizeBytes,
		UploadedBy:  &actorID,
	})
	return err
}

func fmtTarget(target *string) string {
	if target == nil || *target == "" {
		return "root"
	}
	return *target
}

// BidangIDForFolder mengambil bidang dari folder parent (nil jika root).
func (s *FileService) BidangIDForFolder(ctx context.Context, folderID *string) (*string, error) {
	if folderID == nil || *folderID == "" {
		return nil, nil
	}
	return s.folders.GetBidangID(ctx, *folderID)
}

// sanitizeZipPath memastikan path aman di dalam arsip ZIP.
func sanitizeZipPath(p string) string {
	p = strings.ReplaceAll(p, "\\", "/")
	p = strings.TrimPrefix(p, "/")
	if strings.Contains(p, "..") {
		return path.Base(p)
	}
	return p
}

// Stats menghitung ringkasan statistik dashboard.
func (s *FileService) Stats(ctx context.Context) (*domain.DashboardStats, error) {
	totalFiles, totalStorage, recent24h, thisMonth, recent, err := s.files.Stats(ctx)
	if err != nil {
		return nil, err
	}
	return &domain.DashboardStats{
		TotalFiles:     totalFiles,
		TotalStorage:   totalStorage,
		Recent24hCount: recent24h,
		ThisMonthCount: thisMonth,
		RecentUploads:  recent,
	}, nil
}

// ToggleStar mengubah status bintang sebuah file.
func (s *FileService) ToggleStar(ctx context.Context, fileID string, isStarred bool) error {
	return s.files.ToggleStar(ctx, fileID, isStarred)
}

// GenerateShareLink membuat tautan unduh/pratinjau presigned dengan durasi kustom (misal: 1h, 24h, 7d).
func (s *FileService) GenerateShareLink(ctx context.Context, fileID string, expiryDuration time.Duration) (string, error) {
	f, err := s.files.GetByID(ctx, fileID)
	if err != nil {
		return "", err
	}
	if f == nil {
		return "", ErrNotFound
	}
	return s.r2.PresignDownload(ctx, f.R2ObjectKey, &f.Name, expiryDuration)
}