import { request } from "./client";

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
    });
    if (!res.success) throw new Error(res.error || "Gagal membuat folder");
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteItem(id: string, type: "folder" | "file", _folderId: string | null) {
  try {
    const res = await request("/folders/delete", {
      method: "POST",
      body: JSON.stringify({ id, type }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menghapus item");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteItemsBatch(items: { id: string; type: "folder" | "file" }[], _folderId: string | null) {
  try {
    const res = await request("/folders/delete-batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menghapus item");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function renameItem(id: string, type: "folder" | "file", newName: string, _folderId: string | null) {
  try {
    const res = await request("/folders/rename", {
      method: "POST",
      body: JSON.stringify({ id, type, newName }),
    });
    if (!res.success) throw new Error(res.error || "Gagal mengubah nama");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
      throw new Error("Tidak dapat memindahkan folder ke dalam dirinya sendiri");
    }
    const res = await request("/folders/move", {
      method: "POST",
      body: JSON.stringify({ id: itemId, type: itemType, targetFolderId: targetFolderId || "root" }),
    });
    if (!res.success) throw new Error(res.error || "Gagal memindahkan item");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
      throw new Error("Tidak dapat menyalin folder ke dalam dirinya sendiri");
    }
    const res = await request("/folders/copy", {
      method: "POST",
      body: JSON.stringify({ id: itemId, type: itemType, targetFolderId: targetFolderId || "root" }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menyalin item");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getFoldersByBidang() {
  try {
    const res = await request("/folders/tree");
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.error || "Gagal memuat daftar folder");
    const data = res.data.map((f: any) => ({ id: f.id, name: f.name, parent_id: f.parent_id || null }));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateFolderColor(folderId: string, color: string | null) {
  try {
    const res = await request(`/folders/${encodeURIComponent(folderId)}/color`, {
      method: "PATCH",
      body: JSON.stringify({ color }),
    });
    if (!res.success) throw new Error(res.error || "Gagal mengubah warna folder");
    return { success: true, color };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
