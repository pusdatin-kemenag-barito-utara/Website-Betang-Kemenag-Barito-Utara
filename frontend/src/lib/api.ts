// Lapisan klien API: pengganti server actions lama.
// Seluruh pemanggilan memakai fungsi dengan nama dan bentuk hasil yang sama
// seperti aplikasi lama, tetapi kini berkomunikasi dengan backend Go
// (cookie sesi `earsip-auth` dikirim otomatis via credentials: include).

/** Origin backend; kosong berarti same-origin (reverse proxy). */
const API_ORIGIN = (import.meta.env.PUBLIC_API_URL || "").replace(/\/+$/, "")

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })

  // Response ZIP (unduhan) tidak berbentuk JSON.
  const contentType = res.headers.get("Content-Type") || ""
  if (contentType.includes("application/zip") || contentType.includes("application/octet-stream")) {
    if (!res.ok) {
      return { success: false, error: "Gagal mengunduh file." } as T
    }
    const blob = await res.blob()
    return { success: true, blob, filename: res.headers.get("Content-Disposition") || "" } as T
  }

  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok || !body?.success) {
    const msg =
      body?.error || (res.status === 401 ? "Sesi berakhir. Silakan masuk kembali." : "Terjadi kesalahan sistem.")
    const result: any = { success: false, error: msg }
    if (res.status === 401) {
      result.unauthorized = true
    }
    return result as T
  }

  return body as T
}

// ============================================================
// Autentikasi
// ============================================================

/** Login: bentuk hasil sama dengan loginAction lama ({error} bila gagal). */
export async function loginAction(_prevState: { error: string | null } | null, formData: FormData) {
  const email = (formData.get("email") as string) || ""
  const password = (formData.get("password") as string) || ""
  const turnstileToken = (formData.get("cf-turnstile-response") as string) || ""
  const rememberMe = (formData.get("rememberMe") as string) === "true"

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." }
  }

  try {
    const res = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, turnstileToken, rememberMe }),
    })
    if (!res.success) {
      return { error: res.error || "Email atau password yang Anda masukkan salah." }
    }
    return { error: null as string | null, user: res.data?.user }
  } catch {
    return { error: "Terjadi kesalahan jaringan saat memproses login." }
  }
}

/** Informasi user yang sedang login (nama, role, isSuperAdmin). */
export async function getCurrentUser() {
  return request("/auth/me")
}

/** Keluar dari sesi. */
export async function logoutAction() {
  try {
    await request("/auth/logout", { method: "POST" })
    window.location.href = "/login"
  } catch {
    window.location.href = "/login"
  }
}

// ============================================================
// Folder & File (paritas app/(dashboard)/folders/actions.ts)
// ============================================================

export async function getFolderContents(folderId: string, query = "") {
  try {
    const cleanId = folderId || "root";
    const q = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await request(`/folders/${encodeURIComponent(cleanId)}${q}`);
    if (!res.success) throw new Error(res.error || "Gagal memuat isi folder");
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getBreadcrumbs(folderId: string) {
  try {
    const cleanId = folderId || "root";
    const res = await request(`/folders/${encodeURIComponent(cleanId)}/breadcrumbs`);
    if (!res.success) throw new Error(res.error || "Gagal memuat breadcrumbs");
    const data = Array.isArray(res.data) ? [...res.data].reverse() : [];
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function createFolder(name: string, parentId: string | null) {
  try {
    const res = await request("/folders", {
      method: "POST",
      body: JSON.stringify({ name, parentId: parentId || "root" }),
    })
    if (!res.success) throw new Error(res.error || "Gagal membuat folder")
    return { success: true, data: res.data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function saveFileMetadata({
  name,
  folderId,
  r2ObjectKey,
  mimeType,
  sizeBytes,
}: {
  name: string
  folderId: string | null
  r2ObjectKey: string
  mimeType: string
  sizeBytes: number
}) {
  try {
    const res = await request("/files/metadata", {
      method: "POST",
      body: JSON.stringify({
        name,
        folderId: folderId || "root",
        r2ObjectKey,
        mimeType,
        sizeBytes,
      }),
    })
    if (!res.success) throw new Error(res.error || "Database error")
    return { success: true, data: res.data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getPresignedUploadUrl(filePath: string, fileType: string) {
  try {
    const res = await request("/files/presign-upload", {
      method: "POST",
      body: JSON.stringify({ filePath, contentType: fileType }),
    })
    if (!res.success || !res.data?.presignedUrl) {
      throw new Error(res.error || "Gagal mendapatkan URL upload")
    }
    return { success: true, presignedUrl: res.data.presignedUrl, r2ObjectKey: res.data.r2ObjectKey }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getPresignedDownloadUrl(r2ObjectKey: string, downloadName?: string) {
  try {
    const res = await request("/files/presign-download", {
      method: "POST",
      body: JSON.stringify({ r2ObjectKey, downloadName: downloadName || "" }),
    })
    if (!res.success || !res.data?.presignedUrl) {
      throw new Error(res.error || "Gagal mendapatkan tautan dari server")
    }
    return { success: true, presignedUrl: res.data.presignedUrl }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteItem(id: string, type: "folder" | "file", _folderId: string | null) {
  try {
    const res = await request("/folders/delete", {
      method: "POST",
      body: JSON.stringify({ id, type }),
    })
    if (!res.success) throw new Error(res.error || "Gagal menghapus item")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteItemsBatch(items: { id: string; type: "folder" | "file" }[], _folderId: string | null) {
  try {
    const res = await request("/folders/delete-batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    })
    if (!res.success) throw new Error(res.error || "Gagal menghapus item")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function renameItem(id: string, type: "folder" | "file", newName: string, _folderId: string | null) {
  try {
    const res = await request("/folders/rename", {
      method: "POST",
      body: JSON.stringify({ id, type, newName }),
    })
    if (!res.success) throw new Error(res.error || "Gagal mengubah nama")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function moveItem(
  itemId: string,
  itemType: "folder" | "file",
  targetFolderId: string | null,
  _currentFolderId: string | null,
) {
  try {
    if (itemType === "folder" && itemId === targetFolderId) {
      throw new Error("Tidak dapat memindahkan folder ke dalam dirinya sendiri")
    }
    const res = await request("/folders/move", {
      method: "POST",
      body: JSON.stringify({ id: itemId, type: itemType, targetFolderId: targetFolderId || "root" }),
    })
    if (!res.success) throw new Error(res.error || "Gagal memindahkan item")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function copyItem(
  itemId: string,
  itemType: "folder" | "file",
  targetFolderId: string | null,
  _currentFolderId: string | null,
) {
  try {
    if (itemType === "folder" && itemId === targetFolderId) {
      throw new Error("Tidak dapat menyalin folder ke dalam dirinya sendiri")
    }
    const res = await request("/folders/copy", {
      method: "POST",
      body: JSON.stringify({ id: itemId, type: itemType, targetFolderId: targetFolderId || "root" }),
    })
    if (!res.success) throw new Error(res.error || "Gagal menyalin item")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Daftar folder datar (id, name, parent_id) untuk modal pindah/salin. */
export async function getFoldersByBidang() {
  try {
    const res = await request("/folders/tree")
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.error || "Gagal memuat daftar folder")
    const data = res.data.map((f: any) => ({ id: f.id, name: f.name, parent_id: f.parent_id || null }))
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getFileVersions(fileId: string) {
  try {
    const res = await request(`/files/${encodeURIComponent(fileId)}/versions`)
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.error || "Gagal memuat riwayat versi")
    return { success: true, data: res.data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function restoreFileVersion(fileId: string, versionId: string, _folderId: string | null) {
  try {
    const res = await request("/files/restore-version", {
      method: "POST",
      body: JSON.stringify({ fileId, versionId }),
    })
    if (!res.success) throw new Error(res.error || "Gagal memulihkan versi")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Unduh satu/beberapa item sebagai ZIP langsung dari server
 * (menggantikan getDownloadUrlsForItems + JSZip di browser).
 * Satu file tunggal pun di-zip agar perilaku konsisten.
 */
export async function downloadZip(items: { id: string; type: "folder" | "file" }[]) {
  return request<{ success: boolean; blob?: Blob; filename?: string; error?: string }>("/files/zip", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

// ============================================================
// Bidang (paritas app/(dashboard)/bidang/actions.ts)
// ============================================================

export async function createBidang(name: string, sort_order: number = 0) {
  try {
    if (!name || name.trim() === "") {
      return { success: false, error: "Nama bidang tidak boleh kosong" }
    }
    const res = await request("/bidang", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), sortOrder: sort_order }),
    })
    if (!res.success) throw new Error(res.error || "Gagal menambahkan bidang")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateBidang(id: string, name: string, sort_order: number = 0) {
  try {
    if (!name || name.trim() === "") {
      return { success: false, error: "Nama bidang tidak boleh kosong" }
    }
    const res = await request(`/bidang/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), sortOrder: sort_order }),
    })
    if (!res.success) throw new Error(res.error || "Gagal memperbarui bidang")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteBidang(id: string) {
  try {
    const res = await request(`/bidang/${encodeURIComponent(id)}`, { method: "DELETE" })
    if (!res.success) throw new Error(res.error || "Gagal menghapus bidang")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function reorderBidang(items: { id: string; sort_order: number }[]) {
  try {
    const res = await request("/bidang/reorder", {
      method: "POST",
      body: JSON.stringify({ items }),
    })
    if (!res.success) throw new Error(res.error || "Gagal menyimpan urutan bidang")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ============================================================
// Recycle Bin (paritas app/(dashboard)/trash/actions.ts)
// ============================================================

export async function restoreTrashItem(id: string, type: "folder" | "file") {
  try {
    const res = await request("/trash/restore", {
      method: "POST",
      body: JSON.stringify({ id, type }),
    })
    if (!res.success) throw new Error(res.error || "Gagal merestore item")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function restoreTrashItemsBatch(items: { id: string; type: "folder" | "file" }[]) {
  try {
    const res = await request("/trash/restore-batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    })
    if (!res.success) throw new Error(res.error || "Gagal memulihkan item terpilih")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function permanentDeleteTrashItems(items: { id: string; type: "folder" | "file" }[]) {
  try {
    const res = await request("/trash/permanent-delete", {
      method: "POST",
      body: JSON.stringify({ items }),
    })
    if (!res.success) throw new Error(res.error || "Gagal menghapus item permanen")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ============================================================
// Pengaturan (paritas app/(dashboard)/settings/actions.ts)
// ============================================================

export async function getAppSettings() {
  try {
    const res = await request("/settings")
    if (!res.success) throw new Error(res.error || "Gagal mengambil pengaturan")
    return { success: true, disableRightClick: res.data?.disable_right_click ?? true }
  } catch (error) {
    console.error("Error fetching settings:", error)
    return { success: false, error: "Gagal mengambil pengaturan", disableRightClick: true }
  }
}

export async function updateDisableRightClick(disableRightClick: boolean) {
  try {
    const res = await request("/settings", {
      method: "PUT",
      body: JSON.stringify({ disableRightClick }),
    })
    if (!res.success) {
      if (res.unauthorized) {
        window.location.href = "/login"
      }
      throw new Error(res.error || "Gagal menyimpan pengaturan")
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan" }
  }
}

// ============================================================
// Penyimpanan & Statistik
// ============================================================

/** Penggunaan penyimpanan (paritas app/(dashboard)/actions/storage.ts). */
export async function getStorageUsage() {
  try {
    const res = await request("/storage/usage")
    if (!res.success || !res.data) throw new Error(res.error || "Gagal memuat penggunaan penyimpanan")
    return {
      success: true,
      usedBytes: res.data.used_bytes || 0,
      limitBytes: res.data.limit_bytes || 1,
      percentage: res.data.percentage || 0,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Statistik dashboard. */
export async function getDashboardStats() {
  return request("/stats")
}

// ============================================================
// Fitur Starred, Folder Color, dan Share Link (Google Drive Style)
// ============================================================

export async function toggleStar(id: string, type: "folder" | "file", isStarred: boolean) {
  try {
    const res = await request("/items/star", {
      method: "POST",
      body: JSON.stringify({ id, type, isStarred }),
    })
    if (!res.success) throw new Error(res.error || "Gagal mengubah status bintang")
    return { success: true, isStarred }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateFolderColor(folderId: string, color: string | null) {
  try {
    const res = await request(`/folders/${encodeURIComponent(folderId)}/color`, {
      method: "PATCH",
      body: JSON.stringify({ color }),
    })
    if (!res.success) throw new Error(res.error || "Gagal mengubah warna folder")
    return { success: true, color }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getStarredContents() {
  try {
    const res = await request("/starred")
    if (!res.success) throw new Error(res.error || "Gagal memuat item berbintang")
    return { success: true, data: res.data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function createShareLink(fileId: string, expiryHours = 24) {
  try {
    const res = await request(`/files/${encodeURIComponent(fileId)}/share-link`, {
      method: "POST",
      body: JSON.stringify({ expiryHours }),
    })
    if (!res.success || !res.data?.shareUrl) throw new Error(res.error || "Gagal membuat tautan berbagi")
    return { success: true, shareUrl: res.data.shareUrl, expiryHours: res.data.expiryHours }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ============================================================
// Utilitas
// ============================================================

/**
 * Muat ulang halaman sebentar setelah mutasi selesai.
 * Di aplikasi lama revalidatePath otomatis menyegarkan server components;
 * di Astro kita muat ulang halaman penuh agar data selalu segar.
 */
export function reloadSoon(delay = 250) {
  setTimeout(() => window.location.reload(), delay)
}