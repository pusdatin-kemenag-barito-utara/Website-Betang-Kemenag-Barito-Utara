// Package config menangani pembacaan dan validasi environment variables.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config menyimpan seluruh konfigurasi aplikasi yang dibaca dari environment.
type Config struct {
	// Server
	Port string

	// Supabase Auth (issuer token tetap dari Supabase)
	SupabaseURL      string
	SupabaseAnonKey  string
	SupabaseJWTSecret string

	// Postgres (satu database, dua schema)
	DatabaseURL    string
	DBSChema       string
	PusdatinSchema string

	// Cloudflare R2
	R2AccountID      string
	R2AccessKeyID    string
	R2SecretAccessKey string
	R2BucketName     string

	// Cloudflare Turnstile
	TurnstileSecretKey string

	// Integrasi Pusdatin (maintenance mode)
	PusdatinURL   string
	PusdatinAppID string

	// Kuota penyimpanan widget (GB)
	StorageQuotaGB float64

	// Cookie sesi
	CookieName   string
	CookieDomain string
	CookieSecure bool

	// CORS
	CORSAllowedOrigins []string
}

// Load membaca konfigurasi dari environment dengan nilai default yang aman.
func Load() (*Config, error) {
	backendPort := getEnvFirst([]string{"BACKEND_PORT", "API_PORT", "PORT"}, "8080")
	// Jika PORT=3000 ada di .env (untuk frontend), pastikan backend tetap memakai port 8080 kecuali ditentukan khusus.
	if backendPort == "3000" && getEnv("BACKEND_PORT", "") == "" && getEnv("API_PORT", "") == "" {
		backendPort = "8080"
	}

	cfg := &Config{
		Port:               backendPort,
		SupabaseURL:        getEnvFirst([]string{"SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"}, ""),
		SupabaseAnonKey:    getEnvFirst([]string{"SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"}, ""),
		SupabaseJWTSecret:  getEnvFirst([]string{"SUPABASE_JWT_SECRET", "SUPABASE_SERVICE_ROLE_KEY"}, ""),
		DatabaseURL:        getEnvFirst([]string{"DATABASE_URL", "DIRECT_URL"}, ""),
		DBSChema:           getEnvFirst([]string{"DB_SCHEMA"}, "kemenag_arsip"),
		PusdatinSchema:     getEnvFirst([]string{"PUSDATIN_SCHEMA"}, "kemenag_pusdatin"),
		R2AccountID:        getEnvFirst([]string{"R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"}, ""),
		R2AccessKeyID:      getEnvFirst([]string{"R2_ACCESS_KEY_ID"}, ""),
		R2SecretAccessKey:  getEnvFirst([]string{"R2_SECRET_ACCESS_KEY"}, ""),
		R2BucketName:       getEnvFirst([]string{"R2_BUCKET_NAME", "R2_BUCKET_ARSIP"}, "data-arsip"),
		TurnstileSecretKey: getEnvFirst([]string{"TURNSTILE_SECRET_KEY"}, ""),
		PusdatinURL:        getEnvFirst([]string{"PUSDATIN_URL", "NEXT_PUBLIC_PUSDATIN_URL"}, "https://pusdatin.kemenag-baritoutara.com"),
		PusdatinAppID:      getEnvFirst([]string{"PUSDATIN_APP_ID"}, "e-arsip-kemenag"),
		CookieName:         getEnvFirst([]string{"COOKIE_NAME"}, "earsip-auth"),
		CookieDomain:       getEnvFirst([]string{"COOKIE_DOMAIN"}, ""),
		CookieSecure:       getEnvBool("COOKIE_SECURE", false),
	}

	quota, err := strconv.ParseFloat(getEnv("STORAGE_QUOTA_GB", "15"), 64)
	if err != nil || quota <= 0 {
		quota = 15
	}
	cfg.StorageQuotaGB = quota

	for _, origin := range strings.Split(getEnv("CORS_ALLOWED_ORIGINS", ""), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			cfg.CORSAllowedOrigins = append(cfg.CORSAllowedOrigins, origin)
		}
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

// validate memastikan seluruh variabel wajib terisi.
func (c *Config) validate() error {
	required := map[string]string{
		"SUPABASE_URL":          c.SupabaseURL,
		"SUPABASE_ANON_KEY":     c.SupabaseAnonKey,
		"SUPABASE_JWT_SECRET":   c.SupabaseJWTSecret,
		"DATABASE_URL":          c.DatabaseURL,
		"R2_ACCOUNT_ID":         c.R2AccountID,
		"R2_ACCESS_KEY_ID":      c.R2AccessKeyID,
		"R2_SECRET_ACCESS_KEY":  c.R2SecretAccessKey,
		"TURNSTILE_SECRET_KEY":  c.TurnstileSecretKey,
	}
	for name, value := range required {
		if value == "" {
			return fmt.Errorf("environment variable %s wajib diisi", name)
		}
	}
	return nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func getEnvFirst(keys []string, fallback string) string {
	for _, key := range keys {
		if value, ok := os.LookupEnv(key); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
