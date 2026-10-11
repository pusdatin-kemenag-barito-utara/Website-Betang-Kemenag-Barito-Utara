package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// UserRepo mengelola data pengguna pada koleksi users di PocketBase.
type UserRepo struct {
	pb *pocketbase.Client
}

// NewUserRepo membuat instance UserRepo baru.
func NewUserRepo(pb *pocketbase.Client) *UserRepo {
	return &UserRepo{pb: pb}
}

// GetUserByEmail mengambil satu user berdasarkan alamat email (case-insensitive).
func (r *UserRepo) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, nil
	}

	var list []pocketbase.AuthRecord
	_, err := r.pb.List(ctx, "users", pocketbase.ListParams{
		Filter:  fmt.Sprintf(`email = "%s"`, email),
		PerPage: 1,
	}, &list)
	if err != nil || len(list) == 0 {
		return nil, err
	}

	u := list[0].ToDomainUser()
	if u.BidangID != nil && *u.BidangID != "" {
		var b pbBidang
		if err := r.pb.Get(ctx, "bidang", *u.BidangID, &b); err == nil {
			u.BidangName = &b.Name
		}
	}
	return u, nil
}

// GetUserByID mengambil satu user berdasarkan UUID user.
func (r *UserRepo) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	if strings.TrimSpace(id) == "" {
		return nil, nil
	}

	var rec pocketbase.AuthRecord
	err := r.pb.Get(ctx, "users", id, &rec)
	if err != nil {
		if errors.Is(err, pocketbase.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}

	u := rec.ToDomainUser()
	if u.BidangID != nil && *u.BidangID != "" {
		var b pbBidang
		if err := r.pb.Get(ctx, "bidang", *u.BidangID, &b); err == nil {
			u.BidangName = &b.Name
		}
	}
	return u, nil
}

// ListUsers mengambil seluruh pengguna diurutkan Super Admin terlebih dahulu.
func (r *UserRepo) ListUsers(ctx context.Context) ([]domain.User, error) {
	var records []pocketbase.AuthRecord
	_, err := r.pb.List(ctx, "users", pocketbase.ListParams{
		Sort:    "-role,name",
		PerPage: 500,
	}, &records)
	if err != nil {
		return nil, err
	}

	// Ambil bidang untuk lookup nama
	var bidangs []pbBidang
	_, _ = r.pb.List(ctx, "bidang", pocketbase.ListParams{PerPage: 500}, &bidangs)
	bidangMap := make(map[string]string)
	for _, b := range bidangs {
		bidangMap[b.ID] = b.Name
	}

	users := make([]domain.User, len(records))
	for i, rec := range records {
		u := rec.ToDomainUser()
		if u.BidangID != nil {
			if name, ok := bidangMap[*u.BidangID]; ok {
				u.BidangName = &name
			}
		}
		users[i] = *u
	}
	return users, nil
}

// CreateUser menambahkan atau memperbarui data pengguna di PocketBase.
func (r *UserRepo) CreateUser(ctx context.Context, u *domain.User) error {
	data := map[string]interface{}{
		"email":           strings.ToLower(strings.TrimSpace(u.Email)),
		"username":        strings.TrimSpace(u.Username),
		"name":            strings.TrimSpace(u.FullName),
		"role":            u.Role,
		"is_active":       u.IsActive,
		"emailVisibility": true,
		"verified":        true,
	}
	if u.ID != "" {
		data["id"] = u.ID
	}
	if u.BidangID != nil {
		data["bidang_id"] = *u.BidangID
	}
	if u.AvatarURL != nil {
		data["avatar_url"] = *u.AvatarURL
	}

	// Cek apakah sudah ada berdasarkan ID
	if u.ID != "" {
		var existing pocketbase.AuthRecord
		if err := r.pb.Get(ctx, "users", u.ID, &existing); err == nil {
			return r.pb.Update(ctx, "users", u.ID, data, nil)
		}
	}

	// Jika baru, berikan password default
	data["password"] = "@Kemenag_126"
	data["passwordConfirm"] = "@Kemenag_126"
	return r.pb.Create(ctx, "users", data, nil)
}

// UpdateUser memperbarui profil pengguna di PocketBase.
func (r *UserRepo) UpdateUser(ctx context.Context, u *domain.User) error {
	data := map[string]interface{}{
		"name":      strings.TrimSpace(u.FullName),
		"role":      u.Role,
		"is_active": u.IsActive,
	}
	if u.BidangID != nil {
		data["bidang_id"] = *u.BidangID
	} else {
		data["bidang_id"] = ""
	}
	if u.AvatarURL != nil {
		data["avatar_url"] = *u.AvatarURL
	}
	return r.pb.Update(ctx, "users", u.ID, data, nil)
}

// DeleteUser menghapus pengguna dari PocketBase.
func (r *UserRepo) DeleteUser(ctx context.Context, id string) error {
	return r.pb.Delete(ctx, "users", id)
}
