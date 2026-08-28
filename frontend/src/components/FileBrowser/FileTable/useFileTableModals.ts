import { useState } from "react";
import {
  deleteItemsBatch,
  getPresignedDownloadUrl,
  downloadZip,
  toggleStar,
} from "@/lib/api";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";

export function useFileTableModals({
  folderId,
  onNavigate,
  onRefresh,
}: {
  folderId?: string;
  onNavigate?: (id: string) => void;
  onRefresh?: () => void;
}) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<FileItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null);
  const [folderToColor, setFolderToColor] = useState<FileItem | null>(null);
  const [shareLinkFile, setShareLinkFile] = useState<FileItem | null>(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileItem | null>(null);
  const [itemsToMove, setItemsToMove] = useState<FileItem[]>([]);
  const [moveModalMode, setMoveModalMode] = useState<"move" | "copy">("move");
  const [localStarredMap, setLocalStarredMap] = useState<Record<string, boolean>>({});

  const handleToggleStar = async (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const current = localStarredMap[item.id] ?? item.isStarred ?? false;
    const next = !current;
    setLocalStarredMap((prev) => ({ ...prev, [item.id]: next }));
    try {
      const res = await toggleStar(item.id, item.type, next);
      if (!res.success) {
        setLocalStarredMap((prev) => ({ ...prev, [item.id]: current }));
        toast.error("Gagal mengubah status bintang");
      }
    } catch {
      setLocalStarredMap((prev) => ({ ...prev, [item.id]: current }));
      toast.error("Terjadi kesalahan saat memberi bintang");
    }
  };

  const handlePreview = async (item: FileItem) => {
    if (item.type === "folder") {
      if (onNavigate) onNavigate(item.id);
      return;
    }
    setPreviewFile(item);
    setPreviewLoading(true);
    try {
      const res = await getPresignedDownloadUrl(item.objectKey || item.id, item.name);
      if (res.success && res.presignedUrl) {
        setPreviewUrl(res.presignedUrl);
      } else {
        toast.error("Gagal memuat pratinjau berkas");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (item: FileItem) => {
    if (item.type === "folder") {
      toast.info("Menyiapkan unduhan ZIP folder...");
      const res = await downloadZip([{ id: item.id, type: "folder" }]);
      if (res.success && res.blob) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.name}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error("Gagal mengunduh folder");
      }
      return;
    }

    try {
      const res = await getPresignedDownloadUrl(item.objectKey || item.id, item.name);
      if (res.success && res.presignedUrl) {
        const a = document.createElement("a");
        a.href = res.presignedUrl;
        a.download = item.name;
        a.click();
      }
    } catch {
      toast.error("Gagal mengunduh berkas");
    }
  };

  const handleDeleteConfirm = async (onDoneSelection?: () => void) => {
    if (itemsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      const items = itemsToDelete.map((i) => ({ id: i.id, type: i.type }));
      const res = await deleteItemsBatch(items, folderId || "root");
      if (res.success) {
        toast.success(`Berhasil memindahkan ${itemsToDelete.length} item ke Sampah`);
        setItemsToDelete([]);
        if (onDoneSelection) onDoneSelection();
        window.dispatchEvent(new CustomEvent("folder-content-updated"));
        if (onRefresh) onRefresh();
      } else {
        toast.error("Gagal menghapus item");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menghapus");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    previewFile,
    setPreviewFile,
    previewUrl,
    setPreviewUrl,
    previewLoading,
    itemsToDelete,
    setItemsToDelete,
    isDeleting,
    itemToRename,
    setItemToRename,
    folderToColor,
    setFolderToColor,
    shareLinkFile,
    setShareLinkFile,
    versionHistoryFile,
    setVersionHistoryFile,
    itemsToMove,
    setItemsToMove,
    moveModalMode,
    setMoveModalMode,
    localStarredMap,
    handleToggleStar,
    handlePreview,
    handleDownload,
    handleDeleteConfirm,
  };
}
