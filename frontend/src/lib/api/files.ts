import { request, buildApiUrl } from "./client";
import { invalidateClientFolderCache } from "./folders";

/**
 * Custom Cloudflare Worker CDN domain untuk data arsip dan dokumen Kemenag Barito Utara.
 * Dilengkapi dengan HTTP/3, Edge Caching 1 tahun, Range Streaming untuk PDF, dan zero CORS issues.
 */
export const R2_CDN_ORIGIN = "https://files.kemenag-baritoutara.com";

/**
 * Mengubah object key di Cloudflare R2 menjadi URL publik cepat melalui Cloudflare Worker CDN.
 * Contoh output: https://files.kemenag-baritoutara.com/arsip/global/<folderId>/<file>
 */
export function getR2FileUrl(objectKey?: string | null): string {
  if (!objectKey) return "";
  if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
    return objectKey;
  }
  const cleanKey = objectKey.replace(/^\/+/, "");
  if (cleanKey.startsWith("arsip/")) {
    return `${R2_CDN_ORIGIN}/${cleanKey}`;
  }
  return `${R2_CDN_ORIGIN}/arsip/${cleanKey}`;
}

export async function saveFileMetadata({
  name,
  folderId,
  r2ObjectKey,
  mimeType,
  sizeBytes,
}: {
  name: string;
  folderId: string | null;
  r2ObjectKey: string;
  mimeType: string;
  sizeBytes: number;
}) {
  try {
    invalidateClientFolderCache();
    const cleanFolderId =
      folderId && folderId !== "root" && folderId !== "undefined" && folderId !== "null" && folderId !== "starred"
        ? folderId
        : "root";
    const res = await request("/files/metadata", {
      method: "POST",
      body: JSON.stringify({
        name,
        folderId: cleanFolderId,
        r2ObjectKey,
        mimeType,
        sizeBytes,
      }),
    });
    if (!res.success) throw new Error(res.error || "Database error");
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function uploadFileDirect(file: File, folderId: string | null, name?: string) {
  try {
    const cleanFolderId =
      folderId && folderId !== "root" && folderId !== "undefined" && folderId !== "null" && folderId !== "starred"
        ? folderId
        : "root";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderId", cleanFolderId);
    formData.append("name", name || file.name);

    const res = await fetch(buildApiUrl("/files/upload"), {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const body: any = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      throw new Error(body?.error || "Gagal mengunggah file.");
    }
    invalidateClientFolderCache();
    return { success: true, data: body.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getPresignedUploadUrl(filePath: string, fileType: string) {
  try {
    const res = await request("/files/presign-upload", {
      method: "POST",
      body: JSON.stringify({ filePath, contentType: fileType }),
    });
    if (!res.success || !res.data?.presignedUrl) {
      throw new Error(res.error || "Gagal mendapatkan URL upload");
    }
    return { success: true, presignedUrl: res.data.presignedUrl, r2ObjectKey: res.data.r2ObjectKey };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getPresignedDownloadUrl(r2ObjectKey: string, downloadName?: string) {
  try {
    const res = await request("/files/presign-download", {
      method: "POST",
      body: JSON.stringify({ r2ObjectKey, downloadName: downloadName || "" }),
    });
    if (!res.success || !res.data?.presignedUrl) {
      throw new Error(res.error || "Gagal mendapatkan tautan dari server");
    }
    return { success: true, presignedUrl: res.data.presignedUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getFileVersions(fileId: string) {
  try {
    const res = await request(`/files/${encodeURIComponent(fileId)}/versions`);
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.error || "Gagal memuat riwayat versi");
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function restoreFileVersion(fileId: string, versionId: string, _folderId: string | null) {
  try {
    const res = await request("/files/restore-version", {
      method: "POST",
      body: JSON.stringify({ fileId, versionId }),
    });
    if (!res.success) throw new Error(res.error || "Gagal memulihkan versi");
    invalidateClientFolderCache();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function downloadZip(items: { id: string; type: "folder" | "file" }[]) {
  return request<{ success: boolean; blob?: Blob; filename?: string; error?: string }>("/files/zip", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function createShareLink(fileId: string, expiryHours = 24) {
  try {
    const res = await request(`/files/${encodeURIComponent(fileId)}/share-link`, {
      method: "POST",
      body: JSON.stringify({ expiryHours }),
    });
    if (!res.success || !res.data?.shareUrl) throw new Error(res.error || "Gagal membuat tautan berbagi");
    return { success: true, shareUrl: res.data.shareUrl, expiryHours: res.data.expiryHours };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Meminta tautan WebDAV terenkripsi untuk mengedit berkas di Microsoft Office Desktop
 * dengan fitur Auto-Save (Ctrl + S langsung tersimpan ke server SI BETANG).
 */
export async function getOfficeWebDavLink(fileId: string) {
  try {
    const res = await request<{
      success: boolean;
      webdavPath?: string;
      fileName?: string;
      error?: string;
    }>(`/files/${encodeURIComponent(fileId)}/webdav-link`, {
      method: "POST",
    });
    return res;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface FileLockInfo {
  isLocked: boolean;
  lockedBy?: string | null;
  lockedAt?: string | null;
  expiresAt?: string | null;
}

/**
 * Mengambil snapshot berkas yang sedang aktif dibuka/diedit di Microsoft Office Desktop
 */
export async function getActiveFileLocks(): Promise<Record<string, FileLockInfo>> {
  try {
    const res = await request<{
      success: boolean;
      data?: Record<string, FileLockInfo>;
      error?: string;
    }>("/files/locks");
    if (res.success && res.data) {
      return res.data;
    }
    return {};
  } catch {
    return {};
  }
}

export interface BackendFileDetail {
  id: string;
  name: string;
  folder_id?: string | null;
  bidang_id?: string | null;
  r2_object_key: string;
  mime_type: string;
  size_bytes: number;
  is_starred?: boolean;
  is_locked?: boolean;
  locked_by?: string | null;
  locked_at?: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * Mengambil detail berkas terbaru langsung dari backend, termasuk r2_object_key terkini
 * setelah berkas disunting melalui WebDAV di Microsoft Office Desktop.
 */
export async function getFileDetail(fileId: string): Promise<{ success: boolean; data?: BackendFileDetail; error?: string }> {
  try {
    const res = await request<{
      success: boolean;
      data?: BackendFileDetail;
      error?: string;
    }>(`/files/${encodeURIComponent(fileId)}`);
    return res;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
