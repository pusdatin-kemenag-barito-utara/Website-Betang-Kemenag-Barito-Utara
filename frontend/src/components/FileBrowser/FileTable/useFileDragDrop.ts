import { useState } from "react";
import { moveItem } from "@/lib/api";
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
    setDraggedItem(item);
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
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
