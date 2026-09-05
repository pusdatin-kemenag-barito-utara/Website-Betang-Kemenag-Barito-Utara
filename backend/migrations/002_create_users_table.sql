-- Migration: 002_create_users_table.sql
-- Skema tabel mandiri manajemen pengguna SI BETANG (schema: kemenag_arsip)

CREATE TABLE IF NOT EXISTS kemenag_arsip.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Admin Bidang' CHECK (role IN ('Super Admin', 'Admin Bidang')),
    bidang_id UUID REFERENCES kemenag_arsip.bidang(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON kemenag_arsip.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON kemenag_arsip.users(username);
CREATE INDEX IF NOT EXISTS idx_users_bidang_id ON kemenag_arsip.users(bidang_id);

-- Seeding akun Super Admin utama (baritoutara@kemenag.go.id)
INSERT INTO kemenag_arsip.users (id, email, username, full_name, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'full_name', 'ADMIN KABUPATEN'),
    'Super Admin',
    true
FROM auth.users
WHERE email = 'baritoutara@kemenag.go.id'
ON CONFLICT (id) DO UPDATE SET 
    role = 'Super Admin',
    is_active = true,
    full_name = EXCLUDED.full_name;

-- Seeding akun-akun admin seksi bidang yang telah ada di auth.users
INSERT INTO kemenag_arsip.users (id, email, username, full_name, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' OR raw_app_meta_data->>'role' = 'super_admin' THEN 'Super Admin'
        ELSE 'Admin Bidang'
    END,
    true
FROM auth.users
WHERE email LIKE 'admin%@kemenag.go.id'
ON CONFLICT (id) DO NOTHING;

-- Sinkronisasi asosiasi bidang untuk akun admin bidang bawaan
UPDATE kemenag_arsip.users SET bidang_id = 'e6c7df17-8292-4c04-be52-8b3e85219a81' WHERE email = 'admin.tu@kemenag.go.id';
UPDATE kemenag_arsip.users SET bidang_id = 'dab7fc42-2a81-4d4d-85d5-63a07973462d' WHERE email = 'admin.penmad@kemenag.go.id';
UPDATE kemenag_arsip.users SET bidang_id = '67c188e9-7a6a-47aa-899e-c70726cd128f' WHERE email = 'admin.pai@kemenag.go.id';
UPDATE kemenag_arsip.users SET bidang_id = '419d9da9-9350-41e4-abcb-1ae4f35ce970' WHERE email = 'admin.pdpontren@kemenag.go.id';
UPDATE kemenag_arsip.users SET bidang_id = '58f2b8b0-f721-4337-bff0-26ddac3ab68a' WHERE email = 'admin.bimasislam@kemenag.go.id';
UPDATE kemenag_arsip.users SET bidang_id = '27ecde4c-9cce-498e-85d0-af5b3446044e' WHERE email = 'admin.kristen@kemenag.go.id';
UPDATE kemenag_arsip.users SET bidang_id = '88dce5ee-9b90-49a1-b693-4d9e3dc19617' WHERE email = 'admin.zawa@kemenag.go.id';
UPDATE kemenag_arsip.users SET bidang_id = 'c0b4adf8-ea38-46c4-b127-799b406245af' WHERE email = 'admin.hindu@kemenag.go.id';
