package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/server"
)

func main() {
	// Muat .env jika tersedia (development); periksa file satu per satu
	for _, envPath := range []string{".env", "../.env", "../../.env"} {
		if _, err := os.Stat(envPath); err == nil {
			_ = godotenv.Overload(envPath)
		}
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("konfigurasi tidak valid: %v", err)
	}

	app, cleanup, err := server.Build(context.Background(), cfg)
	if err != nil {
		log.Fatalf("gagal membangun server: %v", err)
	}
	defer cleanup()

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("SI BETANG API berjalan di port %s", port)
	log.Fatal(app.Listen(":" + port))
}
