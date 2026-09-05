// Package domain berisi model/entity bisnis utama aplikasi.
package domain

import (
	"encoding/json"
	"time"
)

// Bidang merepresentasikan baris pada tabel kemenag_arsip.bidang.
type Bidang struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

// BidangWithCount adalah hasil list bidang beserta jumlah dokumen aktif dan daftar folder root yang dapat diakses.
type BidangWithCount struct {
	Bidang
	DocCount              int64    `json:"doc_count"`
	AccessibleFolderIDs   []string `json:"accessible_folder_ids"`
	AccessibleFolderNames []string `json:"accessible_folder_names"`
}

// Breadcrumb adalah satu tingkat navigasi folder.
type Breadcrumb struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Folder merepresentasikan baris pada tabel kemenag_arsip.folders.
type Folder struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	ParentID     *string    `json:"parent_id"`
	BidangID     *string    `json:"bidang_id"`
	IsRestricted bool       `json:"is_restricted"`
	IsStarred    bool       `json:"is_starred"`
	Color        *string    `json:"color"`
	CreatedBy    *string    `json:"created_by"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at"`
}

// File merepresentasikan baris pada tabel kemenag_arsip.files.
type File struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	FolderID     *string    `json:"folder_id"`
	BidangID     *string    `json:"bidang_id"`
	R2ObjectKey  string     `json:"r2_object_key"`
	MimeType     string     `json:"mime_type"`
	SizeBytes    int64      `json:"size_bytes"`
	IsRestricted bool       `json:"is_restricted"`
	IsStarred    bool       `json:"is_starred"`
	UploadedBy   *string    `json:"uploaded_by"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at"`
}

// UserBrief berisi ringkasan nama pengguna (untuk join versi file).
type UserBrief struct {
	FullName string `json:"full_name"`
}

// FileVersion merepresentasikan baris pada tabel kemenag_arsip.file_versions.
type FileVersion struct {
	ID             string    `json:"id"`
	FileID         string    `json:"file_id"`
	R2ObjectKey    string    `json:"r2_object_key"`
	SizeBytes      int64     `json:"size_bytes"`
	UploadedBy     *string   `json:"uploaded_by"`
	CreatedAt      time.Time `json:"created_at"`
	UploadedByUser *UserBrief `json:"uploaded_by_user"`
}

// User merepresentasikan akun pengguna pada tabel kemenag_arsip.users.
type User struct {
	ID         string    `json:"id"`
	Email      string    `json:"email"`
	Username   string    `json:"username"`
	FullName   string    `json:"full_name"`
	Role       string    `json:"role"` // 'Super Admin', 'Admin Bidang'
	BidangID   *string   `json:"bidang_id"`
	BidangName *string   `json:"bidang_name,omitempty"`
	IsActive   bool      `json:"is_active"`
	AvatarURL  *string   `json:"avatar_url,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// IsSuperAdmin mengecek apakah pengguna bertindak sebagai Super Admin.
func (u *User) IsSuperAdmin() bool {
	return u.Role == "super_admin" || u.Role == "Super Admin"
}

// AppPermission adalah izin aplikasi pada user pusdatin (legacy).
type AppPermission struct {
	AppID string `json:"app_id"`
	Role  string `json:"role"`
}

// PusdatinUser adalah hasil RPC get_pusdatin_user (schema kemenag_pusdatin).
type PusdatinUser struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Email          string          `json:"email"`
	Role           string          `json:"role"`
	Status         string          `json:"status"`
	AppPermissions json.RawMessage `json:"app_permissions"`
}

// HasPermission mengecek apakah user memiliki akses ke aplikasi tertentu.
func (p *PusdatinUser) HasPermission(appID string) bool {
	if p.IsSuperAdmin() {
		return true
	}
	if len(p.AppPermissions) == 0 {
		return false
	}
	var perms []AppPermission
	if err := json.Unmarshal(p.AppPermissions, &perms); err != nil {
		return false
	}
	for _, perm := range perms {
		if perm.AppID == appID && perm.Role != "" && perm.Role != "none" {
			return true
		}
	}
	return false
}

// IsSuperAdmin menormalisasi pengecekan role super admin.
func (p *PusdatinUser) IsSuperAdmin() bool {
	return p.Role == "super_admin" || p.Role == "Super Admin"
}

// Session adalah muatan cookie sesi `earsip-auth`.
type Session struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
}

// AuthUser adalah konteks user terautentikasi yang dilampirkan pada request.
type AuthUser struct {
	ID           string
	Email        string
	Role         string
	BidangID     *string
	IsSuperAdmin bool
}

// FolderSummary adalah folder + total ukuran (hasil RPC get_folders_size).
type FolderSummary struct {
	Folder
	TotalSize int64 `json:"total_size"`
}

// TrashItem adalah item pada halaman recycle bin.
type TrashItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"` // folder | file
	DeletedAt   string `json:"deleted_at"`
	ExpiresAt   string `json:"expires_at"`
	R2ObjectKey string `json:"r2_object_key"`
	MimeType    string `json:"mime_type"`
	SizeBytes   int64  `json:"size_bytes"`
}

// StorageUsage adalah hasil perhitungan penggunaan penyimpanan.
type StorageUsage struct {
	UsedBytes  int64   `json:"used_bytes"`
	LimitBytes int64   `json:"limit_bytes"`
	Percentage float64 `json:"percentage"`
}

// AppSettings adalah pengaturan global aplikasi.
type AppSettings struct {
	DisableRightClick       bool   `json:"disable_right_click"`
	DisablePrintShortcut    bool   `json:"disable_print_shortcut"`
	EnableWatermark         bool   `json:"enable_watermark"`
	MaxUploadSizeMB         int    `json:"max_upload_size_mb"`
	DefaultShareExpiryHours int    `json:"default_share_expiry_hours"`
	DefaultPdfViewerMode    string `json:"default_pdf_viewer_mode"`
}

// DownloadFile adalah satu file untuk dikompres menjadi ZIP.
type DownloadFile struct {
	R2ObjectKey string
	Path        string // path relatif di dalam ZIP
}

// DownloadFileRequest adalah permintaan unduh: satu file atau satu folder
// (beserta seluruh isinya).
type DownloadFileRequest struct {
	ID   string `json:"id"`
	Type string `json:"type"` // file | folder
}

// RecentUpload adalah ringkasan satu file untuk daftar unggahan terbaru.
type RecentUpload struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	MimeType  string    `json:"mime_type"`
	SizeBytes int64     `json:"size_bytes"`
	CreatedAt time.Time `json:"created_at"`
}

// DashboardStats adalah ringkasan statistik untuk halaman dashboard.
type DashboardStats struct {
	TotalFiles     int64          `json:"total_files"`
	TotalStorage   int64          `json:"total_storage"`
	Recent24hCount int64          `json:"recent_24h_count"`
	ThisMonthCount int64          `json:"this_month_count"`
	RecentUploads  []RecentUpload `json:"recent_uploads"`
}
