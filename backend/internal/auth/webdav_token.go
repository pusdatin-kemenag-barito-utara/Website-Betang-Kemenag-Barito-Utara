package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// WebDAVClaims menyimpan klaim identitas dan izin berkas untuk sesi WebDAV.
type WebDAVClaims struct {
	FileID    string `json:"fid"`
	UserID    string `json:"uid"`
	Email     string `json:"eml"`
	UserName  string `json:"unm,omitempty"`
	Role      string `json:"rol"`
	BidangID  string `json:"bid"`
	ExpiresAt int64  `json:"exp"`
}

// GenerateWebDAVToken membuat token signed HMAC-SHA256 yang aman untuk disematkan pada URL WebDAV.
func GenerateWebDAVToken(claims WebDAVClaims, secret []byte) (string, error) {
	payloadBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadBytes)

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(payloadB64))
	sigB64 := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return fmt.Sprintf("%s.%s", payloadB64, sigB64), nil
}

// ValidateWebDAVToken memverifikasi keabsahan signature dan masa berlaku token WebDAV.
func ValidateWebDAVToken(token string, secret []byte) (*WebDAVClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, errors.New("format token webdav tidak valid")
	}

	payloadB64, sigB64 := parts[0], parts[1]

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(payloadB64))
	expectedSig := mac.Sum(nil)

	actualSig, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil || !hmac.Equal(actualSig, expectedSig) {
		return nil, errors.New("tanda tangan token webdav tidak sah")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, errors.New("gagal mendekode payload webdav")
	}

	var claims WebDAVClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, errors.New("payload webdav rusak")
	}

	if time.Now().Unix() > claims.ExpiresAt {
		return nil, errors.New("token webdav telah kedaluwarsa")
	}

	return &claims, nil
}
