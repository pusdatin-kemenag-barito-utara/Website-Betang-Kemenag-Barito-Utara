package service

import (
	"context"
	"fmt"
	"path"
	"strings"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

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

// sanitizeFileName membersihkan nama file dari karakter khusus untuk R2 object key.
func sanitizeFileName(name string) string {
	var b strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	res := b.String()
	if len(res) > 60 {
		return res[:60]
	}
	return res
}
