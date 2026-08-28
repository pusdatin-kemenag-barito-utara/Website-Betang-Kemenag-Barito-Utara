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
		SELECT disable_right_click FROM kemenag_arsip.app_settings WHERE id = 1`).Scan(&s.DisableRightClick)
	if errors.Is(err, pgx.ErrNoRows) {
		s = domain.AppSettings{DisableRightClick: false}
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
func (r *SettingsRepo) Update(ctx context.Context, disableRightClick bool) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO kemenag_arsip.app_settings (id, disable_right_click, updated_at)
		VALUES (1, $1, now())
		ON CONFLICT (id) DO UPDATE SET disable_right_click = $1, updated_at = now()`,
		disableRightClick)
	if err != nil {
		return err
	}

	r.mu.Lock()
	r.cached = &domain.AppSettings{DisableRightClick: disableRightClick}
	r.cachedTime = time.Now()
	r.mu.Unlock()

	return nil
}