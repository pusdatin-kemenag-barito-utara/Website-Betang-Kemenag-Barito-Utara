# SI BETANG (Betang Kemenag)

Aplikasi Manajemen Arsip Digital **Kementerian Agama Kabupaten Barito Utara**.

Repositori ini adalah **rewrite penuh (monorepo)** dari aplikasi lama (Next.js + Supabase)
menjadi arsitektur baru:

| Layer  | Teknologi                          | Folder     |
| ------ | ---------------------------------- | ---------- |
| Backend| Go (Fiber v3) + PostgreSQL (pgx v5)| `backend/` |
| Frontend | Astro v7 (SSR) + React islands   | `frontend/`|
| Storage | Cloudflare R2 (presigned URL)     | -          |
| Auth   | Supabase Auth (verifikasi JWT HS256)| -         |

---

## Struktur Monorepo

```
.
├── backend/                     # API Go Fiber
│   ├── cmd/api/main.go          # Entry point
│   └── internal/
│       ├── auth/                # Verifikasi JWT Supabase
│       ├── config/              # Konfigurasi dari env
│       ├── domain/              # Model/entity bisnis
│       ├── handler/             # HTTP handler (folder, file, trash, bidang, dll.)
│       ├── middleware/          # CORS manual + otentikasi sesi
│       ├── repository/          # Akses PostgreSQL (schema kemenag_arsip & kemenag_pusdatin)
│       ├── server/              # Perakitan server + rute
│       ├── service/             # Logika bisnis
│       └── storage/             # S3 client Cloudflare R2
└── frontend/                    # Astro SSR + React islands
    ├── astro.config.mjs         # SSR node standalone + PWA + Tailwind v4
    └── src/
        ├── layouts/             # BaseLayout, DashboardLayout
        ├── lib/                 # api.ts (klien), server.ts (SSR), utils, types
        ├── middleware.ts        # Maintenance check, sesi, CSP
        ├── pages/               # index, login, bidang, trash, settings, maintenance, folders/[folderId]
        └── components/          # Islands React (FileBrowser, Bidang, Trash, Settings, layout, ui, auth)
```

---

## Variabel Lingkungan

### Backend (`backend/.env`)

```dotenv
# Server
PORT=8080

# Supabase (Auth)
SUPABASE_URL=https://db.kemenag-baritoutara.com
SUPABASE_ANON_KEY=

# PostgreSQL (satu basis data, dua schema)
DATABASE_URL=postgresql://user:pass@host:5432/postgres

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=e-arsip-betang

# CORS (pisahkan dengan koma)
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Cloudflare Turnstile
TURNSTILE_SECRET_KEY=

# Pusdatin (opsional, untuk status maintenance)
PUSDATIN_URL=https://pusdatin.kemenag-baritoutara.com
```

### Frontend (`frontend/.env`)

```dotenv
# Origin API backend; kosong = same-origin (reverse proxy).
PUBLIC_API_URL=
# Site key Turnstile
PUBLIC_TURNSTILE_SITE_KEY=
# URL Pusdatin (status maintenance + iframe halaman maintenance)
PUBLIC_PUSDATIN_URL=https://pusdatin.kemenag-baritoutara.com
```

---

## Menjalankan Pengembangan

### Sekaligus (Frontend & Backend) — Rekomendasi

Cukup jalankan dari root:
```bash
npm run dev
```
> Perintah ini menggunakan **Concurrently** untuk menjalankan:
> - **Backend API** (Go Fiber + **Air** live-reload pada port `8080`)
> - **Frontend** (Astro SSR pada port `3000`)

---

### Menjalankan Terpisah (Opsional)

#### Backend (Go + Air Live-Reload)
```bash
# Dari root:
npm run dev:backend

# Atau langsung di folder backend:
cd backend
air
```

#### Frontend (Astro)
```bash
# Dari root:
npm run dev:frontend

# Atau langsung di folder frontend:
cd frontend
npm run dev
```

Frontend berjalan di `http://localhost:3000`. Bila `PUBLIC_API_URL` kosong,
minta reverse proxy (atau konfigurasi dev) meneruskan `/api/v1` ke backend.

---

## Build Produksi

### Backend

```bash
cd backend
go build -o bin/api ./cmd/api
```

### Frontend

```bash
# Dari root repo (workspace npm)
npm install
npm run build --workspace=betang-kemenag-frontend
```

Output SSR siap jalan di `frontend/dist/` (mode `standalone`),
dengan health check di `/api/health` untuk Coolify.

---

## Konsep Penting

- **Sesi**: cookie httpOnly `earsip-auth` (access + refresh token Supabase).
  Backend memverifikasi JWT HS256; frontend memeriksa sesi via `GET /auth/me`.
- **Respons API**: selalu `{ success, data, error }`.
- **Upload/Download R2**: backend membuat presigned URL; frontend meneruskannya
  lewat proxy same-origin `/api/proxy-upload` & `/api/proxy-download`
  (menghindari kendala CORS R2 di browser).
- **Zip**: `POST /files/zip` di-stream dari backend (menggantikan JSZip klien).
- **Hak akses**: halaman Bidang & Pengaturan hanya untuk super admin
  (role `super_admin` dari schema `kemenag_pusdatin`).
- **Maintenance**: polling status aplikasi Pusdatin setiap 15 detik;
  saat `maintenance`, pengguna dialihkan ke `/maintenance`.
