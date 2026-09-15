package auth_test

import (
	"testing"
	"time"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/auth"
)

func TestWebDAVToken(t *testing.T) {
	secret := []byte("test-super-secret-key-for-webdav-1234567890")
	claims := auth.WebDAVClaims{
		FileID:    "file-uuid-123",
		UserID:    "user-uuid-456",
		Email:     "asn@kemenag.go.id",
		Role:      "admin_bidang",
		BidangID:  "bidang-pendis",
		ExpiresAt: time.Now().Add(1 * time.Hour).Unix(),
	}

	token, err := auth.GenerateWebDAVToken(claims, secret)
	if err != nil {
		t.Fatalf("GenerateWebDAVToken failed: %v", err)
	}

	if token == "" {
		t.Fatalf("expected non-empty token")
	}

	// Validate token
	parsed, err := auth.ValidateWebDAVToken(token, secret)
	if err != nil {
		t.Fatalf("ValidateWebDAVToken failed: %v", err)
	}

	if parsed.FileID != claims.FileID {
		t.Errorf("expected FileID %s, got %s", claims.FileID, parsed.FileID)
	}
	if parsed.Email != claims.Email {
		t.Errorf("expected Email %s, got %s", claims.Email, parsed.Email)
	}

	// Test invalid secret
	_, err = auth.ValidateWebDAVToken(token, []byte("wrong-secret"))
	if err == nil {
		t.Errorf("expected error with wrong secret, got nil")
	}

	// Test expired token
	expiredClaims := claims
	expiredClaims.ExpiresAt = time.Now().Add(-1 * time.Hour).Unix()
	expiredToken, err := auth.GenerateWebDAVToken(expiredClaims, secret)
	if err != nil {
		t.Fatalf("failed to generate expired token: %v", err)
	}
	_, err = auth.ValidateWebDAVToken(expiredToken, secret)
	if err == nil {
		t.Errorf("expected error with expired token, got nil")
	}
}
