import { request } from "./client";

export async function getStorageUsage() {
  try {
    const res = await request("/storage/usage");
    if (!res.success || !res.data) throw new Error(res.error || "Gagal memuat penggunaan penyimpanan");
    return {
      success: true,
      usedBytes: res.data.used_bytes || 0,
      limitBytes: res.data.limit_bytes || 1,
      percentage: res.data.percentage || 0,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getDashboardStats() {
  return request("/stats");
}

export async function toggleStar(id: string, type: "folder" | "file", isStarred: boolean) {
  try {
    const res = await request("/items/star", {
      method: "POST",
      body: JSON.stringify({ id, type, isStarred }),
    });
    if (!res.success) throw new Error(res.error || "Gagal mengubah status bintang");
    return { success: true, isStarred };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getStarredContents() {
  try {
    const res = await request("/starred");
    if (!res.success) throw new Error(res.error || "Gagal memuat item berbintang");
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
