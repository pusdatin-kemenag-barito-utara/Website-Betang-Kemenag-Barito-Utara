package service

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

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
