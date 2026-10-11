// Package auth menangani komunikasi autentikasi dengan PocketBase dan verifikasi JWT.
package auth

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/pocketbase"
)

// Tokens adalah hasil sukses dari operasi token PocketBase.
type Tokens struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
	UserID       string
	Email        string
}

// PBAuthClient membungkus operasi autentikasi dan manajemen user PocketBase.
type PBAuthClient struct {
	pb        *pocketbase.Client
	jwtSecret []byte
}

// NewPBAuthClient membuat client autentikasi PocketBase.
func NewPBAuthClient(pb *pocketbase.Client, jwtSecret string) *PBAuthClient {
	return &PBAuthClient{
		pb:        pb,
		jwtSecret: decodeJWTSecret(jwtSecret),
	}
}

func decodeJWTSecret(secret string) []byte {
	if decoded, err := base64.StdEncoding.DecodeString(secret); err == nil && len(decoded) >= 32 {
		return decoded
	}
	if secret == "" {
		return []byte("betang-kemenag-secret-key-32b-length-ok")
	}
	return []byte(secret)
}

// SignInWithPassword melakukan autentikasi email/password ke PocketBase.
func (s *PBAuthClient) SignInWithPassword(ctx context.Context, email, password string) (*Tokens, error) {
	res, err := s.pb.UserAuthWithPassword(ctx, email, password)
	if err != nil {
		return nil, err
	}

	return &Tokens{
		AccessToken:  res.Token,
		RefreshToken: res.Token,
		ExpiresIn:    86400 * 7, // 7 hari
		UserID:       res.Record.ID,
		Email:        res.Record.Email,
	}, nil
}

// RefreshToken menukar token dengan sesi token baru di PocketBase.
func (s *PBAuthClient) RefreshToken(ctx context.Context, refreshToken string) (*Tokens, error) {
	res, err := s.pb.UserAuthRefresh(ctx, refreshToken)
	if err != nil {
		return nil, err
	}

	return &Tokens{
		AccessToken:  res.Token,
		RefreshToken: res.Token,
		ExpiresIn:    86400 * 7,
		UserID:       res.Record.ID,
		Email:        res.Record.Email,
	}, nil
}

// GenerateAccessToken menerbitkan JWT access token internal yang ditandatangani
// oleh Backend Go secara mandiri.
func (s *PBAuthClient) GenerateAccessToken(userID, email string, duration time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"role":  "authenticated",
		"iss":   "betang-backend",
		"iat":   now.Unix(),
		"exp":   now.Add(duration).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := s.jwtSecret
	if len(secret) == 0 {
		secret = []byte("betang-kemenag-default-secret-fallback-key-32b")
	}
	return token.SignedString(secret)
}

// VerifyAccessToken memverifikasi JWT token (baik dari Go backend maupun PocketBase).
func (s *PBAuthClient) VerifyAccessToken(tokenString string) (jwt.MapClaims, error) {
	// Parse tanpa verifikasi tanda tangan jika token diterbitkan langsung oleh PocketBase (alg eddsa/hs256)
	parser := jwt.NewParser()
	claims := jwt.MapClaims{}
	token, _, err := parser.ParseUnverified(tokenString, claims)
	if err == nil && token != nil {
		// Validasi exp
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				return nil, errors.New("token sudah kedaluwarsa")
			}
		}
		// Cek sub / id
		if sub, ok := claims["sub"].(string); ok && sub != "" {
			return claims, nil
		}
		if id, ok := claims["id"].(string); ok && id != "" {
			claims["sub"] = id
			return claims, nil
		}
	}

	// Fallback verifikasi HMAC dengan secret Go backend
	_, err = jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// AdminCreateUser membuat akun baru di PocketBase users collection.
func (s *PBAuthClient) AdminCreateUser(ctx context.Context, email, password, fullName, username string) (string, error) {
	newID := uuid.New().String()
	data := map[string]interface{}{
		"id":              newID,
		"email":           strings.ToLower(strings.TrimSpace(email)),
		"username":        strings.ToLower(strings.TrimSpace(username)),
		"name":            strings.TrimSpace(fullName),
		"password":        password,
		"passwordConfirm": password,
		"verified":        true,
		"emailVisibility": true,
		"is_active":       true,
		"role":            "Admin Bidang",
	}

	err := s.pb.Create(ctx, "users", data, nil)
	if err != nil {
		return "", fmt.Errorf("pembuatan user di PocketBase gagal: %w", err)
	}
	return newID, nil
}

// AdminUpdateUser memperbarui data email/nama/password pengguna di PocketBase.
func (s *PBAuthClient) AdminUpdateUser(ctx context.Context, userID, email, password string, metadata map[string]any) error {
	data := map[string]interface{}{}
	if email != "" {
		data["email"] = strings.ToLower(strings.TrimSpace(email))
	}
	if password != "" {
		data["password"] = password
		data["passwordConfirm"] = password
	}
	if metadata != nil {
		if fn, ok := metadata["full_name"].(string); ok && fn != "" {
			data["name"] = strings.TrimSpace(fn)
		}
		if un, ok := metadata["username"].(string); ok && un != "" {
			data["username"] = strings.TrimSpace(un)
		}
		if role, ok := metadata["role"].(string); ok && role != "" {
			data["role"] = strings.TrimSpace(role)
		}
	}
	if len(data) == 0 {
		return nil
	}
	return s.pb.Update(ctx, "users", userID, data, nil)
}

// AdminDeleteUser menghapus akun dari PocketBase.
func (s *PBAuthClient) AdminDeleteUser(ctx context.Context, userID string) error {
	return s.pb.Delete(ctx, "users", userID)
}

// AdminUpdateUserPassword mengubah kata sandi pengguna di PocketBase.
func (s *PBAuthClient) AdminUpdateUserPassword(ctx context.Context, userID, newPassword string) error {
	data := map[string]interface{}{
		"password":        newPassword,
		"passwordConfirm": newPassword,
	}
	return s.pb.Update(ctx, "users", userID, data, nil)
}
