package service

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/joho/godotenv"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/config"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
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

	// Super Admin User
	superAdmin := &domain.AuthUser{
		Email:        "baritoutara@kemenag.go.id",
		Role:         "Super Admin",
		IsSuperAdmin: true,
	}

	// 1. Test Super Admin Root Folders Contents (all folders)
	superContents, err := svc.Folder.Contents(context.Background(), nil, "", superAdmin)
	if err != nil {
		t.Fatalf("SuperAdmin Folder.Contents error: %v", err)
	}
	fmt.Printf("[TEST] SuperAdmin Root Folders count: %d\n", len(superContents.Folders))
	if len(superContents.Folders) < 8 {
		t.Errorf("Expected at least 8 root folders for SuperAdmin, got %d", len(superContents.Folders))
	}

	// Admin TU User
	tuBidangID := "e6c7df17-8292-4c04-be52-8b3e85219a81"
	penmadFolderID := "17f8e411-ed7f-4d9c-ab29-4f06ed83b7ce"
	tuFolderID := "5e5fd1fb-5774-4d05-949e-8551d7d236cc"

	adminTU := &domain.AuthUser{
		Email:        "admin.tu@kemenag.go.id",
		Role:         "Admin Bidang",
		BidangID:     &tuBidangID,
		IsSuperAdmin: false,
	}

	// 2. Test Admin TU Root Folders Contents (ONLY TU folder should be visible)
	tuContents, err := svc.Folder.Contents(context.Background(), nil, "", adminTU)
	if err != nil {
		t.Fatalf("AdminTU Folder.Contents error: %v", err)
	}
	fmt.Printf("[TEST] AdminTU Root Folders count: %d\n", len(tuContents.Folders))
	if len(tuContents.Folders) != 1 {
		t.Errorf("Expected exactly 1 root folder for AdminTU, got %d", len(tuContents.Folders))
	}
	if len(tuContents.Folders) > 0 && tuContents.Folders[0].Name != "Sub Bagian Tata Usaha" {
		t.Errorf("Expected root folder 'Sub Bagian Tata Usaha', got '%s'", tuContents.Folders[0].Name)
	}

	// 3. Test Admin TU accessing own folder (allowed)
	ownContents, err := svc.Folder.Contents(context.Background(), &tuFolderID, "", adminTU)
	if err != nil {
		t.Fatalf("AdminTU accessing own folder failed: %v", err)
	}
	fmt.Printf("[TEST] AdminTU own folder contents: %d subfolders, %d files\n", len(ownContents.Folders), len(ownContents.Files))

	// 4. Test Admin TU attempting to access Penmad folder (forbidden)
	_, err = svc.Folder.Contents(context.Background(), &penmadFolderID, "", adminTU)
	if err == nil {
		t.Errorf("Expected forbidden error when AdminTU accesses Penmad folder, but got success!")
	} else {
		fmt.Printf("[TEST] Expected forbidden response when accessing another bidang folder: %v\n", err)
	}

	// 5. Test Dynamic Assignment: Grant Penmad root folder to Admin TU as well
	err = svc.Bidang.SetAccessibleFolders(context.Background(), tuBidangID, []string{tuFolderID, penmadFolderID}, "baritoutara@kemenag.go.id", "127.0.0.1")
	if err != nil {
		t.Fatalf("SetAccessibleFolders error: %v", err)
	}

	// Now Admin TU should see 2 root folders!
	multiContents, err := svc.Folder.Contents(context.Background(), nil, "", adminTU)
	if err != nil {
		t.Fatalf("AdminTU Folder.Contents after granting Penmad error: %v", err)
	}
	fmt.Printf("[TEST] AdminTU Root Folders count after dynamic grant: %d\n", len(multiContents.Folders))
	if len(multiContents.Folders) != 2 {
		t.Errorf("Expected 2 root folders for AdminTU after dynamic grant, got %d", len(multiContents.Folders))
	}

	// And Admin TU can now access Penmad folder directly!
	penmadAllowed, err := svc.Folder.Contents(context.Background(), &penmadFolderID, "", adminTU)
	if err != nil {
		t.Errorf("AdminTU should be allowed to access Penmad folder now, but got error: %v", err)
	} else {
		fmt.Printf("[TEST] Successfully accessed dynamically granted Penmad folder: %d subfolders\n", len(penmadAllowed.Folders))
	}

	// 6. Test Dynamic Revocation: Restore Admin TU to only its own folder
	err = svc.Bidang.SetAccessibleFolders(context.Background(), tuBidangID, []string{tuFolderID}, "baritoutara@kemenag.go.id", "127.0.0.1")
	if err != nil {
		t.Fatalf("SetAccessibleFolders restore error: %v", err)
	}

	restoredContents, err := svc.Folder.Contents(context.Background(), nil, "", adminTU)
	if err != nil {
		t.Fatalf("AdminTU Folder.Contents after restore error: %v", err)
	}
	fmt.Printf("[TEST] AdminTU Root Folders count after restore: %d\n", len(restoredContents.Folders))
	if len(restoredContents.Folders) != 1 {
		t.Errorf("Expected 1 root folder for AdminTU after restore, got %d", len(restoredContents.Folders))
	}

	// 7. Test Stats
	stats, err := svc.File.Stats(context.Background())
	if err != nil {
		t.Fatalf("File.Stats error: %v", err)
	}
	fmt.Printf("[TEST] Total Files: %d, Total Storage: %d bytes\n", stats.TotalFiles, stats.TotalStorage)
}
