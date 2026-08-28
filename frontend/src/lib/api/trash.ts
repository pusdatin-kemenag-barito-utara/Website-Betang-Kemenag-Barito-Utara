import { request } from "./client";

export async function restoreTrashItem(id: string, type: "folder" | "file") {
  try {
    const res = await request("/trash/restore", {
      method: "POST",
      body: JSON.stringify({ id, type }),
    });
    if (!res.success) throw new Error(res.error || "Gagal merestore item");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function restoreTrashItemsBatch(items: { id: string; type: "folder" | "file" }[]) {
  try {
    const res = await request("/trash/restore-batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    if (!res.success) throw new Error(res.error || "Gagal memulihkan item terpilih");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function permanentDeleteTrashItems(items: { id: string; type: "folder" | "file" }[]) {
  try {
    const res = await request("/trash/permanent-delete", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menghapus item permanen");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
