package service

import (
	"context"
	"errors"
	"fmt"
	"io"
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

// DirectUpload mengunggah file langsung ke Cloudflare R2 via backend dan menyimpan metadata ke DB.
func (s *FileService) DirectUpload(ctx context.Context, name string, folderID *string, body io.Reader, sizeBytes int64, mimeType string, actorID, actorEmail, ip string, userBidangID *string) (*domain.File, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("Nama file tidak boleh kosong.")
	}

	cleanName := sanitizeFileName(name)
	timestamp := time.Now().UnixNano() / int64(time.Millisecond)
	folderSegment := "root"
	if folderID != nil && *folderID != "" && *folderID != "root" {
		folderSegment = *folderID
	}
	bidangSegment := "global"
	if userBidangID != nil && *userBidangID != "" {
		bidangSegment = *userBidangID
	}
	key := fmt.Sprintf("arsip/%s/%s/%d-%s", bidangSegment, folderSegment, timestamp, cleanName)

	if err := s.r2.PutObject(ctx, key, body, sizeBytes, mimeType); err != nil {
		return nil, fmt.Errorf("Gagal menyimpan ke Cloudflare R2: %w", err)
	}

	return s.SaveMetadata(ctx, name, folderID, key, mimeType, sizeBytes, actorID, actorEmail, ip, userBidangID)
}

// SaveMetadata menyimpan metadata file setelah upload ke R2 selesai.
// Bila nama yang sama sudah ada di folder yang sama, file lama disimpan
// sebagai versi dan metadata diperbarui.
func (s *FileService) SaveMetadata(ctx context.Context, name string, folderID *string, objectKey, mimeType string, sizeBytes int64, actorID, actorEmail, ip string, userBidangID *string) (*domain.File, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("Nama file tidak boleh kosong.")
	}

	bidangID, err := s.BidangIDForFolder(ctx, folderID)
	if err != nil {
		return nil, err
	}
	if bidangID == nil && userBidangID != nil && *userBidangID != "" {
		bidangID = userBidangID
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

// BidangIDForFolder mengambil bidang dari folder parent (nil jika root).
func (s *FileService) BidangIDForFolder(ctx context.Context, folderID *string) (*string, error) {
	if folderID == nil || *folderID == "" {
		return nil, nil
	}
	return s.folders.GetBidangID(ctx, *folderID)
}