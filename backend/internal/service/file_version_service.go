package service

import (
	"context"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

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
