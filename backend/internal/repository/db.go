// Package repository berisi lapisan akses data PostgreSQL (pgx).
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repos mengumpulkan seluruh repository dalam satu struct agar mudah
// di-inject ke lapisan service.
type Repos struct {
	Bidang   *BidangRepo
	Folder   *FolderRepo
	File     *FileRepo
	Trash    *TrashRepo
	Settings *SettingsRepo
	Pusdatin *PusdatinRepo
	Storage  *StorageRepo

	Pool *pgxpool.Pool
}

// Connect membuat koneksi pool ke PostgreSQL dengan search_path yang benar.
// searchPath berisi daftar schema dipisahkan koma, contoh:
// "kemenag_arsip, kemenag_pusdatin, public".
func Connect(ctx context.Context, databaseURL, searchPath string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL gagal: %w", err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = searchPath

	// Kompatibilitas Supabase Connection Pooler / PgBouncer:
	// Gunakan Simple Protocol agar tidak membuat prepared statement (mencegah SQLSTATE 26000 / 42P05).
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	cfg.ConnConfig.StatementCacheCapacity = 0
	cfg.ConnConfig.DescriptionCacheCapacity = 0

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("membuat pool gagal: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database gagal: %w", err)
	}
	return pool, nil
}

// New membuat seluruh repository dari pool yang sama.
// pusdatinSchema adalah schema tempat fungsi get_pusdatin_user berada.
func New(pool *pgxpool.Pool, pusdatinSchema string) *Repos {
	return &Repos{
		Bidang:   &BidangRepo{pool: pool},
		Folder:   &FolderRepo{pool: pool},
		File:     &FileRepo{pool: pool},
		Trash:    &TrashRepo{pool: pool},
		Settings: &SettingsRepo{pool: pool},
		Pusdatin: &PusdatinRepo{pool: pool, schema: pusdatinSchema},
		Storage:  &StorageRepo{pool: pool},
		Pool:     pool,
	}
}
