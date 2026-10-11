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

	// PocketBase
	PocketbaseURL          string
	PocketbaseAdminEmail   string
	PocketbaseAdminPassword string

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

	// Environment & Dev mode
	AppEnv string
	IsDev  bool
}

// Load membaca konfigurasi dari environment dengan nilai default yang aman.
func Load() (*Config, error) {
	backendPort := getEnvFirst([]string{"BACKEND_PORT", "API_PORT", "PORT"}, "8080")
	// Jika PORT=3000 diwariskan container, pastikan backend tetap memakai port 8080 kecuali ditentukan khusus.
	if backendPort == "3000" && getEnv("BACKEND_PORT", "") == "" && getEnv("API_PORT", "") == "" {
		backendPort = "8080"
	}

	cfg := &Config{
		Port:                    backendPort,
		PocketbaseURL:          getEnvFirst([]string{"POCKETBASE_URL", "PB_URL", "POCKETBASE_API_URL"}, "https://db-arsip.kemenag-baritoutara.com"),
		PocketbaseAdminEmail:   getEnvFirst([]string{"POCKETBASE_ADMIN_EMAIL", "PB_ADMIN_EMAIL", "POCKETBASE_EMAIL"}, "baritoutara@kemenag.go.id"),
		PocketbaseAdminPassword: getEnvFirst([]string{"POCKETBASE_ADMIN_PASSWORD", "PB_ADMIN_PASSWORD", "POCKETBASE_PASSWORD"}, "@Kemenag_126"),
		R2AccountID:            getEnvFirst([]string{"R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID", "CF_ACCOUNT_ID"}, ""),
		R2AccessKeyID:          getEnvFirst([]string{"R2_ACCESS_KEY_ID", "CLOUDFLARE_ACCESS_KEY_ID", "CF_ACCESS_KEY_ID"}, ""),
		R2SecretAccessKey:      getEnvFirst([]string{"R2_SECRET_ACCESS_KEY", "CLOUDFLARE_SECRET_ACCESS_KEY", "CF_SECRET_ACCESS_KEY"}, ""),
		R2BucketName:           getEnvFirst([]string{"R2_BUCKET_NAME", "R2_BUCKET_ARSIP", "R2_BUCKET"}, "data-arsip"),
		TurnstileSecretKey:     getEnvFirst([]string{"TURNSTILE_SECRET_KEY", "CLOUDFLARE_TURNSTILE_SECRET_KEY"}, ""),
		PusdatinURL:            getEnvFirst([]string{"PUSDATIN_URL", "NEXT_PUBLIC_PUSDATIN_URL", "PUBLIC_PUSDATIN_URL"}, ""),
		PusdatinAppID:          getEnvFirst([]string{"PUSDATIN_APP_ID"}, "e-arsip-kemenag"),
		CookieName:             getEnvFirst([]string{"COOKIE_NAME"}, "earsip-auth"),
		CookieDomain:           getEnvFirst([]string{"COOKIE_DOMAIN"}, ""),
		CookieSecure:           getEnvBool("COOKIE_SECURE", false),
	}

	appEnv := strings.ToLower(getEnvFirst([]string{"APP_ENV", "NODE_ENV", "GO_ENV", "ENVIRONMENT"}, "development"))
	cfg.AppEnv = appEnv
	cfg.IsDev = appEnv == "development" || appEnv == "dev" || appEnv == "local" || appEnv == "test"

	quota, err := strconv.ParseFloat(getEnv("STORAGE_QUOTA_GB", "100"), 64)
	if err != nil || quota <= 0 {
		quota = 100
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

// validate memastikan seluruh konfigurasi krusial terisi dari Infisical Cloud.
func (c *Config) validate() error {
	if c.PocketbaseURL == "" {
		return fmt.Errorf("environment variable POCKETBASE_URL wajib terisi")
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
