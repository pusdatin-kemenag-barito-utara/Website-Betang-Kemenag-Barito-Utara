import { useState } from "react";
import { moveItem, getR2FileUrl } from "@/lib/api";
import { getMimeTypeFromFileName } from "@/lib/zipUtils";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";

export function useFileDragDrop({
  folderId,
  onRefresh,
}: {
  folderId?: string;
  onRefresh?: () => void;
}) {
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<string[]>([]);

  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    if (item.isLocked) {
      e.preventDefault();
      toast.error(
        `Berkas sedang dibuka & diedit di Microsoft Office oleh ${item.lockedBy || "pengguna lain"}. Pemindahan dinonaktifkan sementara.`
      );
      return;
    }
    setDraggedItem(item);

    // 1. Data internal untuk pemindahan folder di tabel / grid SI BETANG
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "all";

    // 2. Data eksternal jika item berupa berkas dokumen (untuk drag out ke Desktop Windows / File Explorer / Aplikasi Luar)
    if (item.type === "file") {
      const fileUrl = getR2FileUrl(item.objectKey || item.id);
      const mimeType = item.mimeType || getMimeTypeFromFileName(item.name) || "application/octet-stream";

      if (fileUrl) {
        try {
          // Chromium DownloadURL: memungkinkan seret berkas langsung ke Desktop Windows atau File Explorer
          e.dataTransfer.setData("DownloadURL", `${mimeType}:${item.name}:${fileUrl}`);
          e.dataTransfer.setData("text/uri-list", fileUrl);
          e.dataTransfer.setData("text/plain", fileUrl);
        } catch (err) {
          console.warn("Gagal menyetel dataTransfer eksternal:", err);
        }
      }

      // 3. Custom Drag Ghost Image yang elegan dan kompak
      try {
        const ghostEl = document.createElement("div");
        ghostEl.style.position = "absolute";
        ghostEl.style.top = "-9999px";
        ghostEl.style.left = "-9999px";
        ghostEl.style.padding = "6px 14px";
        ghostEl.style.background = "#0f172a";
        ghostEl.style.color = "#ffffff";
        ghostEl.style.borderRadius = "10px";
        ghostEl.style.fontSize = "12px";
        ghostEl.style.fontWeight = "600";
        ghostEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
        ghostEl.style.border = "1px solid rgba(255,255,255,0.2)";
        ghostEl.style.display = "flex";
        ghostEl.style.alignItems = "center";
        ghostEl.style.gap = "8px";
        ghostEl.style.zIndex = "999999";
        ghostEl.innerHTML = `<span>📄</span> <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name}</span>`;
        document.body.appendChild(ghostEl);
        e.dataTransfer.setDragImage(ghostEl, 20, 16);
        setTimeout(() => {
          if (document.body.contains(ghostEl)) {
            document.body.removeChild(ghostEl);
          }
        }, 100);
      } catch {
        // Fallback default drag image
      }
    }
  };

  const handleDragOver = (e: React.DragEvent, targetFolder: FileItem) => {
    if (
      draggedItem &&
      draggedItem.id !== targetFolder.id &&
      targetFolder.type === "folder"
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolderId(targetFolder.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: FileItem) => {
    e.preventDefault();
    setDragOverFolderId(null);

    if (!draggedItem || draggedItem.id === targetFolder.id || targetFolder.type !== "folder") {
      return;
    }

    if (draggedItem.isLocked) {
      toast.error(
        `Berkas sedang dibuka & diedit di Microsoft Office oleh ${draggedItem.lockedBy || "pengguna lain"}. Pemindahan tidak dapat dilakukan.`
      );
      setDraggedItem(null);
      return;
    }

    const itemToMove = draggedItem;
    setDraggedItem(null);

    // Optimistic UI hide
    setOptimisticHiddenIds((prev) => [...prev, itemToMove.id]);
    setIsMoving(true);

    try {
      const res = await moveItem(itemToMove.id, itemToMove.type, targetFolder.id, folderId || "root");
      if (res.success) {
        toast.success(`Berhasil memindahkan ${itemToMove.name} ke ${targetFolder.name}`);
        window.dispatchEvent(new CustomEvent("folder-content-updated"));
        if (onRefresh) onRefresh();
      } else {
        setOptimisticHiddenIds((prev) => prev.filter((id) => id !== itemToMove.id));
        toast.error("Gagal memindahkan item");
      }
    } catch {
      setOptimisticHiddenIds((prev) => prev.filter((id) => id !== itemToMove.id));
      toast.error("Terjadi kesalahan saat memindahkan item");
    } finally {
      setIsMoving(false);
    }
  };

  return {
    draggedItem,
    dragOverFolderId,
    isMoving,
    optimisticHiddenIds,
    setOptimisticHiddenIds,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
