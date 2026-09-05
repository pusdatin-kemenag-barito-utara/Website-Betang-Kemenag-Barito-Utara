-- 003_create_bidang_folders.sql
-- Relasi many-to-many antara bidang dan folder root yang diizinkan untuk diakses.

CREATE TABLE IF NOT EXISTS kemenag_arsip.bidang_folders (
    bidang_id UUID NOT NULL REFERENCES kemenag_arsip.bidang(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES kemenag_arsip.folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (bidang_id, folder_id)
);

-- Migrasi data awal dari root folders eksisting
INSERT INTO kemenag_arsip.bidang_folders (bidang_id, folder_id)
SELECT bidang_id, id FROM kemenag_arsip.folders
WHERE parent_id IS NULL AND bidang_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Fungsi pemeriksa izin akses folder untuk satu bidang
CREATE OR REPLACE FUNCTION kemenag_arsip.can_bidang_access_folder(p_bidang_id uuid, p_folder_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_root_id uuid;
    v_bidang_id uuid;
BEGIN
    -- Cek jika folder itu sendiri adalah root folder yang diizinkan
    IF EXISTS (
        SELECT 1 FROM kemenag_arsip.bidang_folders WHERE bidang_id = p_bidang_id AND folder_id = p_folder_id
    ) THEN
        RETURN true;
    END IF;

    -- Cek jika folder memiliki bidang_id langsung yang sama
    SELECT f.bidang_id INTO v_bidang_id FROM kemenag_arsip.folders f WHERE f.id = p_folder_id;
    IF v_bidang_id = p_bidang_id THEN
        RETURN true;
    END IF;

    -- Dapatkan root ancestor folder
    WITH RECURSIVE path AS (
        SELECT id, parent_id FROM kemenag_arsip.folders WHERE id = p_folder_id
        UNION ALL
        SELECT f.id, f.parent_id FROM kemenag_arsip.folders f INNER JOIN path p ON f.id = p.parent_id
    )
    SELECT id INTO v_root_id FROM path WHERE parent_id IS NULL LIMIT 1;

    IF v_root_id IS NULL THEN
        RETURN false;
    END IF;

    -- Cek apakah root ancestor ada di bidang_folders atau memiliki bidang_id = p_bidang_id
    RETURN EXISTS (
        SELECT 1 FROM kemenag_arsip.bidang_folders WHERE bidang_id = p_bidang_id AND folder_id = v_root_id
    ) OR EXISTS (
        SELECT 1 FROM kemenag_arsip.folders WHERE id = v_root_id AND bidang_id = p_bidang_id
    );
END;
$$;
