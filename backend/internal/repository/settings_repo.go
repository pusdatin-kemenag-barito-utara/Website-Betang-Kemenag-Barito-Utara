package repository

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// SettingsRepo mengakses tabel kemenag_arsip.app_settings dengan in-memory cache.
type SettingsRepo struct {
	pool       *pgxpool.Pool
	cached     *domain.AppSettings
	cachedTime time.Time
	mu         sync.RWMutex
}

// NewSettingsRepo membuat instance SettingsRepo baru.
func NewSettingsRepo(pool *pgxpool.Pool) *SettingsRepo {
	return &SettingsRepo{pool: pool}
}

// Get mengambil pengaturan aplikasi (baris tunggal id = 1) dengan in-memory cache (30s TTL).
func (r *SettingsRepo) Get(ctx context.Context) (*domain.AppSettings, error) {
	r.mu.RLock()
	if r.cached != nil && time.Since(r.cachedTime) < 30*time.Second {
		cachedCopy := *r.cached
		r.mu.RUnlock()
		return &cachedCopy, nil
	}
	r.mu.RUnlock()

	var s domain.AppSettings
	err := r.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(disable_right_click, true),
			COALESCE(disable_print_shortcut, false),
			COALESCE(enable_watermark, false),
			COALESCE(max_upload_size_mb, 100),
			COALESCE(default_share_expiry_hours, 24),
			COALESCE(default_pdf_viewer_mode, 'iframe')
		FROM kemenag_arsip.app_settings WHERE id = 1`).Scan(
		&s.DisableRightClick,
		&s.DisablePrintShortcut,
		&s.EnableWatermark,
		&s.MaxUploadSizeMB,
		&s.DefaultShareExpiryHours,
		&s.DefaultPdfViewerMode,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		s = domain.AppSettings{
			DisableRightClick:       true,
			DisablePrintShortcut:    false,
			EnableWatermark:         false,
			MaxUploadSizeMB:         100,
			DefaultShareExpiryHours: 24,
			DefaultPdfViewerMode:    "iframe",
		}
	} else if err != nil {
		return nil, err
	}

	r.mu.Lock()
	r.cached = &s
	r.cachedTime = time.Now()
	r.mu.Unlock()

	return &s, nil
}

// Update menyimpan pengaturan aplikasi (upsert baris id = 1) dan menginvalidasi cache.
func (r *SettingsRepo) Update(ctx context.Context, settings domain.AppSettings) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO kemenag_arsip.app_settings (
			id, disable_right_click, disable_print_shortcut, enable_watermark, 
			max_upload_size_mb, default_share_expiry_hours, default_pdf_viewer_mode, updated_at
		)
		VALUES (1, $1, $2, $3, $4, $5, $6, now())
		ON CONFLICT (id) DO UPDATE SET 
			disable_right_click = $1,
			disable_print_shortcut = $2,
			enable_watermark = $3,
			max_upload_size_mb = $4,
			default_share_expiry_hours = $5,
			default_pdf_viewer_mode = $6,
			updated_at = now()`,
		settings.DisableRightClick,
		settings.DisablePrintShortcut,
		settings.EnableWatermark,
		settings.MaxUploadSizeMB,
		settings.DefaultShareExpiryHours,
		settings.DefaultPdfViewerMode,
	)
	if err != nil {
		return err
	}

	r.mu.Lock()
	r.cached = &settings
	r.cachedTime = time.Now()
	r.mu.Unlock()

	return nil
}