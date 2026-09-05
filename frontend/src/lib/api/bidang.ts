import { request } from "./client";

export async function createBidang(
  name: string,
  sort_order: number = 0,
  folderIds: string[] = [],
  autoCreateRootFolder: boolean = true
) {
  try {
    if (!name || name.trim() === "") {
      return { success: false, error: "Nama bidang tidak boleh kosong" };
    }
    const res = await request<{
      success: boolean;
      data?: { id: string; name: string; sort_order: number; sortOrder?: number };
      error?: string;
    }>("/bidang", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        sortOrder: sort_order,
        folderIds,
        autoCreateRootFolder,
      }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menambahkan bidang");
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getBidangList() {
  try {
    const res = await request<{ success: boolean; data?: any[]; error?: string }>("/bidang");
    if (!res.success) throw new Error(res.error || "Gagal mengambil data bidang");
    return { success: true, data: res.data ?? [] };
  } catch (error) {
    return { success: false, data: [] as any[], error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getBidangFolders(id: string) {
  try {
    const res = await request<{ success: boolean; data: string[]; error?: string }>(`/bidang/${encodeURIComponent(id)}/folders`);
    if (!res.success) throw new Error(res.error || "Gagal memuat hak akses folder");
    return { success: true, data: res.data ?? [] };
  } catch (error) {
    return { success: false, data: [] as string[], error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateBidangFolders(id: string, folderIds: string[]) {
  try {
    const res = await request(`/bidang/${encodeURIComponent(id)}/folders`, {
      method: "PUT",
      body: JSON.stringify({ folderIds }),
    });
    if (!res.success) throw new Error(res.error || "Gagal memperbarui hak akses folder");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateBidang(id: string, name: string, sort_order: number = 0) {
  try {
    if (!name || name.trim() === "") {
      return { success: false, error: "Nama bidang tidak boleh kosong" };
    }
    const res = await request(`/bidang/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), sortOrder: sort_order }),
    });
    if (!res.success) throw new Error(res.error || "Gagal memperbarui bidang");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteBidang(id: string) {
  try {
    const res = await request(`/bidang/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.success) throw new Error(res.error || "Gagal menghapus bidang");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function reorderBidang(items: { id: string; sort_order: number }[]) {
  try {
    const res = await request("/bidang/reorder", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menyimpan urutan bidang");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
