package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
)

// UserRepo mengelola data pengguna pada tabel kemenag_arsip.users.
type UserRepo struct {
	pool *pgxpool.Pool
}

// NewUserRepo membuat instance UserRepo baru.
func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

// GetUserByEmail mengambil satu user berdasarkan alamat email (case-insensitive).
func (r *UserRepo) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, nil
	}

	query := `
		SELECT u.id, u.email, u.username, u.full_name, u.role, u.bidang_id, u.is_active, u.avatar_url,
		       u.created_at, u.updated_at, b.name AS bidang_name
		FROM kemenag_arsip.users u
		LEFT JOIN kemenag_arsip.bidang b ON b.id = u.bidang_id
		WHERE LOWER(u.email) = $1
		LIMIT 1`

	var u domain.User
	var bidangID *string
	var bidangName *string
	var avatarURL *string

	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.Username, &u.FullName, &u.Role,
		&bidangID, &u.IsActive, &avatarURL, &u.CreatedAt, &u.UpdatedAt,
		&bidangName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	u.BidangID = bidangID
	u.BidangName = bidangName
	u.AvatarURL = avatarURL

	return &u, nil
}

// GetUserByID mengambil satu user berdasarkan UUID user.
func (r *UserRepo) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	if len(id) != 36 {
		return nil, nil
	}

	query := `
		SELECT u.id, u.email, u.username, u.full_name, u.role, u.bidang_id, u.is_active, u.avatar_url,
		       u.created_at, u.updated_at, b.name AS bidang_name
		FROM kemenag_arsip.users u
		LEFT JOIN kemenag_arsip.bidang b ON b.id = u.bidang_id
		WHERE u.id = $1::uuid
		LIMIT 1`

	var u domain.User
	var bidangID *string
	var bidangName *string
	var avatarURL *string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.Username, &u.FullName, &u.Role,
		&bidangID, &u.IsActive, &avatarURL, &u.CreatedAt, &u.UpdatedAt,
		&bidangName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	u.BidangID = bidangID
	u.BidangName = bidangName
	u.AvatarURL = avatarURL

	return &u, nil
}

// ListUsers mengambil seluruh pengguna diurutkan Super Admin terlebih dahulu.
func (r *UserRepo) ListUsers(ctx context.Context) ([]domain.User, error) {
	query := `
		SELECT u.id, u.email, u.username, u.full_name, u.role, u.bidang_id, u.is_active, u.avatar_url,
		       u.created_at, u.updated_at, b.name AS bidang_name
		FROM kemenag_arsip.users u
		LEFT JOIN kemenag_arsip.bidang b ON b.id = u.bidang_id
		ORDER BY 
		    CASE WHEN u.role IN ('Super Admin', 'super_admin') THEN 0 ELSE 1 END,
		    u.created_at ASC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]domain.User, 0)
	for rows.Next() {
		var u domain.User
		var bidangID *string
		var bidangName *string
		var avatarURL *string

		if err := rows.Scan(
			&u.ID, &u.Email, &u.Username, &u.FullName, &u.Role,
			&bidangID, &u.IsActive, &avatarURL, &u.CreatedAt, &u.UpdatedAt,
			&bidangName,
		); err != nil {
			return nil, err
		}

		u.BidangID = bidangID
		u.BidangName = bidangName
		u.AvatarURL = avatarURL

		users = append(users, u)
	}

	return users, rows.Err()
}

// CreateUser menambahkan baris baru pada tabel kemenag_arsip.users.
func (r *UserRepo) CreateUser(ctx context.Context, u *domain.User) error {
	query := `
		INSERT INTO kemenag_arsip.users (id, email, username, full_name, role, bidang_id, is_active, avatar_url, updated_at)
		VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7, $8, NOW())
		ON CONFLICT (id) DO UPDATE SET
			email = EXCLUDED.email,
			username = EXCLUDED.username,
			full_name = EXCLUDED.full_name,
			role = EXCLUDED.role,
			bidang_id = EXCLUDED.bidang_id,
			is_active = EXCLUDED.is_active,
			avatar_url = EXCLUDED.avatar_url,
			updated_at = NOW()`

	_, err := r.pool.Exec(ctx, query,
		u.ID,
		strings.ToLower(strings.TrimSpace(u.Email)),
		strings.TrimSpace(u.Username),
		strings.TrimSpace(u.FullName),
		u.Role,
		u.BidangID,
		u.IsActive,
		u.AvatarURL,
	)
	return err
}

// UpdateUser memperbarui profil pengguna di kemenag_arsip.users.
func (r *UserRepo) UpdateUser(ctx context.Context, u *domain.User) error {
	query := `
		UPDATE kemenag_arsip.users
		SET full_name = $2, role = $3, bidang_id = $4::uuid, is_active = $5, avatar_url = $6, updated_at = NOW()
		WHERE id = $1::uuid`

	_, err := r.pool.Exec(ctx, query,
		u.ID,
		strings.TrimSpace(u.FullName),
		u.Role,
		u.BidangID,
		u.IsActive,
		u.AvatarURL,
	)
	return err
}

// DeleteUser menghapus baris pengguna dari kemenag_arsip.users.
func (r *UserRepo) DeleteUser(ctx context.Context, id string) error {
	if len(id) != 36 {
		return errors.New("id tidak valid")
	}
	_, err := r.pool.Exec(ctx, `DELETE FROM kemenag_arsip.users WHERE id = $1::uuid`, id)
	return err
}
