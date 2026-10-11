package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

type pbFileVersion struct {
	ID          string `json:"id"`
	FileID      string `json:"file_id"`
	R2ObjectKey string `json:"r2_object_key"`
	SizeBytes   int64  `json:"size_bytes"`
	UploadedBy  string `json:"uploaded_by"`
	CreatedAt   string `json:"created_at"`
	Created     string `json:"created"`
}

func (v *pbFileVersion) toDomain() domain.FileVersion {
	var upBy *string
	if v.UploadedBy != "" {
		upBy = &v.UploadedBy
	}

	t, _ := time.Parse(time.RFC3339Nano, v.CreatedAt)
	if t.IsZero() {
		t, _ = time.Parse(time.RFC3339Nano, v.Created)
	}

	return domain.FileVersion{
		ID:          v.ID,
		FileID:      v.FileID,
		R2ObjectKey: v.R2ObjectKey,
		SizeBytes:   v.SizeBytes,
		UploadedBy:  upBy,
		CreatedAt:   t,
	}
}

// ListVersions mengambil riwayat versi sebuah file beserta nama pengunggah.
func (r *FileRepo) ListVersions(ctx context.Context, fileID string) ([]domain.FileVersion, error) {
	var records []pbFileVersion
	_, err := r.pb.List(ctx, "file_versions", pocketbase.ListParams{
		Filter:  fmt.Sprintf(`file_id = "%s"`, fileID),
		Sort:    "-created_at",
		PerPage: 100,
	}, &records)
	if err != nil {
		return []domain.FileVersion{}, nil
	}

	items := make([]domain.FileVersion, len(records))
	for i, rec := range records {
		items[i] = rec.toDomain()
	}
	return items, nil
}

// InsertVersion mencatat versi baru dari sebuah file.
func (r *FileRepo) InsertVersion(ctx context.Context, fileID, objectKey string, sizeBytes int64, uploadedBy *string) error {
	now := time.Now().Format(time.RFC3339Nano)
	data := map[string]interface{}{
		"id":            uuid.New().String(),
		"file_id":       fileID,
		"r2_object_key": objectKey,
		"size_bytes":    sizeBytes,
		"created_at":    now,
	}
	if uploadedBy != nil {
		data["uploaded_by"] = *uploadedBy
	}
	return r.pb.Create(ctx, "file_versions", data, nil)
}

// GetVersionByID mengambil satu versi file.
func (r *FileRepo) GetVersionByID(ctx context.Context, versionID string) (*domain.FileVersion, error) {
	var rec pbFileVersion
	err := r.pb.Get(ctx, "file_versions", versionID, &rec)
	if err != nil {
		if errors.Is(err, pocketbase.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	d := rec.toDomain()
	return &d, nil
}
