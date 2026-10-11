package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// PusdatinRepo mengelola audit log dan data user pusdatin di PocketBase.
type PusdatinRepo struct {
	pb *pocketbase.Client
}

// NewPusdatinRepo membuat instance PusdatinRepo baru.
func NewPusdatinRepo(pb *pocketbase.Client) *PusdatinRepo {
	return &PusdatinRepo{pb: pb}
}

// GetUserByEmail mengambil data user dari sistem pusdatin / pocketbase.
func (r *PusdatinRepo) GetUserByEmail(ctx context.Context, email string) (*domain.PusdatinUser, error) {
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

	u := list[0]
	return &domain.PusdatinUser{
		ID:     u.ID,
		Name:   u.Name,
		Email:  u.Email,
		Role:   u.Role,
		Status: "active",
	}, nil
}

// LogAudit mencatat aktivitas pengguna ke tabel audit_logs PocketBase.
func (r *PusdatinRepo) LogAudit(ctx context.Context, action, target, targetSchema, performedBy string, beforeState, afterState any, ip string) error {
	data := map[string]interface{}{
		"id":            uuid.New().String(),
		"action":        action,
		"target":        target,
		"target_schema": targetSchema,
		"performed_by":  performedBy,
		"before_state":  beforeState,
		"after_state":   afterState,
		"ip":            ip,
		"created_at":    time.Now().Format(time.RFC3339Nano),
	}
	_ = r.pb.Create(ctx, "audit_logs", data, nil)
	return nil
}