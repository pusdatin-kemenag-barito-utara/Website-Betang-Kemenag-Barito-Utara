package handler

import (
	"bytes"
	"context"
	"encoding/xml"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/kemenag-baritoutara/betang-kemenag/internal/auth"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/domain"
	"github.com/kemenag-baritoutara/betang-kemenag/internal/service"
)

// WebDAVLock menyimpan metadata penguncian berkas saat dibuka di Microsoft Office.
type WebDAVLock struct {
	Token     string
	Owner     string
	FileID    string
	UserID    string
	CreatedAt time.Time
	ExpiresAt time.Time
}

// PendingSave menyimpan berkas sementara yang di-save (Ctrl + S) oleh user, untuk didebounce agar tidak spam upload R2 / DB.
// Menyerap kebiasaan refleks user yang sering menekan Ctrl+S berkali-kali padahal pekerjaannya belum selesai.
type PendingSave struct {
	sync.Mutex
	FileID    string
	Data      []byte
	SizeBytes int64
	ETag      string // ETag deterministik konsisten antara PUT, GET, dan PROPFIND
	Claims    *auth.WebDAVClaims
	IP        string
	Timer     *time.Timer
	CreatedAt time.Time
	UpdatedAt time.Time
	SaveCount int // Menghitung berapa kali Ctrl+S diserap dalam sesi ini
}

func makeETag(fileID string, updatedAt time.Time, sizeBytes int64) string {
	return fmt.Sprintf(`"betang-%s-%d-%d"`, fileID, updatedAt.Unix(), sizeBytes)
}

// WebDAVHandler menangani seluruh metode WebDAV resmi (RFC 4918) untuk Microsoft Office Desktop.
type WebDAVHandler struct {
	files         *service.FileService
	jwtSecret     []byte
	locks         sync.Map // map[string]*WebDAVLock (key: fileID)
	lastSnapshots sync.Map // map[string]time.Time (key: fileID, proteksi spam versioning)
	pendingSaves  sync.Map // map[string]*PendingSave (key: fileID, proteksi spam Ctrl+S)
}

// NewWebDAVHandler membuat instance baru handler WebDAV.
func NewWebDAVHandler(files *service.FileService, jwtSecret []byte) *WebDAVHandler {
	return &WebDAVHandler{
		files:     files,
		jwtSecret: jwtSecret,
	}
}

// GenerateLink membuat signed WebDAV URL yang dapat dibuka langsung oleh Microsoft Office tanpa popup password Windows.
func (h *WebDAVHandler) GenerateLink(c fiber.Ctx) error {
	fileID := c.Params("fileId")
	if fileID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "ID berkas tidak valid",
		})
	}

	authUser := currentUser(c)
	if authUser == nil || authUser.ID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Sesi tidak valid",
		})
	}

	file, err := h.files.GetByID(c.Context(), fileID)
	if err != nil || file == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Berkas tidak ditemukan",
		})
	}

	bidangID := ""
	if authUser.BidangID != nil {
		bidangID = *authUser.BidangID
	}

	ownerName := authUser.FullName
	if ownerName == "" {
		ownerName = authUser.Email
	}

	claims := auth.WebDAVClaims{
		FileID:    file.ID,
		UserID:    authUser.ID,
		Email:     authUser.Email,
		UserName:  ownerName,
		Role:      authUser.Role,
		BidangID:  bidangID,
		ExpiresAt: time.Now().Add(8 * time.Hour).Unix(),
	}

	token, err := auth.GenerateWebDAVToken(claims, h.jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Gagal membuat token WebDAV",
		})
	}

	// Buat provisional lock (60 detik) agar indikator 'Sedang diedit' langsung muncul seketika di frontend
	// saat user menekan 'Buka di Microsoft Office', sebelum Office Desktop menyelesaikan proses launching.
	h.locks.Store(file.ID, &WebDAVLock{
		Token:     "urn:uuid:provisional-" + uuid.New().String(),
		Owner:     ownerName,
		FileID:    file.ID,
		UserID:    authUser.ID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(60 * time.Second),
	})

	// Buat URL WebDAV aman (nama berkas diletakkan di akhir path agar Office mengenali ekstensi .docx/.xlsx/.pptx)
	encodedName := url.PathEscape(file.Name)
	webdavPath := fmt.Sprintf("/api/v1/dav/%s/%s", token, encodedName)

	return c.JSON(fiber.Map{
		"success":    true,
		"webdavPath": webdavPath,
		"fileName":   file.Name,
		"fileId":     file.ID,
	})
}

// HandleWebDAV memproses permintaan HTTP dari Microsoft Office Desktop (OPTIONS, PROPFIND, LOCK, UNLOCK, GET, PUT).
func (h *WebDAVHandler) HandleWebDAV(c fiber.Ctx) error {
	method := strings.ToUpper(c.Method())

	// 1. OPTIONS tidak selalu menyertakan token saat Office melakukan 'Existence Discovery'
	if method == fiber.MethodOptions {
		c.Set("DAV", "1, 2")
		c.Set("MS-Author-Via", "DAV")
		c.Set("Allow", "OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, PROPFIND, PROPPATCH, COPY, MOVE, LOCK, UNLOCK")
		c.Set("Accept-Ranges", "bytes")
		return c.SendStatus(fiber.StatusOK)
	}

	token := c.Params("token")
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("Token WebDAV diperlukan")
	}

	claims, err := auth.ValidateWebDAVToken(token, h.jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("Token WebDAV tidak sah atau kedaluwarsa")
	}

	file, err := h.files.GetByID(c.Context(), claims.FileID)
	if err != nil || file == nil {
		return c.Status(fiber.StatusNotFound).SendString("Berkas tidak ditemukan")
	}

	switch method {
	case "PROPFIND":
		return h.handlePropfind(c, file, token)

	case "PROPPATCH":
		return h.handleProppatch(c, file, token)

	case "LOCK":
		return h.handleLock(c, file, claims)

	case "UNLOCK":
		return h.handleUnlock(c, file)

	case fiber.MethodGet, fiber.MethodHead:
		return h.handleGet(c, file)

	case fiber.MethodPut:
		return h.handlePut(c, file, claims)

	default:
		c.Set("Allow", "OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, PROPFIND, PROPPATCH, COPY, MOVE, LOCK, UNLOCK")
		return c.Status(fiber.StatusMethodNotAllowed).SendString("Metode tidak didukung")
	}
}

func (h *WebDAVHandler) handlePropfind(c fiber.Ctx, file *domain.File, token string) error {
	c.Set("Content-Type", "application/xml; charset=utf-8")
	c.Set("DAV", "1, 2")
	c.Set("MS-Author-Via", "DAV")
	c.Set("Allow", "OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, PROPFIND, PROPPATCH, COPY, MOVE, LOCK, UNLOCK")

	size := file.SizeBytes
	lastModified := file.UpdatedAt.UTC().Format(http.TimeFormat)
	etag := makeETag(file.ID, file.UpdatedAt, file.SizeBytes)

	// Jika ada perubahan di buffer yang belum di-flush, sajikan data dan ETag persis yang konsisten dengan respon PUT
	if val, ok := h.pendingSaves.Load(file.ID); ok && val != nil {
		pending := val.(*PendingSave)
		pending.Lock()
		size = pending.SizeBytes
		lastModified = pending.UpdatedAt.UTC().Format(http.TimeFormat)
		if pending.ETag != "" {
			etag = pending.ETag
		} else {
			etag = makeETag(file.ID, pending.UpdatedAt, pending.SizeBytes)
		}
		pending.Unlock()
	}

	escapedName := escapeXML(file.Name)
	href := fmt.Sprintf("/api/v1/dav/%s/%s", token, url.PathEscape(file.Name))

	responseXML := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>%s</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>%s</D:displayname>
        <D:getcontentlength>%d</D:getcontentlength>
        <D:getlastmodified>%s</D:getlastmodified>
        <D:resourcetype/>
        <D:getcontenttype>%s</D:getcontenttype>
        <D:getetag>%s</D:getetag>
        <D:supportedlock>
          <D:lockentry>
            <D:lockscope><D:exclusive/></D:lockscope>
            <D:locktype><D:write/></D:locktype>
          </D:lockentry>
        </D:supportedlock>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`, href, escapedName, size, lastModified, file.MimeType, etag)

	return c.Status(207).SendString(responseXML)
}

func (h *WebDAVHandler) handleProppatch(c fiber.Ctx, file *domain.File, token string) error {
	c.Set("Content-Type", "application/xml; charset=utf-8")
	c.Set("DAV", "1, 2")
	c.Set("MS-Author-Via", "DAV")

	href := fmt.Sprintf("/api/v1/dav/%s/%s", token, url.PathEscape(file.Name))
	respXML := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>%s</D:href>
    <D:propstat>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`, href)

	return c.Status(207).SendString(respXML)
}

func (h *WebDAVHandler) handleLock(c fiber.Ctx, file *domain.File, claims *auth.WebDAVClaims) error {
	lockToken := fmt.Sprintf("urn:uuid:%s", uuid.New().String())

	// Dukung Lock Refresh (RFC 4918): jika file sudah memiliki lock aktif, pertahankan token UUID yang sama
	if existingVal, ok := h.locks.Load(file.ID); ok && existingVal != nil {
		existing := existingVal.(*WebDAVLock)
		if strings.HasPrefix(existing.Token, "urn:uuid:") && !strings.Contains(existing.Token, "provisional") {
			lockToken = existing.Token
		}
	}

	timeoutSeconds := 3600
	timeoutHeader := c.Get("Timeout")
	if strings.HasPrefix(timeoutHeader, "Second-") {
		if sec, err := strconv.Atoi(strings.TrimPrefix(timeoutHeader, "Second-")); err == nil && sec > 0 {
			if sec > 7200 {
				sec = 7200
			}
			if sec < 60 {
				sec = 60
			}
			timeoutSeconds = sec
		}
	}

	owner := claims.UserName
	if owner == "" {
		owner = claims.Email
	}

	lockObj := &WebDAVLock{
		Token:     lockToken,
		Owner:     owner,
		FileID:    file.ID,
		UserID:    claims.UserID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(time.Duration(timeoutSeconds) * time.Second),
	}

	h.locks.Store(file.ID, lockObj)

	c.Set("Content-Type", "application/xml; charset=utf-8")
	c.Set("Lock-Token", fmt.Sprintf("<%s>", lockToken))
	c.Set("DAV", "1, 2")
	c.Set("MS-Author-Via", "DAV")

	respXML := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8" ?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>0</D:depth>
      <D:owner><D:href>%s</D:href></D:owner>
      <D:timeout>Second-%d</D:timeout>
      <D:locktoken><D:href>%s</D:href></D:locktoken>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>`, escapeXML(owner), timeoutSeconds, lockToken)

	return c.Status(fiber.StatusOK).SendString(respXML)
}

func (h *WebDAVHandler) handleUnlock(c fiber.Ctx, file *domain.File) error {
	h.locks.Delete(file.ID)

	// Saat user selesai dan menutup aplikasi Microsoft Office, Office mengirimkan UNLOCK.
	// Segera flush buffer perubahan ke Cloudflare R2 & Database agar data final aman tersimpan!
	h.flushPendingSave(file.ID)

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *WebDAVHandler) handleGet(c fiber.Ctx, file *domain.File) error {
	// Header penting agar Microsoft Office mendeteksi server berkemampuan WebDAV Class 2 dan membuka file dalam mode Read-Write
	c.Set("DAV", "1, 2")
	c.Set("MS-Author-Via", "DAV")
	c.Set("Allow", "OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, PROPFIND, PROPPATCH, COPY, MOVE, LOCK, UNLOCK")
	c.Set("Accept-Ranges", "bytes")
	c.Set("Content-Type", file.MimeType)
	// PENTING: Gunakan 'inline' agar Office tidak menganggap file sebagai download sekali pakai (Read-Only)
	c.Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, file.Name))

	size := file.SizeBytes
	lastModified := file.UpdatedAt.UTC().Format(http.TimeFormat)
	etag := makeETag(file.ID, file.UpdatedAt, file.SizeBytes)
	var dataCopy []byte

	// Jika ada berkas di buffer debounce yang belum di-flush, sajikan data terkini dari memori
	if val, ok := h.pendingSaves.Load(file.ID); ok && val != nil {
		pending := val.(*PendingSave)
		pending.Lock()
		dataCopy = make([]byte, len(pending.Data))
		copy(dataCopy, pending.Data)
		size = pending.SizeBytes
		lastModified = pending.UpdatedAt.UTC().Format(http.TimeFormat)
		if pending.ETag != "" {
			etag = pending.ETag
		} else {
			etag = makeETag(file.ID, pending.UpdatedAt, pending.SizeBytes)
		}
		pending.Unlock()
	}

	c.Set("ETag", etag)
	c.Set("Last-Modified", lastModified)
	c.Set("Content-Length", strconv.FormatInt(size, 10))

	// Cek If-None-Match: Jika ETag sama, beri tahu Office bahwa berkas belum berubah (304 Not Modified)
	if ifNoneMatch := c.Get("If-None-Match"); ifNoneMatch != "" && ifNoneMatch == etag {
		return c.SendStatus(fiber.StatusNotModified)
	}

	if c.Method() == fiber.MethodHead {
		return c.SendStatus(fiber.StatusOK)
	}

	if len(dataCopy) > 0 {
		return c.Send(dataCopy)
	}

	stream, err := h.files.GetObjectStream(c.Context(), file.R2ObjectKey)
	if err != nil {
		return c.Status(fiber.StatusNotFound).SendString("Gagal mengambil stream berkas")
	}

	return c.SendStream(stream.Body, int(file.SizeBytes))
}

func (h *WebDAVHandler) handlePut(c fiber.Ctx, file *domain.File, claims *auth.WebDAVClaims) error {
	body := c.Body()
	sizeBytes := int64(len(body))

	if sizeBytes == 0 {
		return c.SendStatus(fiber.StatusOK)
	}

	// Salin data body agar tidak terhapus saat buffer Fasthttp/Fiber di-reuse
	dataCopy := make([]byte, sizeBytes)
	copy(dataCopy, body)

	now := time.Now()
	currentETag := makeETag(file.ID, now, sizeBytes)

	// Smart Debounce Engine untuk proteksi spam Ctrl + S:
	// Ketika user menekan Ctrl+S berkali-kali saat bekerja, perubahan disimpan di memory buffer.
	// Office segera diberikan balasan 204 No Content seketika (1ms) agar pengalaman simpan terasa tanpa jeda.
	// ETag dijaga 100% konsisten dengan PROPFIND dan GET agar Office tidak pernah menampilkan "Refresh Recommended".
	val, exists := h.pendingSaves.Load(file.ID)
	var pending *PendingSave
	if exists && val != nil {
		pending = val.(*PendingSave)
		pending.Lock()
		if pending.Timer != nil {
			pending.Timer.Stop()
		}
		pending.Data = dataCopy
		pending.SizeBytes = sizeBytes
		pending.ETag = currentETag
		pending.Claims = claims
		pending.IP = c.IP()
		pending.UpdatedAt = now
		pending.SaveCount++
	} else {
		pending = &PendingSave{
			FileID:    file.ID,
			Data:      dataCopy,
			SizeBytes: sizeBytes,
			ETag:      currentETag,
			Claims:    claims,
			IP:        c.IP(),
			CreatedAt: now,
			UpdatedAt: now,
			SaveCount: 1,
		}
		h.pendingSaves.Store(file.ID, pending)
		pending.Lock()
	}

	// Set timer debounce 15 detik
	pending.Timer = time.AfterFunc(15*time.Second, func() {
		h.flushPendingSave(file.ID)
	})
	pending.Unlock()

	c.Set("ETag", currentETag)
	c.Set("DAV", "1, 2")
	c.Set("MS-Author-Via", "DAV")
	return c.SendStatus(fiber.StatusNoContent)
}

// flushPendingSave mengeksekusi penyimpanan permanen ke Cloudflare R2 & PostgreSQL setelah debounce selesai.
func (h *WebDAVHandler) flushPendingSave(fileID string) {
	val, ok := h.pendingSaves.LoadAndDelete(fileID)
	if !ok || val == nil {
		return
	}

	pending := val.(*PendingSave)
	pending.Lock()
	defer pending.Unlock()

	if pending.Timer != nil {
		pending.Timer.Stop()
	}

	if len(pending.Data) == 0 {
		return
	}

	// Proteksi Spam & Debounce Versioning:
	// Snapshot versi baru di file_versions hanya dibuat jika sudah berlalu minimal 5 menit sejak versi sebelumnya.
	shouldCreateVersionSnapshot := false
	lastSnapshotVal, exists := h.lastSnapshots.Load(fileID)
	if !exists {
		// Simpanan pertama dalam sesi edit: buat snapshot versi sebelum diedit
		shouldCreateVersionSnapshot = true
		h.lastSnapshots.Store(fileID, time.Now())
	} else if lastTime, ok := lastSnapshotVal.(time.Time); ok && time.Since(lastTime) > 5*time.Minute {
		// Sudah lewat 5 menit: buat snapshot milestone versi baru
		shouldCreateVersionSnapshot = true
		h.lastSnapshots.Store(fileID, time.Now())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	_, err := h.files.SaveWebDAVEdit(
		ctx,
		pending.FileID,
		bytes.NewReader(pending.Data),
		pending.SizeBytes,
		pending.Claims.UserID,
		pending.Claims.Email,
		pending.IP,
		shouldCreateVersionSnapshot,
	)
	if err != nil {
		log.Printf("[WebDAV Debounce] Gagal menyimpan file %s ke R2/DB: %v", pending.FileID, err)
	} else {
		log.Printf("[WebDAV Debounce] Sukses commit perubahan file %s (diserap dari %d kali Ctrl+S)", pending.FileID, pending.SaveCount)
	}
}

// FlushAll mem-flush seluruh berkas yang masih tertahan di buffer (dipakai saat shutdown server).
func (h *WebDAVHandler) FlushAll() {
	h.pendingSaves.Range(func(key, value any) bool {
		if fileID, ok := key.(string); ok {
			h.flushPendingSave(fileID)
		}
		return true
	})
}

func escapeXML(s string) string {
	var buf bytes.Buffer
	_ = xml.EscapeText(&buf, []byte(s))
	return buf.String()
}

// GetActiveLock mengembalikan lock aktif untuk file tertentu jika ada dan belum kedaluwarsa.
func (h *WebDAVHandler) GetActiveLock(fileID string) *WebDAVLock {
	val, ok := h.locks.Load(fileID)
	if !ok || val == nil {
		return nil
	}
	lock := val.(*WebDAVLock)
	if time.Now().After(lock.ExpiresAt) {
		h.locks.Delete(fileID)
		return nil
	}
	return lock
}

// GetAllActiveLocks mengembalikan snapshot seluruh lock yang masih aktif di memori.
func (h *WebDAVHandler) GetAllActiveLocks() map[string]*WebDAVLock {
	result := make(map[string]*WebDAVLock)
	now := time.Now()
	h.locks.Range(func(key, value any) bool {
		fileID, ok1 := key.(string)
		lock, ok2 := value.(*WebDAVLock)
		if ok1 && ok2 && lock != nil {
			if now.Before(lock.ExpiresAt) {
				result[fileID] = lock
			} else {
				h.locks.Delete(fileID)
			}
		}
		return true
	})
	return result
}

// LockStatusDTO adalah representasi JSON status lock untuk API client frontend.
type LockStatusDTO struct {
	IsLocked  bool      `json:"isLocked"`
	LockedBy  string    `json:"lockedBy"`
	LockedAt  time.Time `json:"lockedAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// GetLocks mengembalikan daftar berkas yang sedang dibuka/diedit di Microsoft Office Desktop.
func (h *WebDAVHandler) GetLocks(c fiber.Ctx) error {
	locks := h.GetAllActiveLocks()
	data := make(map[string]LockStatusDTO, len(locks))
	for fid, l := range locks {
		data[fid] = LockStatusDTO{
			IsLocked:  true,
			LockedBy:  l.Owner,
			LockedAt:  l.CreatedAt,
			ExpiresAt: l.ExpiresAt,
		}
	}
	return writeOK(c, data)
}

