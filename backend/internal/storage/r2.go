// Package storage menangani operasi Cloudflare R2 (presigned URL & streaming).
package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Storage membungkus client S3 yang mengarah ke Cloudflare R2.
type R2Storage struct {
	client *s3.Client
	bucket string
}

// NewR2Storage membuat client R2 dari kredensial akun.
func NewR2Storage(accountID, accessKeyID, secretAccessKey, bucket string) (*R2Storage, error) {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	client := s3.New(s3.Options{
		Region:       "auto",
		BaseEndpoint: aws.String(endpoint),
		UsePathStyle: true,
		Credentials: aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(
			accessKeyID, secretAccessKey, "",
		)),
	})

	// Lakukan verifikasi akses awal ke bucket.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(bucket)}); err != nil {
		// Log sebagai informasi bila token R2 memiliki batasan izin tertentu (misal token khusus presigned).
		fmt.Printf("[STORAGE] Peringatan inisialisasi Cloudflare R2 (%s): %v\n", bucket, err)
	}

	return &R2Storage{client: client, bucket: bucket}, nil
}

// PresignUpload membuat URL PUT presigned untuk upload langsung dari browser.
func (r *R2Storage) PresignUpload(ctx context.Context, key, contentType string, expiresIn time.Duration) (string, error) {
	presigner := s3.NewPresignClient(r.client)
	input := &s3.PutObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	}
	presigned, err := presigner.PresignPutObject(ctx, input, s3.WithPresignExpires(expiresIn))
	if err != nil {
		return "", fmt.Errorf("gagal membuat presigned URL upload: %w", err)
	}
	return presigned.URL, nil
}

// PutObject mengunggah stream objek langsung ke Cloudflare R2.
func (r *R2Storage) PutObject(ctx context.Context, key string, body io.Reader, sizeBytes int64, contentType string) error {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	}
	if sizeBytes > 0 {
		input.ContentLength = aws.Int64(sizeBytes)
	}
	_, err := r.client.PutObject(ctx, input)
	if err != nil {
		return fmt.Errorf("gagal menyimpan objek %s ke R2: %w", key, err)
	}
	return nil
}

// PresignDownload membuat URL GET presigned untuk unduh/pratinjau file.
// downloadName berisi nama file jika ingin disposition attachment.
func (r *R2Storage) PresignDownload(ctx context.Context, key string, downloadName *string, expiresIn time.Duration) (string, error) {
	presigner := s3.NewPresignClient(r.client)
	input := &s3.GetObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	}
	if downloadName != nil && *downloadName != "" {
		input.ResponseContentDisposition = aws.String(fmt.Sprintf(`attachment; filename="%s"`, *downloadName))
	}
	presigned, err := presigner.PresignGetObject(ctx, input, s3.WithPresignExpires(expiresIn))
	if err != nil {
		return "", fmt.Errorf("gagal membuat presigned URL download: %w", err)
	}
	return presigned.URL, nil
}

// OpenObject membuka object R2 untuk dibaca (dipakai saat membuat ZIP di server).
func (r *R2Storage) OpenObject(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := r.GetObject(ctx, key)
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

// GetObject mengambil object beserta metadata (Content-Type, Content-Length).
func (r *R2Storage) GetObject(ctx context.Context, key string) (*s3.GetObjectOutput, error) {
	out, err := r.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil object %s dari R2: %w", key, err)
	}
	return out, nil
}

// CopyObject menyalin object di dalam bucket (dipakai saat menyalin file).
func (r *R2Storage) CopyObject(ctx context.Context, sourceKey, targetKey string) error {
	_, err := r.client.CopyObject(ctx, &s3.CopyObjectInput{
		Bucket:     aws.String(r.bucket),
		CopySource: aws.String(fmt.Sprintf("%s/%s", r.bucket, sourceKey)),
		Key:        aws.String(targetKey),
	})
	if err != nil {
		return fmt.Errorf("gagal menyalin object %s: %w", sourceKey, err)
	}
	return nil
}
