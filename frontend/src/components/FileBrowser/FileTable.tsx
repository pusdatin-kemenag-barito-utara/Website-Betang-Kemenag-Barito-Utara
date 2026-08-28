// Tabel/daftar file dengan pilih-batch, drag-and-drop, pratinjau, dan menu konteks.
// Pengganti FileTable.tsx lama:
// - aksi dari lib/api (delete/rename/move/downloadZip/getPresignedDownloadUrl)
// - download ZIP kini via backend (tanpa JSZip di browser)
// - mutasi memuat ulang halaman (revalidatePath tidak ada di Astro).
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import type {
  CellContext,
  SortingState,
  Table,
  Row,
} from "@tanstack/react-table";
import { useState, useEffect, useMemo } from "react";
import {
  FileIcon,
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Link2,
  MoreVertical,
  CheckCircle2,
  Share2,
  History,
  Copy,
  Loader2,
  FileArchive,
  Star,
  Palette,
} from "lucide-react";

import { FilePreviewModal } from "./FilePreviewModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { RenameItemModal } from "./RenameItemModal";
import { MoveItemModal } from "./MoveItemModal";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { FolderColorModal } from "./FolderColorModal";
import { ShareLinkModal } from "./ShareLinkModal";
import { ModernSelect } from "@/components/ui/ModernSelect";
import {
  deleteItem,
  deleteItemsBatch,
  renameItem,
  moveItem,
  getPresignedDownloadUrl,
  downloadZip,
  toggleStar,
  updateFolderColor,
  reloadSoon,
} from "@/lib/api";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

import type { FileItem } from "@/lib/types";

interface FileTableProps {
  data: FileItem[];
  onNavigate?: (id: string) => void;
  onFilesDrop?: (files: File[]) => void;
  onShowInfo?: (item: FileItem) => void;
  onRefresh?: () => void;
  folderId?: string;
  searchQuery?: string;
  viewMode?: "list" | "grid";
  filterType?: string;
  filterDate?: string;
}

const getIcon = (item: FileItem) => {
  if (item.type === "folder") {
    const colorStyle = item.color ? { color: item.color, fill: item.color } : undefined;
    return (
      <FolderIcon
        className={`h-5 w-5 ${item.color ? "" : "fill-blue-500 text-blue-500"}`}
        style={colorStyle}
      />
    );
  }
  if (item.mimeType?.includes("pdf")) return <FileText className="h-5 w-5 text-rose-500" />;
  if (item.mimeType?.includes("image")) return <ImageIcon className="h-5 w-5 text-emerald-500" />;
  if (item.mimeType?.includes("zip") || item.name.endsWith(".zip"))
    return <FileArchive className="h-5 w-5 text-amber-500" />;
  return <FileIcon className="h-5 w-5 text-slate-500" />;
};

export function FileTable({
  data,
  onNavigate,
  onFilesDrop,
  onShowInfo,
  onRefresh,
  folderId,
  searchQuery = "",
  viewMode = "list",
  filterType = "all",
  filterDate = "all",
}: FileTableProps) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<FileItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [itemToRename, setItemToRename] = useState<FileItem | null>(null);
  const [folderToColor, setFolderToColor] = useState<FileItem | null>(null);
  const [shareLinkFile, setShareLinkFile] = useState<FileItem | null>(null);
  const [localStarredMap, setLocalStarredMap] = useState<Record<string, boolean>>({});

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<string[]>([]);

  const [itemsToMove, setItemsToMove] = useState<FileItem[]>([]);
  const [moveModalMode, setMoveModalMode] = useState<"move" | "copy">("move");
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileItem | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: FileItem | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
  });

  const handleToggleStar = async (item: FileItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const currentStatus =
      localStarredMap[item.id] !== undefined ? localStarredMap[item.id] : (item.isStarred || false);
    const newStatus = !currentStatus;

    setLocalStarredMap((prev) => ({ ...prev, [item.id]: newStatus }));
    try {
      const res = await toggleStar(item.id, item.type, newStatus);
      if (res.success) {
        toast.success(newStatus ? "Ditambahkan ke Berbintang ⭐" : "Dihapus dari Berbintang");
        if (onRefresh) onRefresh();
      } else {
        setLocalStarredMap((prev) => ({ ...prev, [item.id]: currentStatus }));
        toast.error("Gagal mengubah status bintang");
      }
    } catch {
      setLocalStarredMap((prev) => ({ ...prev, [item.id]: currentStatus }));
      toast.error("Gagal mengubah status bintang");
    }
  };

  const handleFolderColorSelect = async (folderId: string, color: string | null) => {
    try {
      const res = await updateFolderColor(folderId, color);
      if (res.success) {
        toast.success("Warna folder berhasil diperbarui");
        if (onRefresh) onRefresh();
        else reloadSoon();
      } else {
        toast.error("Gagal mengubah warna folder");
      }
    } catch {
      toast.error("Gagal mengubah warna folder");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Escape") {
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
      }

      // Spacebar Quick Look: Pratinjau file terpilih
      if (e.code === "Space" && !previewFile) {
        const selectedRowKeys = Object.keys(rowSelection);
        if (selectedRowKeys.length > 0) {
          const rowIndex = parseInt(selectedRowKeys[0], 10);
          const item = data[rowIndex];
          if (item && item.type === "file" && (item.mimeType?.includes("pdf") || item.mimeType?.includes("image"))) {
            e.preventDefault();
            handlePreview(item);
          }
        }
      }

      // Delete / Backspace: Konfirmasi hapus item terpilih
      if ((e.key === "Delete" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) && itemsToDelete.length === 0) {
        const selectedIndexes = Object.keys(rowSelection).map((k) => parseInt(k, 10));
        const selectedRows = selectedIndexes.map((idx) => data[idx]).filter(Boolean);
        if (selectedRows.length > 0) {
          e.preventDefault();
          setItemsToDelete(selectedRows);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rowSelection, previewFile, itemsToDelete.length, data]);

  const calculateMenuPosition = (
    targetRect?: DOMRect,
    clientX?: number,
    clientY?: number,
  ) => {
    const menuWidth = 240;
    const menuHeight = 440;
    const padding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = 0;
    let y = 0;

    if (targetRect) {
      // Posisikan horizontal sejajar dengan tombol (rata kanan tombol)
      x = targetRect.right - menuWidth;
      if (x < padding) {
        x = Math.max(padding, targetRect.left);
      }

      // Vertikal: Cek apakah muat ke bawah atau harus membalik ke atas
      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;

      if (spaceBelow >= menuHeight + padding) {
        // Cukup ruang ke bawah
        y = targetRect.bottom + 4;
      } else if (spaceAbove >= menuHeight + padding) {
        // Cukup ruang ke atas (flip upwards)
        y = targetRect.top - menuHeight - 4;
      } else {
        // Ambil sisi dengan ruang paling luas dan pas di viewport
        if (spaceBelow >= spaceAbove) {
          y = Math.max(padding, viewportHeight - menuHeight - padding);
        } else {
          y = padding;
        }
      }
    } else if (clientX !== undefined && clientY !== undefined) {
      x = clientX;
      y = clientY;

      // Geser jika melebihi kanan layar
      if (x + menuWidth > viewportWidth - padding) {
        x = Math.max(padding, viewportWidth - menuWidth - padding);
      }

      // Geser ke atas jika melebihi bawah layar
      if (y + menuHeight > viewportHeight - padding) {
        y = Math.max(padding, y - menuHeight);
      }
    }

    // Batasan akhir absolut agar selalu terlihat utuh
    x = Math.max(padding, Math.min(x, viewportWidth - menuWidth - padding));
    y = Math.max(padding, Math.min(y, viewportHeight - menuHeight - padding));

    return { x, y };
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();

    const pos = calculateMenuPosition(undefined, e.clientX, e.clientY);
    setContextMenu({
      visible: true,
      x: pos.x,
      y: pos.y,
      item,
    });
  };

  const handleCopyLink = async (item: FileItem) => {
    if (!item.objectKey) return;
    try {
      const url = await getSignedUrl(item.objectKey, false);
      await navigator.clipboard.writeText(url);
      toast.success("Tautan berhasil disalin ke clipboard.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat tautan.");
    }
  };

  const handleShare = async (item: FileItem) => {
    if (!item.objectKey) return;
    try {
      const url = await getSignedUrl(item.objectKey, false);
      if (navigator.share) {
        await navigator.share({
          title: item.name,
          text: `Dokumen E-Arsip: ${item.name}`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Tautan disalin! (Browser tidak mendukung fitur Share)");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error(error);
      toast.error("Gagal membagikan tautan.");
    }
  };

  const getSignedUrl = async (objectKey: string, download: string | boolean = false) => {
    const downloadName = typeof download === "string" ? download : undefined;
    const { success, presignedUrl, error } = await getPresignedDownloadUrl(objectKey, downloadName);

    if (!success || !presignedUrl) throw new Error(error || "Gagal mendapatkan tautan dari server");
    return presignedUrl;
  };

  /** Toast pembungkus berisi status download. */
  const downloadToast = (title: string, body: string, icon: React.ReactNode) =>
    toast.custom(
      () => (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-border overflow-hidden w-[350px] pointer-events-auto flex flex-col">
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <div className="p-4 flex items-center justify-between border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-md">{icon}</div>
              <p className="text-sm font-medium text-foreground">{body}</p>
            </div>
          </div>
        </div>
      ),
      { position: "bottom-right", duration: 4000 },
    );

  const handleDownloadItems = async (items: FileItem[]) => {
    if (items.length === 0) return;

    trackEvent("download_file", {
      count: items.length,
      is_batch: items.length > 1,
      item_type: items.length === 1 ? items[0].type : "mixed",
    });

    // Jalur cepat satu file: unduh langsung via URL presigned.
    if (items.length === 1 && items[0].type === "file") {
      try {
        const url = await getSignedUrl(items[0].objectKey || "", items[0].name);
        const a = document.createElement("a");
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        downloadToast(
          "Download dimulai",
          "File berhasil diunduh",
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        );
      } catch (error) {
        console.error("Download failed:", error);
        toast.error("Gagal mengunduh item. Silakan coba lagi.");
      }
      return;
    }

    // Banyak item / folder: ZIP dari server.
    const toastId = toast.custom(
      () => (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-border overflow-hidden w-[350px] pointer-events-auto flex flex-col">
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Menyiapkan download...</h3>
          </div>
          <div className="p-4 flex items-center justify-between border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-md">
                <FileArchive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Menyiapkan {items.length} item</p>
            </div>
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          </div>
        </div>
      ),
      { position: "bottom-right", duration: 999999 },
    );

    try {
      const res = await downloadZip(items.map((i) => ({ id: i.id, type: i.type })));

      if (!res.success || !res.blob) {
        throw new Error(res.error || "Gagal mendapatkan ZIP");
      }

      const zipName =
        items.length === 1 ? `${items[0].name}.zip` : `Arsip_${new Date().getTime()}.zip`;
      const blobUrl = window.URL.createObjectURL(res.blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = zipName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(downloadLink);

      toast.custom(
        () => (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-border overflow-hidden w-[350px] pointer-events-auto flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground">Download selesai</h3>
            </div>
            <div className="p-4 flex items-center justify-between border-t border-border">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-foreground">{items.length} item berhasil di-zip</p>
              </div>
            </div>
          </div>
        ),
        { id: toastId, position: "bottom-right", duration: 4000 },
      );
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Gagal mengunduh item. Silakan coba lagi.");
    }
  };

  const handlePreview = async (item: FileItem) => {
    if (!item.objectKey) return;

    trackEvent("preview_file", {
      file_name: item.name,
      mime_type: item.mimeType || "application/octet-stream",
    });

    const isSupported =
      item.mimeType === "application/pdf" || item.mimeType?.startsWith("image/");
    if (!isSupported) {
      return handleDownloadItems([item]);
    }

    setPreviewFile(item);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);

    try {
      // Untuk gambar/PDF, cukup pakai URL presigned tanpa disposisi download.
      const url = await getSignedUrl(item.objectKey, false);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Preview failed:", error);
      setPreviewError("Gagal membuka dokumen. Akses ditolak atau sesi habis.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteClick = (item: FileItem) => {
    setItemsToDelete([item]);
  };

  const confirmDelete = async () => {
    if (itemsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      if (itemsToDelete.length === 1) {
        const result = await deleteItem(itemsToDelete[0].id, itemsToDelete[0].type, folderId || null);
        if (!result.success) throw new Error(result.error);
      } else {
        const payload = itemsToDelete.map((item) => ({
          id: item.id,
          type: item.type,
        }));
        const result = await deleteItemsBatch(payload, folderId || null);
        if (!result.success) throw new Error(result.error);
      }
      trackEvent("delete_item", {
        count: itemsToDelete.length,
        item_type: itemsToDelete.length === 1 ? itemsToDelete[0].type : "batch",
      });
      setItemsToDelete([]);
      table.resetRowSelection();
      toast.success("Item berhasil dipindahkan ke Trash.");
      window.dispatchEvent(new CustomEvent("storage-updated"));
      if (onRefresh) {
        onRefresh();
      } else {
        reloadSoon();
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Gagal menghapus item.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!itemToRename) return;
    const result = await renameItem(itemToRename.id, itemToRename.type, newName, folderId || null);
    if (!result.success) throw new Error(result.error);
    trackEvent("rename_item", {
      item_type: itemToRename.type,
      new_name: newName,
    });
    toast.success("Nama berhasil diubah.");
    if (onRefresh) {
      onRefresh();
    } else {
      reloadSoon();
    }
  };

  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    if (item.isRestricted) {
      e.preventDefault();
      return;
    }
    setDraggedItem(item);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ id: item.id, type: item.type }),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, item?: FileItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (item && item.type === "folder" && item.id !== draggedItem?.id && !isMoving) {
      setDragOverFolderId(item.id);
    }
  };

  const handleDragLeave = (e: React.DragEvent, item?: FileItem) => {
    e.preventDefault();
    if (item && dragOverFolderId === item.id) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetItem?: FileItem) => {
    e.preventDefault();
    setDragOverFolderId(null);

    // Cek drop file eksternal
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFilesDrop) {
        onFilesDrop(Array.from(e.dataTransfer.files));
      }
      return;
    }

    if (!targetItem || !draggedItem || targetItem.type !== "folder" || draggedItem.id === targetItem.id)
      return;

    setIsMoving(true);

    // Sembunyikan item yang dipindah secara optimistik agar terasa instan.
    const movedItemId = draggedItem.id;
    setOptimisticHiddenIds((prev) => [...prev, movedItemId]);

    try {
      const result = await moveItem(movedItemId, draggedItem.type, targetItem.id, folderId || null);
      if (!result.success) {
        // Batalkan update optimistik bila gagal.
        setOptimisticHiddenIds((prev) => prev.filter((id) => id !== movedItemId));
        throw new Error(result.error);
      }
      toast.success("Item berhasil dipindahkan.");
      if (onRefresh) {
        onRefresh();
      } else {
        reloadSoon();
      }
    } catch (error) {
      console.error("Move failed:", error);
      toast.error("Gagal memindahkan file/folder.");
    } finally {
      setIsMoving(false);
      setDraggedItem(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }: { table: Table<FileItem> }) => {
          const isAllSelected = table.getIsAllPageRowsSelected();
          const isSomeSelected = table.getIsSomePageRowsSelected();
          return (
            <div className="flex h-full items-center justify-center">
              <input
                type="checkbox"
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                }}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer accent-emerald-600 transition-all"
                checked={isAllSelected}
                onChange={table.getToggleAllPageRowsSelectedHandler()}
                title={isAllSelected ? "Batalkan pilihan semua" : "Pilih semua item pada halaman ini"}
              />
            </div>
          );
        },
        meta: {
          className: "w-10 lg:w-12 flex-shrink-0 flex items-center justify-center",
        },
        cell: ({ row }: { row: Row<FileItem> }) => (
          <div className="flex h-full items-center justify-center">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer accent-emerald-600 transition-all"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect() || row.original.isRestricted}
              onChange={row.getToggleSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
              title={row.getIsSelected() ? "Batalkan pilihan" : "Pilih item"}
            />
          </div>
        ),
      },
      {
        id: "star",
        header: () => null,
        meta: {
          className: "w-8 flex-shrink-0 flex items-center justify-center",
        },
        cell: ({ row }: { row: Row<FileItem> }) => {
          const item = row.original;
          const isStarred =
            localStarredMap[item.id] !== undefined
              ? localStarredMap[item.id]
              : item.isStarred || false;
          return (
            <button
              onClick={(e) => handleToggleStar(item, e)}
              className={`p-1 rounded-lg transition-all ${
                isStarred
                  ? "text-amber-400 hover:text-amber-500 scale-110"
                  : "text-slate-300 hover:text-amber-400 hover:scale-110 opacity-0 group-hover/row:opacity-100"
              }`}
              title={isStarred ? "Hapus dari Berbintang" : "Bintangi item ini"}
            >
              <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
            </button>
          );
        },
      },
      {
        header: "Nama File/Folder",
        accessorKey: "name",
        meta: { className: "flex-1 min-w-0" }, // min-w-0 memastikan truncate bekerja
        cell: (info: CellContext<FileItem, unknown>) => {
          const item = info.row.original;
          return (
            <div
              data-file-item="true"
              onContextMenu={(e) => handleContextMenu(e, item)}
              className={`group/item flex items-center gap-3 py-1 ${
                item.type === "folder" ||
                (item.type === "file" && (item.mimeType?.includes("pdf") || item.mimeType?.includes("image")))
                  ? "cursor-pointer"
                  : ""
              }`}
              onClick={() => {
                if (item.type === "folder" && onNavigate) {
                  onNavigate(item.id);
                } else if (
                  item.type === "file" &&
                  (item.mimeType?.includes("pdf") || item.mimeType?.includes("image"))
                ) {
                  handlePreview(item);
                }
              }}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform ${
                  item.type === "folder"
                    ? "bg-blue-50 text-blue-600 group-hover/item:scale-110 group-hover/item:bg-blue-100"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                {getIcon(item)}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`font-bold truncate max-w-full ${
                    item.type === "folder"
                      ? "text-slate-800 group-hover/item:text-blue-700"
                      : "text-slate-700"
                  }`}
                >
                  {info.getValue() as string}
                </span>
                {/* Ukuran tampil di mobile langsung di bawah nama */}
                <span className="md:hidden text-xs text-slate-400 mt-0.5 truncate">
                  {item.type === "file" ? `${item.size || "-"} • ${item.updatedAt}` : item.updatedAt}
                </span>
              </div>
              {item.isRestricted && (
                <span className="shrink-0 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold tracking-wider text-rose-600 ring-1 ring-inset ring-rose-200">
                  LOCKED
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: "Diperbarui",
        accessorKey: "updatedAt",
        meta: {
          className: "w-40 lg:w-48 flex-shrink-0 hidden md:flex items-center",
        },
        cell: (info: CellContext<FileItem, unknown>) => (
          <span className="text-sm font-medium text-slate-500">{info.getValue() as string}</span>
        ),
      },
      {
        header: "Ukuran",
        accessorKey: "size",
        meta: {
          className: "w-32 lg:w-40 flex-shrink-0 hidden md:flex items-center",
        },
        cell: (info: CellContext<FileItem, unknown>) => (
          <span className="text-sm font-medium text-slate-500">{(info.getValue() as string) || "-"}</span>
        ),
      },
      {
        header: "Aksi",
        id: "actions",
        meta: {
          className: "w-12 md:w-16 flex-shrink-0 flex items-center justify-end",
        },
        cell: (info: CellContext<FileItem, unknown>) => {
          const item = info.row.original;
          return (
            <div className="flex items-center justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = calculateMenuPosition(rect, undefined, undefined);
                  setContextMenu({
                    visible: true,
                    x: pos.x,
                    y: pos.y,
                    item,
                  });
                }}
                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onNavigate],
  );

  // Saring item yang disembunyikan optimistik dan terapkan filter pencarian lanjutan.
  const visibleData = useMemo(() => {
    return data.filter((item) => {
      if (optimisticHiddenIds.includes(item.id)) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Filter Tipe
      if (filterType !== "all") {
        if (filterType === "folder" && item.type !== "folder") return false;
        if (filterType !== "folder") {
          if (item.type === "folder") return false;
          const mime = item.mimeType?.toLowerCase() || "";
          if (filterType === "image" && !mime.includes("image")) return false;
          if (filterType === "pdf" && !mime.includes("pdf")) return false;
          if (
            filterType === "document" &&
            !mime.includes("word") &&
            !mime.includes("excel") &&
            !mime.includes("spreadsheet") &&
            !mime.includes("presentation") &&
            !mime.includes("powerpoint")
          )
            return false;
        }
      }

      // Filter Tanggal
      if (filterDate !== "all" && item.rawDate) {
        const itemDate = new Date(item.rawDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (filterDate === "today" && diffDays > 1) return false;
        if (filterDate === "7days" && diffDays > 7) return false;
        if (filterDate === "30days" && diffDays > 30) return false;
      }

      return true;
    });
  }, [data, optimisticHiddenIds, searchQuery, filterType, filterDate]);

  const table = useReactTable({
    data: visibleData,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility: {
        select: true,
      },
    },
    getRowId: (row) => row.id,
    enableRowSelection: (row) => !row.original.isRestricted,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  const { rows } = table.getRowModel();
  const selectedRows = table.getSelectedRowModel().rows;

  return (
    <div className="flex flex-col rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden relative">
      {/* Bar Aksi Batch */}
      {selectedRows.length > 0 && (
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 bg-emerald-600 px-4 sm:px-6 py-3 text-white shadow-lg animate-in slide-in-from-top-4 border-b border-emerald-500">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-emerald-700 shadow-sm">
              {selectedRows.length}
            </span>
            <span className="font-bold text-sm tracking-wide">
              {selectedRows.length} item terpilih
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const items = table.getSelectedRowModel().rows.map((r) => r.original as FileItem);
                setMoveModalMode("move");
                setItemsToMove(items);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700/90 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold transition-all shadow-sm ring-1 ring-emerald-500/50"
            >
              <FolderIcon className="h-3.5 w-3.5" />
              <span>Pindahkan</span>
            </button>
            <button
              onClick={() => {
                const items = table.getSelectedRowModel().rows.map((r) => r.original as FileItem);
                setMoveModalMode("copy");
                setItemsToMove(items);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold transition-all shadow-sm ring-1 ring-blue-400/50"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Salin</span>
            </button>
            <button
              onClick={() => {
                const items = table.getSelectedRowModel().rows.map((r) => r.original as FileItem);
                handleDownloadItems(items);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700/90 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold transition-all shadow-sm ring-1 ring-emerald-500/50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download ZIP</span>
            </button>
            <button
              onClick={() => {
                const items = table.getSelectedRowModel().rows.map((r) => r.original as FileItem);
                setItemsToDelete(items);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-bold transition-all shadow-sm ring-1 ring-rose-400/50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus</span>
            </button>
            <div className="h-5 w-px bg-emerald-500/80 mx-1 hidden sm:block" />
            <button
              onClick={() => table.resetRowSelection()}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-100 hover:bg-emerald-700/50 hover:text-white transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Area Tabel */}
      <div
        className="w-full text-left text-sm flex flex-col min-h-[200px]"
        onDragOver={(e) => handleDragOver(e)}
        onDrop={(e) => handleDrop(e)}
      >
        {/* Kontrol Urutan (Mobile) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Urutkan:
          </span>
          <ModernSelect
            value={
              sorting.length > 0
                ? `${sorting[0].id}-${sorting[0].desc ? "desc" : "asc"}`
                : "name-asc"
            }
            onChange={(value) => {
              const [id, desc] = value.split("-");
              setSorting([{ id, desc: desc === "desc" }]);
            }}
            options={[
              { value: "name-asc", label: "Nama (A-Z)" },
              { value: "name-desc", label: "Nama (Z-A)" },
              { value: "updatedAt-desc", label: "Terbaru" },
              { value: "updatedAt-asc", label: "Terlama" },
              { value: "size-desc", label: "Ukuran (Terbesar)" },
              { value: "size-asc", label: "Ukuran (Terkecil)" },
            ]}
            triggerClassName="w-full flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            className="flex-1 min-w-0"
          />
        </div>

        {/* Header Tabel (Desktop) */}
        <div className="hidden md:flex w-full bg-slate-50/90 backdrop-blur-md border-b border-slate-100">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();
                return (
                  <div
                    key={header.id}
                    className={`px-4 lg:px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1 ${
                      (header.column.columnDef.meta as Record<string, string>)?.className || ""
                    } ${canSort ? "cursor-pointer select-none hover:text-slate-700" : ""}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && (
                      <span className="text-slate-400">
                        {{
                          asc: <ArrowUp className="h-3 w-3" />,
                          desc: <ArrowDown className="h-3 w-3" />,
                        }[isSorted as string] ?? <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

{viewMode === "list" ? (
          <div className="w-full flex flex-col divide-y divide-slate-50">
            {rows.map((row) => {
              const item = row.original as FileItem;
              const isDragOver = dragOverFolderId === item.id;
              return (
                <div
                  key={row.id}
                  data-file-item="true"
                  draggable={!item.isRestricted}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={(e) => handleDragLeave(e, item)}
                  onDrop={(e) => handleDrop(e, item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className={`flex w-full items-center transition-all py-1 border-2 border-transparent ${
                    isDragOver
                      ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 rounded-xl scale-[1.01] shadow-md z-10"
                      : row.getIsSelected()
                        ? "bg-emerald-50/80 border-emerald-300 rounded-xl shadow-xs"
                        : "hover:bg-slate-50/50"
                  } ${draggedItem?.id === item.id ? "opacity-50" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className={`px-4 lg:px-6 py-2 ${
                        (cell.column.columnDef.meta as Record<string, string>)?.className || ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Empty State */}
            {data.length === 0 && (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300 mb-4">
                  <FolderIcon className="h-10 w-10" />
                </div>
                <p className="font-bold text-slate-700">Folder ini kosong</p>
                <p className="mt-1 text-sm font-medium text-slate-500 max-w-[250px]">
                  Silakan unggah dokumen baru atau buat sub-folder di sini.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 bg-slate-50/30">
            {rows.map((row) => {
              const item = row.original as FileItem;
              const isDragOver = dragOverFolderId === item.id;
              return (
                <div
                  key={row.id}
                  data-file-item="true"
                  draggable={!item.isRestricted}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={(e) => handleDragLeave(e, item)}
                  onDrop={(e) => handleDrop(e, item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className={`group relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isDragOver
                      ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 scale-[1.02] shadow-md z-10"
                      : row.getIsSelected()
                        ? "bg-emerald-50/50 border-emerald-300"
                        : "bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5"
                  } ${draggedItem?.id === item.id ? "opacity-50" : ""}`}
                  onClick={() => {
                    if (item.type === "folder" && onNavigate) {
                      onNavigate(item.id);
                    } else if (
                      item.type === "file" &&
                      (item.mimeType?.includes("pdf") || item.mimeType?.includes("image"))
                    ) {
                      handlePreview(item);
                    }
                  }}
                >
                  <div
                    className={`flex h-16 w-16 mb-3 items-center justify-center rounded-2xl transition-transform ${
                      item.type === "folder" && !item.color
                        ? "bg-blue-50 text-blue-600"
                        : "bg-slate-50 text-slate-500"
                    }`}
                    style={
                      item.type === "folder" && item.color
                        ? { backgroundColor: `${item.color}20` }
                        : undefined
                    }
                  >
                    {item.type === "folder" ? (
                      <FolderIcon
                        className={`h-8 w-8 ${item.color ? "" : "fill-blue-500 text-blue-500"}`}
                        style={item.color ? { color: item.color, fill: item.color } : undefined}
                      />
                    ) : (
                      getIcon(item)
                    )}
                  </div>
                  <div className="flex flex-col w-full text-center">
                    <span
                      className={`text-sm font-bold truncate px-1 ${
                        item.type === "folder" ? "text-slate-800" : "text-slate-700"
                      }`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 truncate">
                      {item.type === "file" ? `${item.size || "-"} • ${item.updatedAt}` : item.updatedAt}
                    </span>
                  </div>

                  {/* Tombol aksi grid (overlay) */}
                  <div
                    className={`absolute top-2.5 left-2.5 transition-opacity ${
                      row.getIsSelected() || selectedRows.length > 0
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer accent-emerald-600"
                      checked={row.getIsSelected()}
                      disabled={!row.getCanSelect() || item.isRestricted}
                      onChange={row.getToggleSelectedHandler()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Tombol bintang grid */}
                  <button
                    onClick={(e) => handleToggleStar(item, e)}
                    className={`absolute top-2 left-8 p-1 rounded-lg transition-all ${
                      (localStarredMap[item.id] !== undefined
                        ? localStarredMap[item.id]
                        : item.isStarred)
                        ? "text-amber-400 hover:text-amber-500 scale-110 opacity-100"
                        : "text-slate-300 hover:text-amber-400 hover:scale-110 opacity-0 group-hover:opacity-100"
                    }`}
                    title={
                      (localStarredMap[item.id] !== undefined
                        ? localStarredMap[item.id]
                        : item.isStarred)
                        ? "Hapus dari Berbintang"
                        : "Bintangi"
                    }
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (localStarredMap[item.id] !== undefined
                          ? localStarredMap[item.id]
                          : item.isStarred)
                          ? "fill-current"
                          : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`absolute top-2 right-2 transition-opacity ${
                      contextMenu.item?.id === item.id
                        ? "opacity-100"
                        : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = calculateMenuPosition(rect, undefined, undefined);
                        setContextMenu({
                          visible: true,
                          x: pos.x,
                          y: pos.y,
                          item,
                        });
                      }}
                      className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white text-slate-500 hover:text-emerald-600 shadow-sm ring-1 ring-slate-200 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Empty State Grid */}
            {data.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-16 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300 mb-4">
                  <FolderIcon className="h-10 w-10" />
                </div>
                <p className="font-bold text-slate-700">Folder ini kosong</p>
                <p className="mt-1 text-sm font-medium text-slate-500 max-w-[250px]">
                  Silakan unggah dokumen baru atau buat sub-folder di sini.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kontrol Pagination */}
      {data.length > 10 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 px-6">
          <span className="text-xs font-semibold text-slate-500">
            Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => {
          setPreviewFile(null);
          setPreviewUrl(null);
        }}
        fileUrl={previewUrl}
        fileName={previewFile?.name || ""}
        mimeType={previewFile?.mimeType || ""}
        isLoading={previewLoading}
        error={previewError}
      />

      <DeleteConfirmModal
        isOpen={itemsToDelete.length > 0}
        onClose={() => setItemsToDelete([])}
        onConfirm={confirmDelete}
        itemName={itemsToDelete.length === 1 ? itemsToDelete[0].name : undefined}
        itemType={itemsToDelete.length === 1 ? itemsToDelete[0].type : undefined}
        itemCount={itemsToDelete.length}
        isDeleting={isDeleting}
      />

      <RenameItemModal
        isOpen={!!itemToRename}
        onClose={() => setItemToRename(null)}
        onConfirm={handleRenameConfirm}
        initialName={itemToRename?.name || ""}
        itemType={itemToRename?.type || "file"}
      />

      <MoveItemModal
        isOpen={itemsToMove.length > 0}
        onClose={() => setItemsToMove([])}
        itemsToMove={itemsToMove}
        currentFolderId={folderId || null}
        mode={moveModalMode}
        onSuccess={() => {
          table.resetRowSelection();
          if (onRefresh) onRefresh();
        }}
      />

      <VersionHistoryModal
        isOpen={!!versionHistoryFile}
        onClose={() => setVersionHistoryFile(null)}
        file={versionHistoryFile}
        folderId={folderId || null}
      />

      {/* Google-Drive-Style Context Menu & Backdrop */}
      {contextMenu.visible && contextMenu.item && (
        <>
          {/* Fullscreen Backdrop Overlay to capture outside clicks safely */}
          <div
            className="fixed inset-0 z-[9998] bg-transparent cursor-default select-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ visible: false, x: 0, y: 0, item: null });
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ visible: false, x: 0, y: 0, item: null });
            }}
          />

          {/* Floating Context Menu Card */}
          <div
            data-context-menu="true"
            className="fixed z-[9999] w-60 max-h-[calc(100vh-24px)] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl ring-1 ring-slate-200/90 p-1.5 animate-in fade-in zoom-in-95 select-none"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Header Info Item */}
            <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 mb-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                {getIcon(contextMenu.item)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate" title={contextMenu.item.name}>
                  {contextMenu.item.name}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {contextMenu.item.type === "folder" ? "Folder Arsip" : (contextMenu.item.size || "Berkas Dokumen")}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-0.5">
              {contextMenu.item.type === "folder" ? (
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate(contextMenu.item!.id);
                    setContextMenu({ visible: false, x: 0, y: 0, item: null });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                >
                  <FolderIcon className="h-4 w-4 text-blue-500 fill-blue-500 shrink-0" />
                  <span>Buka Folder</span>
                </button>
              ) : (
                (contextMenu.item.mimeType?.includes("pdf") || contextMenu.item.mimeType?.includes("image")) && (
                  <button
                    onClick={() => {
                      handlePreview(contextMenu.item!);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                  >
                    <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Pratinjau Dokumen</span>
                  </button>
                )
              )}

              {!contextMenu.item.isRestricted && (
                <button
                  onClick={() => {
                    handleDownloadItems([contextMenu.item!]);
                    setContextMenu({ visible: false, x: 0, y: 0, item: null });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                >
                  <Download className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>{contextMenu.item.type === "folder" ? "Download ZIP Folder" : "Download File"}</span>
                </button>
              )}

              {!contextMenu.item.isRestricted && contextMenu.item.type !== "folder" && (
                <>
                  <button
                    onClick={() => {
                      handleShare(contextMenu.item!);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                  >
                    <Share2 className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Bagikan</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCopyLink(contextMenu.item!);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                  >
                    <Link2 className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Salin Tautan</span>
                  </button>
                </>
              )}

              <div className="h-px w-full bg-slate-100 my-1" />

              <button
                onClick={() => {
                  if (onShowInfo) onShowInfo(contextMenu.item!);
                  setContextMenu({ visible: false, x: 0, y: 0, item: null });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
              >
                <Info className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Detail Informasi</span>
              </button>

              {!contextMenu.item.isRestricted && contextMenu.item.type !== "folder" && (
                <button
                  onClick={() => {
                    setVersionHistoryFile(contextMenu.item!);
                    setContextMenu({ visible: false, x: 0, y: 0, item: null });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                >
                  <History className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Riwayat Versi</span>
                </button>
              )}

              {!contextMenu.item.isRestricted && (
                <>
                  <button
                    onClick={() => {
                      setItemToRename(contextMenu.item!);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                  >
                    <Pencil className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Ganti Nama</span>
                  </button>
                  <button
                    onClick={() => {
                      setMoveModalMode("move");
                      setItemsToMove([contextMenu.item!]);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                  >
                    <FolderIcon className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Pindahkan</span>
                  </button>
                  <button
                    onClick={() => {
                      setMoveModalMode("copy");
                      setItemsToMove([contextMenu.item!]);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                  >
                    <Copy className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Salin</span>
                  </button>

                  <div className="h-px w-full bg-slate-100 my-1" />

                  {/* Bintangi Item */}
                  <button
                    onClick={(e) => {
                      handleToggleStar(contextMenu.item!, e);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                  >
                    <Star
                      className={`h-4 w-4 shrink-0 ${
                        (localStarredMap[contextMenu.item.id] !== undefined
                          ? localStarredMap[contextMenu.item.id]
                          : contextMenu.item.isStarred)
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-400"
                      }`}
                    />
                    <span>
                      {(localStarredMap[contextMenu.item.id] !== undefined
                        ? localStarredMap[contextMenu.item.id]
                        : contextMenu.item.isStarred)
                        ? "Hapus dari Berbintang"
                        : "Bintangi"}
                    </span>
                  </button>

                  {/* Ubah Warna Folder */}
                  {contextMenu.item.type === "folder" && (
                    <button
                      onClick={() => {
                        setFolderToColor(contextMenu.item!);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                    >
                      <Palette className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Ubah Warna Folder</span>
                    </button>
                  )}

                  {/* Bagikan Tautan Sementara */}
                  {contextMenu.item.type !== "folder" && !contextMenu.item.isRestricted && (
                    <button
                      onClick={() => {
                        setShareLinkFile(contextMenu.item!);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                    >
                      <Share2 className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>Bagikan Tautan Sementara</span>
                    </button>
                  )}

                  <div className="h-px w-full bg-slate-100 my-1" />

                  <button
                    onClick={() => {
                      handleDeleteClick(contextMenu.item!);
                      setContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span>Hapus</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Ubah Warna Folder */}
      <FolderColorModal
        isOpen={!!folderToColor}
        onClose={() => setFolderToColor(null)}
        folder={folderToColor}
        onSelectColor={handleFolderColorSelect}
      />

      {/* Modal Bagikan Tautan Sementara */}
      <ShareLinkModal
        isOpen={!!shareLinkFile}
        onClose={() => setShareLinkFile(null)}
        file={shareLinkFile}
      />
    </div>
  );
}