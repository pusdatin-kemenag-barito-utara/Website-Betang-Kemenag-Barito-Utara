package main

import (
	"context"
	"log"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/server"
)

func main() {

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
