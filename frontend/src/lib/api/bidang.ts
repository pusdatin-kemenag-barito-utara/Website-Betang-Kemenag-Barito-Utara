import { request } from "./client";

export async function createBidang(name: string, sort_order: number = 0) {
  try {
    if (!name || name.trim() === "") {
      return { success: false, error: "Nama bidang tidak boleh kosong" };
    }
    const res = await request("/bidang", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), sortOrder: sort_order }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menambahkan bidang");
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
