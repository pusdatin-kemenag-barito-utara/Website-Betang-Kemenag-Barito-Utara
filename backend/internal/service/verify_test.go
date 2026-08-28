package service

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/joho/godotenv"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/repository"
)

func TestDataSync(t *testing.T) {
	for _, envPath := range []string{"../../.env", "../../../.env", ".env"} {
		if _, err := os.Stat(envPath); err == nil {
			_ = godotenv.Overload(envPath)
		}
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config error: %v", err)
	}

	pool, err := repository.Connect(context.Background(), cfg.DatabaseURL, "kemenag_arsip, kemenag_pusdatin, public")
	if err != nil {
		t.Fatalf("db connect error: %v", err)
	}
	defer pool.Close()

	repos := repository.New(pool, cfg.PusdatinSchema)
	svc := New(repos, nil, nil, cfg)

	// 1. Test Root Folders Contents
	contents, err := svc.Folder.Contents(context.Background(), nil, "")
	if err != nil {
		t.Fatalf("Folder.Contents error: %v", err)
	}
	fmt.Printf("[TEST] Root Folders count: %d, Files count: %d\n", len(contents.Folders), len(contents.Files))
	for _, f := range contents.Folders {
		fmt.Printf("   -> Folder: %s (ID: %s, TotalSize: %d bytes)\n", f.Name, f.ID, f.TotalSize)
	}

	// 2. Test Stats
	stats, err := svc.File.Stats(context.Background())
	if err != nil {
		t.Fatalf("File.Stats error: %v", err)
	}
	fmt.Printf("[TEST] Total Files: %d, Total Storage: %d bytes\n", stats.TotalFiles, stats.TotalStorage)

	// 3. Test Bidang
	bidangs, err := svc.Bidang.List(context.Background())
	if err != nil {
		t.Fatalf("Bidang.List error: %v", err)
	}
	fmt.Printf("[TEST] Bidang count: %d\n", len(bidangs))
	for _, b := range bidangs {
		fmt.Printf("   -> Bidang: %s (DocCount: %d)\n", b.Name, b.DocCount)
	}
}
