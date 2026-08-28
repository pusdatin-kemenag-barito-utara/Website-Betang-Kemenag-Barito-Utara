package service

import (
	"archive/zip"
	"context"
	"io"
	"path"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

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

// sanitizeZipPath memastikan path aman di dalam arsip ZIP.
func sanitizeZipPath(p string) string {
	p = strings.ReplaceAll(p, "\\", "/")
	p = strings.TrimPrefix(p, "/")
	if strings.Contains(p, "..") {
		return path.Base(p)
	}
	return p
}
