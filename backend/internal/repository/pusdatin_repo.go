package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

type cachedPusdatinUser struct {
	user      *domain.PusdatinUser
	expiresAt time.Time
}

// PusdatinRepo mengakses fungsi RPC pada schema kemenag_pusdatin dan public.
type PusdatinRepo struct {
	pool      *pgxpool.Pool
	schema    string
	userCache sync.Map
}

// NewPusdatinRepo membuat instance PusdatinRepo baru.
func NewPusdatinRepo(pool *pgxpool.Pool, schema string) *PusdatinRepo {
	return &PusdatinRepo{
		pool:   pool,
		schema: schema,
	}
}

// GetUserByEmail mengambil data user dari sistem pusdatin via RPC dengan cache 30s.
func (r *PusdatinRepo) GetUserByEmail(ctx context.Context, email string) (*domain.PusdatinUser, error) {
	if val, ok := r.userCache.Load(email); ok {
		item := val.(cachedPusdatinUser)
		if time.Now().Before(item.expiresAt) {
			return item.user, nil
		}
		r.userCache.Delete(email)
	}

	var raw string
	err := r.pool.QueryRow(ctx, `SELECT COALESCE(public.get_pusdatin_user($1)::text, '')`, email).Scan(&raw)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("gagal memanggil get_pusdatin_user: %w", err)
	}

	if raw == "" || raw == "{}" || raw == "null" {
		return nil, nil
	}

	var user domain.PusdatinUser
	if err := json.Unmarshal([]byte(raw), &user); err != nil {
		return nil, fmt.Errorf("respon get_pusdatin_user tidak valid: %w", err)
	}
	if user.ID == "" {
		return nil, nil
	}

	r.userCache.Store(email, cachedPusdatinUser{
		user:      &user,
		expiresAt: time.Now().Add(30 * time.Second),
	})

	return &user, nil
}

// LogAudit mencatat aktivitas pengguna ke tabel audit pusdatin
// (RPC public.log_pusdatin_audit).
func (r *PusdatinRepo) LogAudit(ctx context.Context, action, target, targetSchema, performedBy string, beforeState, afterState any, ip string) error {
	query := `
		SELECT public.log_pusdatin_audit(
			$1::text, $2::text, $3::text, $4::text,
			$5::jsonb, $6::jsonb, $7::inet
		)`
	var ipArg any
	if ip != "" {
		ipArg = ip
	}
	_, err := r.pool.Exec(ctx, query,
		action, target, targetSchema, performedBy, beforeState, afterState, ipArg)
	return err
}