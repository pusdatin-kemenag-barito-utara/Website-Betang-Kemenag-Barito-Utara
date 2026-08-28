// Package server merangkai seluruh komponen menjadi aplikasi Fiber utuh.
package server

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/recover"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/auth"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/handler"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/middleware"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/storage"
)

// Build membuat aplikasi Fiber lengkap beserta seluruh dependensinya.
// Mengembalikan aplikasi dan fungsi cleanup untuk menutup koneksi.
func Build(ctx context.Context, cfg *config.Config) (*fiber.App, func(), error) {
	cleanup := func() {}

	// 1) Koneksi database dengan search_path yang benar.
	searchPath := fmt.Sprintf("%s, %s, public", cfg.DBSChema, cfg.PusdatinSchema)
	pool, err := repository.Connect(ctx, cfg.DatabaseURL, searchPath)
	if err != nil {
		return nil, cleanup, err
	}
	cleanup = func() { pool.Close() }

	// 2) Client penyimpanan R2.
	r2, err := storage.NewR2Storage(cfg.R2AccountID, cfg.R2AccessKeyID, cfg.R2SecretAccessKey, cfg.R2BucketName)
	if err != nil {
		cleanup()
		return nil, func() {}, err
	}

	// 3) Client Supabase Auth.
	supabaseClient := auth.NewSupabaseClient(cfg.SupabaseURL, cfg.SupabaseAnonKey, cfg.SupabaseJWTSecret)

	// 4) Lapisan repository dan service.
	repos := repository.New(pool, cfg.PusdatinSchema)

	services := service.New(repos, r2, supabaseClient, cfg)
	services.Maintenance = service.NewMaintenanceService(cfg.PusdatinURL, cfg.PusdatinAppID)

	// 5) Handler dan middleware.
	handlers := handler.New(services, pool)
	authMW := middleware.NewAuthMiddleware(services.Auth, cfg)
	handlers.Auth.SetAuthMiddleware(authMW)
	cors := middleware.NewCORSHandler(cfg)

	// 6) Aplikasi Fiber & Middleware Performa + Keamanan.
	app := fiber.New(fiber.Config{
		AppName:      "SI BETANG (E-Arsip) API",
		ServerHeader: "betang-api",
	})

	// Rate limiting: general API (120 req / 10s) dan Auth login (10 req / 1m).
	apiLimiter := limiter.New(limiter.Config{
		Max:        120,
		Expiration: 10 * time.Second,
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "Terlalu banyak permintaan. Silakan tunggu beberapa saat.",
			})
		},
	})

	authLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "Percobaan login terlalu sering. Silakan coba lagi dalam 1 menit.",
			})
		},
	})

	app.Use(cors.Handle)
	app.Use(middleware.RequestLogger())
	app.Use(recover.New())
	app.Use(compress.New(compress.Config{
		Level: compress.LevelDefault,
	}))
	app.Use(apiLimiter)

	// Kelompok route tanpa autentikasi.
	app.Get("/", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "SI BETANG Go API Backend",
			"version": "1.0.0",
		})
	})
	app.Get("/health", handlers.Health.Check)
	app.Get("/api/v1/health", handlers.Health.Check)
	app.Post("/api/v1/auth/login", authLimiter, handlers.Auth.Login)

	// Kelompok route terproteksi.
	protected := app.Group("/api/v1", authMW.RequireAuth)

	protected.Post("/auth/logout", handlers.Auth.Logout)
	protected.Get("/auth/me", handlers.Auth.Me)
	protected.Get("/users/me", handlers.Auth.Me)

	protected.Get("/bidang", handlers.Bidang.List)
	protected.Post("/bidang", handlers.Bidang.Create)
	protected.Patch("/bidang/:id", handlers.Bidang.Update)
	protected.Delete("/bidang/:id", handlers.Bidang.Delete)
	protected.Post("/bidang/reorder", handlers.Bidang.Reorder)

	protected.Get("/folders/tree", handlers.Folder.Tree)
	protected.Get("/folders", handlers.Folder.Contents)
	protected.Get("/folders/:folderId/breadcrumbs", handlers.Folder.Breadcrumbs)
	protected.Get("/folders/:folderId", handlers.Folder.Contents)
	protected.Post("/folders", handlers.Folder.Create)
	protected.Post("/folders/rename", handlers.Folder.RenameItem)
	protected.Post("/folders/move", handlers.Folder.MoveItem)
	protected.Post("/folders/copy", handlers.Folder.CopyItem)
	protected.Post("/folders/delete", handlers.Folder.DeleteItem)
	protected.Post("/folders/delete-batch", handlers.Folder.DeleteItemsBatch)
	protected.Patch("/folders/:id/color", handlers.Folder.UpdateColor)

	// Starred (Favorit)
	protected.Get("/starred", handlers.Folder.Starred)
	protected.Post("/items/star", handlers.Folder.ToggleStar)

	protected.Post("/files/upload", handlers.File.Upload)
	protected.Post("/files/presign-upload", handlers.File.PresignUpload)
	protected.Post("/files/presign-download", handlers.File.PresignDownload)
	protected.Get("/files/stream", handlers.File.StreamFile)
	protected.Post("/files/metadata", handlers.File.SaveMetadata)
	protected.Get("/files/:fileId/versions", handlers.File.Versions)
	protected.Post("/files/restore-version", handlers.File.RestoreVersion)
	protected.Post("/files/zip", handlers.File.ZipDownload)
	protected.Post("/files/:id/share-link", handlers.File.ShareLink)
	protected.Get("/stats", handlers.File.Stats)

	protected.Get("/trash", handlers.Trash.List)
	protected.Post("/trash/restore", handlers.Trash.Restore)
	protected.Post("/trash/restore-batch", handlers.Trash.RestoreBatch)
	protected.Post("/trash/permanent-delete", handlers.Trash.PermanentDelete)

	protected.Get("/settings", handlers.Settings.Get)
	protected.Put("/settings", handlers.Settings.Update)

	protected.Get("/storage/usage", handlers.Storage.Usage)
	protected.Get("/maintenance/status", handlers.Maintenance.Status)

	log.Printf("Aplikasi SI BETANG dimulai (mode %s)", "produksi")
	return app, cleanup, nil
}