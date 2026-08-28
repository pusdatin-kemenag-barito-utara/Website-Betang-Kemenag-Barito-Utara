// Package auth menangani komunikasi dengan Supabase Auth dan verifikasi JWT.
// Supabase tetap menjadi issuer token; aplikasi hanya memverifikasi dan
// mengelola siklus hidup sesi (login, refresh, logout).
package auth

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Tokens adalah hasil sukses dari operasi token Supabase.
type Tokens struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
	UserID       string
	Email        string
}

// SupabaseClient membungkus REST API Supabase Auth.
type SupabaseClient struct {
	url       string
	anonKey   string
	jwtSecret []byte
	http      *http.Client
}

// NewSupabaseClient membuat client Supabase Auth.
// jwtSecret dapat berupa base64 (encode 32 byte) atau plain text.
func NewSupabaseClient(url, anonKey, jwtSecret string) *SupabaseClient {
	return &SupabaseClient{
		url:       url,
		anonKey:   anonKey,
		jwtSecret: decodeJWTSecret(jwtSecret),
		http:      &http.Client{Timeout: 15 * time.Second},
	}
}

// decodeJWTSecret mencoba mendekode base64 terlebih dahulu; jika gagal,
// gunakan secret apa adanya.
func decodeJWTSecret(secret string) []byte {
	if decoded, err := base64.StdEncoding.DecodeString(secret); err == nil && len(decoded) >= 32 {
		return decoded
	}
	return []byte(secret)
}

// SignInWithPassword melakukan autentikasi email/password ke Supabase.
func (s *SupabaseClient) SignInWithPassword(ctx context.Context, email, password string) (*Tokens, error) {
	body, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.url+"/auth/v1/token?grant_type=password", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Authorization", "Bearer "+s.anonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("koneksi ke Supabase Auth gagal: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		var apiErr struct {
			Error            string `json:"error"`
			ErrorDescription string `json:"error_description"`
			Message          string `json:"msg"`
		}
		_ = json.Unmarshal(raw, &apiErr)
		msg := apiErr.ErrorDescription
		if msg == "" {
			msg = apiErr.Message
		}
		if msg == "" {
			msg = apiErr.Error
		}
		return nil, errors.New("email atau password yang Anda masukkan salah")
	}

	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
		User         struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("respon Supabase tidak valid: %w", err)
	}

	if result.AccessToken == "" {
		return nil, errors.New("respon Supabase Auth tidak berisi access token")
	}

	return &Tokens{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresIn:    result.ExpiresIn,
		UserID:       result.User.ID,
		Email:        result.User.Email,
	}, nil
}

// RefreshToken menukar refresh token dengan pasangan token baru.
func (s *SupabaseClient) RefreshToken(ctx context.Context, refreshToken string) (*Tokens, error) {
	body, _ := json.Marshal(map[string]string{"refresh_token": refreshToken})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.url+"/auth/v1/token?grant_type=refresh_token", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", s.anonKey)
	req.Header.Set("Authorization", "Bearer "+s.anonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, errors.New("refresh token tidak valid atau sudah kedaluwarsa")
	}

	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
		User         struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if result.AccessToken == "" {
		return nil, errors.New("respon refresh tidak berisi access token")
	}

	return &Tokens{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresIn:    result.ExpiresIn,
		UserID:       result.User.ID,
		Email:        result.User.Email,
	}, nil
}

// VerifyAccessToken memverifikasi tanda tangan dan masa berlaku JWT access token
// yang dikeluarkan oleh Supabase.
func (s *SupabaseClient) VerifyAccessToken(tokenString string) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode tanda tangan tidak didukung: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}
