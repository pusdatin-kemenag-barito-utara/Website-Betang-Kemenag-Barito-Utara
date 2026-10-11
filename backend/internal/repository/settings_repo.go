package repository

import (
	"context"
	"sync"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// SettingsRepo mengakses tabel app_settings di PocketBase dengan in-memory cache.
type SettingsRepo struct {
	pb         *pocketbase.Client
	cached     *domain.AppSettings
	cachedTime time.Time
	mu         sync.RWMutex
}

// NewSettingsRepo membuat instance SettingsRepo baru.
func NewSettingsRepo(pb *pocketbase.Client) *SettingsRepo {
	return &SettingsRepo{pb: pb}
}

type pbAppSettings struct {
	ID                      string `json:"id"`
	DisableRightClick       bool   `json:"disable_right_click"`
	DisablePrintShortcut    bool   `json:"disable_print_shortcut"`
	EnableWatermark         bool   `json:"enable_watermark"`
	MaxUploadSizeMB         int    `json:"max_upload_size_mb"`
	DefaultShareExpiryHours int    `json:"default_share_expiry_hours"`
	DefaultPdfViewerMode    string `json:"default_pdf_viewer_mode"`
	UpdatedAt               string `json:"updated_at"`
}

func (s *pbAppSettings) toDomain() domain.AppSettings {
	maxUpload := s.MaxUploadSizeMB
	if maxUpload <= 0 {
		maxUpload = 100
	}
	shareHours := s.DefaultShareExpiryHours
	if shareHours <= 0 {
		shareHours = 24
	}
	pdfMode := s.DefaultPdfViewerMode
	if pdfMode == "" {
		pdfMode = "iframe"
	}

	return domain.AppSettings{
		DisableRightClick:       s.DisableRightClick,
		DisablePrintShortcut:    s.DisablePrintShortcut,
		EnableWatermark:         s.EnableWatermark,
		MaxUploadSizeMB:         maxUpload,
		DefaultShareExpiryHours: shareHours,
		DefaultPdfViewerMode:    pdfMode,
	}
}

// Get mengambil pengaturan aplikasi (id = 1) dengan in-memory cache (30s TTL).
func (r *SettingsRepo) Get(ctx context.Context) (*domain.AppSettings, error) {
	r.mu.RLock()
	if r.cached != nil && time.Since(r.cachedTime) < 30*time.Second {
		cachedCopy := *r.cached
		r.mu.RUnlock()
		return &cachedCopy, nil
	}
	r.mu.RUnlock()

	var rec pbAppSettings
	err := r.pb.Get(ctx, "app_settings", "1", &rec)
	if err != nil {
		// Fallback default
		def := domain.AppSettings{
			DisableRightClick:       true,
			DisablePrintShortcut:    false,
			EnableWatermark:         false,
			MaxUploadSizeMB:         100,
			DefaultShareExpiryHours: 24,
			DefaultPdfViewerMode:    "iframe",
		}
		return &def, nil
	}

	d := rec.toDomain()

	r.mu.Lock()
	r.cached = &d
	r.cachedTime = time.Now()
	r.mu.Unlock()

	return &d, nil
}

// Update memperbarui baris tunggal pengaturan aplikasi.
func (r *SettingsRepo) Update(ctx context.Context, s domain.AppSettings) error {
	data := map[string]interface{}{
		"disable_right_click":        s.DisableRightClick,
		"disable_print_shortcut":     s.DisablePrintShortcut,
		"enable_watermark":          s.EnableWatermark,
		"max_upload_size_mb":         s.MaxUploadSizeMB,
		"default_share_expiry_hours": s.DefaultShareExpiryHours,
		"default_pdf_viewer_mode":    s.DefaultPdfViewerMode,
		"updated_at":                 time.Now().Format(time.RFC3339Nano),
	}

	err := r.pb.Update(ctx, "app_settings", "1", data, nil)
	if err != nil {
		data["id"] = "1"
		_ = r.pb.Create(ctx, "app_settings", data, nil)
	}

	r.mu.Lock()
	r.cached = &s
	r.cachedTime = time.Now()
	r.mu.Unlock()

	return nil
}