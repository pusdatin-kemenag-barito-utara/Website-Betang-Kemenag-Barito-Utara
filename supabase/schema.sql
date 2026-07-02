-- E-Arsip Kemenag Database Schema

CREATE SCHEMA IF NOT EXISTS kemenag_arsip;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: bidang (Department/Seksi)
CREATE TABLE IF NOT EXISTS kemenag_arsip.bidang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: users_metadata
-- Note: users table is managed by Supabase Auth (auth.users). 
-- We create a metadata table linked via foreign key to auth.users.
CREATE TABLE IF NOT EXISTS kemenag_arsip.users_metadata (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'Admin Bidang')),
    bidang_id UUID REFERENCES kemenag_arsip.bidang(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: folders
CREATE TABLE IF NOT EXISTS kemenag_arsip.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES kemenag_arsip.folders(id) ON DELETE CASCADE,
    bidang_id UUID REFERENCES kemenag_arsip.bidang(id) ON DELETE CASCADE,
    is_restricted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES kemenag_arsip.users_metadata(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: files
CREATE TABLE IF NOT EXISTS kemenag_arsip.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    folder_id UUID REFERENCES kemenag_arsip.folders(id) ON DELETE CASCADE,
    bidang_id UUID REFERENCES kemenag_arsip.bidang(id) ON DELETE CASCADE,
    r2_object_key VARCHAR(1024) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_restricted BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES kemenag_arsip.users_metadata(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE kemenag_arsip.bidang ENABLE ROW LEVEL SECURITY;
ALTER TABLE kemenag_arsip.users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE kemenag_arsip.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kemenag_arsip.files ENABLE ROW LEVEL SECURITY;

-- Helper Function to get user role and bidang_id
CREATE OR REPLACE FUNCTION kemenag_arsip.get_user_role() RETURNS text AS $$
  SELECT role FROM kemenag_arsip.users_metadata WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION kemenag_arsip.get_user_bidang_id() RETURNS uuid AS $$
  SELECT bidang_id FROM kemenag_arsip.users_metadata WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for bidang
-- Super Admin can read/write everything. Admin Bidang can only read.
CREATE POLICY "Super Admins can do everything on bidang" ON kemenag_arsip.bidang
    FOR ALL USING (kemenag_arsip.get_user_role() = 'Super Admin');

CREATE POLICY "Admin Bidang can view all bidang" ON kemenag_arsip.bidang
    FOR SELECT USING (true); -- everyone can view the names of bidang

-- RLS Policies for users_metadata
CREATE POLICY "Super Admins can do everything on users" ON kemenag_arsip.users_metadata
    FOR ALL USING (kemenag_arsip.get_user_role() = 'Super Admin');

CREATE POLICY "Users can view their own metadata" ON kemenag_arsip.users_metadata
    FOR SELECT USING (auth.uid() = id);

-- RLS Policies for folders
CREATE POLICY "Super Admins can do everything on folders" ON kemenag_arsip.folders
    FOR ALL USING (kemenag_arsip.get_user_role() = 'Super Admin');

CREATE POLICY "Admin Bidang can do everything on their own bidang folders" ON kemenag_arsip.folders
    FOR ALL USING (
        kemenag_arsip.get_user_role() = 'Admin Bidang' AND 
        bidang_id = kemenag_arsip.get_user_bidang_id()
    );

-- RLS Policies for files
CREATE POLICY "Super Admins can do everything on files" ON kemenag_arsip.files
    FOR ALL USING (kemenag_arsip.get_user_role() = 'Super Admin');

CREATE POLICY "Admin Bidang can do everything on their own bidang files" ON kemenag_arsip.files
    FOR ALL USING (
        kemenag_arsip.get_user_role() = 'Admin Bidang' AND 
        bidang_id = kemenag_arsip.get_user_bidang_id()
    );

-- Table: file_versions
CREATE TABLE IF NOT EXISTS kemenag_arsip.file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES kemenag_arsip.files(id) ON DELETE CASCADE,
    r2_object_key VARCHAR(1024) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES kemenag_arsip.users_metadata(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on file_versions
ALTER TABLE kemenag_arsip.file_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_versions
CREATE POLICY "Super Admins can do everything on file_versions" ON kemenag_arsip.file_versions
    FOR ALL USING (kemenag_arsip.get_user_role() = 'Super Admin');

CREATE POLICY "Admin Bidang can do everything on their own file versions" ON kemenag_arsip.file_versions
    FOR ALL USING (
        kemenag_arsip.get_user_role() = 'Admin Bidang' AND 
        EXISTS (
            SELECT 1 FROM kemenag_arsip.files f 
            WHERE f.id = kemenag_arsip.file_versions.file_id AND f.bidang_id = kemenag_arsip.get_user_bidang_id()
        )
    );

-- Full Text Search
ALTER TABLE kemenag_arsip.files ADD COLUMN IF NOT EXISTS fts_doc tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
) STORED;

CREATE INDEX IF NOT EXISTS files_fts_doc_idx ON kemenag_arsip.files USING GIN (fts_doc);

ALTER TABLE kemenag_arsip.folders ADD COLUMN IF NOT EXISTS fts_doc tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
) STORED;

CREATE INDEX IF NOT EXISTS folders_fts_doc_idx ON kemenag_arsip.folders USING GIN (fts_doc);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON kemenag_arsip.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON kemenag_arsip.folders(parent_id);

-- Trigger to sync users_metadata to auth.users raw_app_meta_data for JWT Claims
CREATE OR REPLACE FUNCTION kemenag_arsip.sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || 
      json_build_object('role', NEW.role, 'bidang_id', NEW.bidang_id)::jsonb
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_users_metadata_change ON kemenag_arsip.users_metadata;
CREATE TRIGGER on_users_metadata_change
  AFTER INSERT OR UPDATE ON kemenag_arsip.users_metadata
  FOR EACH ROW EXECUTE FUNCTION kemenag_arsip.sync_user_metadata();

-- RPC Function for Folder Size Calculation (Recursive)
CREATE OR REPLACE FUNCTION kemenag_arsip.get_folder_size(target_folder_id UUID)
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT := 0;
BEGIN
    WITH RECURSIVE folder_tree AS (
        SELECT id FROM kemenag_arsip.folders WHERE id = target_folder_id
        UNION ALL
        SELECT f.id FROM kemenag_arsip.folders f
        INNER JOIN folder_tree t ON f.parent_id = t.id
    )
    SELECT COALESCE(SUM(size_bytes), 0) INTO total_size
    FROM kemenag_arsip.files
    WHERE folder_id IN (SELECT id FROM folder_tree)
      AND deleted_at IS NULL;
      
    RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function for Breadcrumbs Path (Recursive)
CREATE OR REPLACE FUNCTION kemenag_arsip.get_folder_path(target_folder_id UUID)
RETURNS TABLE(id UUID, name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_path AS (
        SELECT f.id, f.name, f.parent_id
        FROM kemenag_arsip.folders f
        WHERE f.id = target_folder_id
        
        UNION ALL
        
        SELECT f.id, f.name, f.parent_id
        FROM kemenag_arsip.folders f
        INNER JOIN folder_path p ON f.id = p.parent_id
    )
    SELECT p.id, p.name FROM folder_path p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function to recursively fetch all files in a folder and its subfolders
CREATE OR REPLACE FUNCTION kemenag_arsip.get_all_files_in_folder(target_folder_id UUID)
RETURNS TABLE(file_id UUID, file_name VARCHAR, r2_object_key VARCHAR, relative_path VARCHAR) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        -- Base case: the target folder itself
        SELECT id, name::VARCHAR as path
        FROM kemenag_arsip.folders
        WHERE id = target_folder_id
        
        UNION ALL
        
        -- Recursive step: subfolders
        SELECT f.id, (t.path || '/' || f.name)::VARCHAR
        FROM kemenag_arsip.folders f
        INNER JOIN folder_tree t ON f.parent_id = t.id
    )
    SELECT 
        f.id,
        f.name,
        f.r2_object_key,
        t.path
    FROM kemenag_arsip.files f
    INNER JOIN folder_tree t ON f.folder_id = t.id
    WHERE f.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
