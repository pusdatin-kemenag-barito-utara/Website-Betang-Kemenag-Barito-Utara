"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  CellContext,
  getPaginationRowModel,
  getSortedRowModel,
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
} from "lucide-react";

import { FilePreviewModal } from "./FilePreviewModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { RenameItemModal } from "./RenameItemModal";
import { MoveItemModal } from "./MoveItemModal";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { ModernSelect } from "@/components/ui/ModernSelect";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  deleteItem,
  deleteItemsBatch,
  renameItem,
  moveItem,
  getPresignedDownloadUrl,
} from "@/app/(dashboard)/folders/actions";
import { toast } from "sonner";

import type { FileItem } from "@/types";

interface FileTableProps {
  data: FileItem[];
  onNavigate?: (id: string) => void;
  onFilesDrop?: (files: File[]) => void;
  onShowInfo?: (item: FileItem) => void;
  folderId?: string;
  searchQuery?: string;
  viewMode?: "list" | "grid";
  filterType?: string;
  filterDate?: string;
}

const getIcon = (item: FileItem) => {
  if (item.type === "folder")
    return <FolderIcon className="h-5 w-5 fill-blue-500 text-blue-500" />;
  if (item.mimeType?.includes("pdf"))
    return <FileText className="h-5 w-5 text-rose-500" />;
  if (item.mimeType?.includes("image"))
    return <ImageIcon className="h-5 w-5 text-emerald-500" />;
  return <FileIcon className="h-5 w-5 text-slate-500" />;
};

export function FileTable({
  data,
  onNavigate,
  onFilesDrop,
  onShowInfo,
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

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

  useEffect(() => {
    const handleClickOutside = () =>
      setContextMenu({ ...contextMenu, visible: false });
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
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

  const getSignedUrl = async (
    objectKey: string,
    download: string | boolean = false,
  ) => {
    const downloadName = typeof download === "string" ? download : undefined;
    const { success, presignedUrl, error } = await getPresignedDownloadUrl(
      objectKey,
      downloadName,
    );

    if (!success || !presignedUrl)
      throw new Error(error || "Gagal mendapatkan tautan dari server");
    return presignedUrl;
  };

  const handleDownloadItems = async (items: FileItem[]) => {
    if (items.length === 0) return;
    
    const toastId = toast.loading(`Menyiapkan download untuk ${items.length} item...`);
    
    try {
      const { getDownloadUrlsForItems } = await import("@/app/(dashboard)/folders/actions");
      const result = await getDownloadUrlsForItems(items.map(i => ({ id: i.id, type: i.type, name: i.name })));
      
      if (!result.success || !result.files) {
        throw new Error(result.error || "Gagal mendapatkan URL");
      }

      if (result.files.length === 0) {
        toast.error("Tidak ada file yang dapat diunduh (kosong).", { id: toastId });
        return;
      }
      
      // Single file fast path
      if (items.length === 1 && items[0].type === "file" && result.files.length === 1) {
        const a = document.createElement("a");
        a.href = result.files[0].url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download dimulai.", { id: toastId });
        return;
      }
      
      // ZIP path
      toast.loading("Mengompresi file ke ZIP, mohon tunggu...", { id: toastId });
      
      const zip = new JSZip();
      
      await Promise.all(result.files.map(async (file) => {
        try {
          const response = await fetch(file.url);
          if (response.ok) {
            const blob = await response.blob();
            zip.file(file.path, blob);
          }
        } catch (e) {
          console.error(`Failed to fetch file for zip: ${file.path}`, e);
        }
      }));
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipName = items.length === 1 ? `${items[0].name}.zip` : `Arsip_${new Date().getTime()}.zip`;
      saveAs(zipBlob, zipName);
      
      toast.success("Download ZIP berhasil.", { id: toastId });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Gagal mengunduh item.", { id: toastId });
    }
  };

  const handlePreview = async (item: FileItem) => {
    if (!item.objectKey) return;

    const isSupported =
      item.mimeType === "application/pdf" ||
      item.mimeType?.startsWith("image/");
    if (!isSupported) {
      return handleDownloadItems([item]);
    }

    setPreviewFile(item);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);

    try {
      // For images, we can download it directly into the img tag using a signed url without the download disposition
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
        const result = await deleteItem(
          itemsToDelete[0].id,
          itemsToDelete[0].type,
          folderId || null,
        );
        if (!result.success) throw new Error(result.error);
      } else {
        const payload = itemsToDelete.map((item) => ({
          id: item.id,
          type: item.type,
        }));
        const result = await deleteItemsBatch(payload, folderId || null);
        if (!result.success) throw new Error(result.error);
      }
      setItemsToDelete([]);
      table.resetRowSelection();
      toast.success("Item berhasil dipindahkan ke Trash.");
      window.dispatchEvent(new CustomEvent('storage-updated'));
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Gagal menghapus item.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!itemToRename) return;
    const result = await renameItem(
      itemToRename.id,
      itemToRename.type,
      newName,
      folderId || null,
    );
    if (!result.success) throw new Error(result.error);
    toast.success("Nama berhasil diubah.");
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
    if (
      item &&
      item.type === "folder" &&
      item.id !== draggedItem?.id &&
      !isMoving
    ) {
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

    // Check if dropping external files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFilesDrop) {
        onFilesDrop(Array.from(e.dataTransfer.files));
      }
      return;
    }

    if (
      !targetItem ||
      !draggedItem ||
      targetItem.type !== "folder" ||
      draggedItem.id === targetItem.id
    )
      return;

    setIsMoving(true);

    // Optimistically hide the moved item so it feels instant
    const movedItemId = draggedItem.id;
    setOptimisticHiddenIds((prev) => [...prev, movedItemId]);

    try {
      const result = await moveItem(
        movedItemId,
        draggedItem.type,
        targetItem.id,
        folderId || null,
      );
      if (!result.success) {
        // Revert optimistic update on failure
        setOptimisticHiddenIds((prev) =>
          prev.filter((id) => id !== movedItemId),
        );
        throw new Error(result.error);
      }
      toast.success("Item berhasil dipindahkan.");
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
        header: ({ table }: { table: Table<FileItem> }) => (
          <div className="flex h-full items-center">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          </div>
        ),
        meta: {
          className:
            "w-10 lg:w-12 flex-shrink-0 flex items-center justify-center",
        },
        cell: ({ row }: { row: Row<FileItem> }) => (
          <div className="flex h-full items-center">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect() || row.original.isRestricted}
              onChange={row.getToggleSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ),
      },
      {
        header: "Nama File/Folder",
        accessorKey: "name",
        meta: { className: "flex-1 min-w-0" }, // min-w-0 ensures truncation works
        cell: (info: CellContext<FileItem, unknown>) => {
          const item = info.row.original;
          return (
            <div
              className={`group/item flex items-center gap-3 py-1 ${item.type === "folder" || (item.type === "file" && (item.mimeType?.includes("pdf") || item.mimeType?.includes("image"))) ? "cursor-pointer" : ""}`}
              onClick={() => {
                if (item.type === "folder" && onNavigate) {
                  onNavigate(item.id);
                } else if (item.type === "file" && (item.mimeType?.includes("pdf") || item.mimeType?.includes("image"))) {
                  handlePreview(item);
                }
              }}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform ${item.type === "folder" ? "bg-blue-50 text-blue-600 group-hover/item:scale-110 group-hover/item:bg-blue-100" : "bg-slate-50 text-slate-500"}`}
              >
                {getIcon(item)}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`font-bold truncate max-w-full ${item.type === "folder" ? "text-slate-800 group-hover/item:text-blue-700" : "text-slate-700"}`}
                >
                  {info.getValue() as string}
                </span>
                {/* Show sizes on mobile directly below the name since columns are hidden */}
                <span className="md:hidden text-xs text-slate-400 mt-0.5 truncate">
                  {item.type === "file"
                    ? `${item.size || "-"} • ${item.updatedAt}`
                    : item.updatedAt}
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
          <span className="text-sm font-medium text-slate-500">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        header: "Ukuran",
        accessorKey: "size",
        meta: {
          className: "w-32 lg:w-40 flex-shrink-0 hidden md:flex items-center",
        },
        cell: (info: CellContext<FileItem, unknown>) => (
          <span className="text-sm font-medium text-slate-500">
            {(info.getValue() as string) || "-"}
          </span>
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
                  setContextMenu({
                    visible: true,
                    x: rect.left - 150,
                    y: rect.bottom + window.scrollY,
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

  // Filter out optimistically hidden items and apply search & advanced filters
  const visibleData = useMemo(() => {
    return data.filter((item) => {
      if (optimisticHiddenIds.includes(item.id)) return false;
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;

      // Type Filter
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

      // Date Filter
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: visibleData,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility: {
        select: Object.keys(rowSelection).length > 0,
      },
    },
    enableRowSelection: (row) => !row.original.isRestricted,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const { rows } = table.getRowModel();
  const selectedRows = table.getSelectedRowModel().rows;

  return (
    <div className="flex flex-col rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden relative">
      {/* Batch Action Bar */}
      {selectedRows.length > 0 && (
        <div className="relative md:absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-emerald-600 px-4 sm:px-6 py-3 text-white animate-in slide-in-from-top-4">
          <span className="font-bold text-sm">
            {selectedRows.length} item terpilih
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const items = table
                  .getSelectedRowModel()
                  .rows.map((r) => r.original as FileItem);
                setMoveModalMode("move");
                setItemsToMove(items);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-700/50 px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 transition-colors mr-2"
            >
              <FolderIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Pindahkan</span>
            </button>
            <button
              onClick={() => {
                const items = table
                  .getSelectedRowModel()
                  .rows.map((r) => r.original as FileItem);
                setMoveModalMode("copy");
                setItemsToMove(items);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-500/50 px-3 py-1.5 text-sm font-medium hover:bg-blue-600 transition-colors mr-2"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Salin</span>
            </button>
            <button
              onClick={() => {
                const items = table
                  .getSelectedRowModel()
                  .rows.map((r) => r.original as FileItem);
                handleDownloadItems(items);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-700/50 px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 transition-colors mr-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={() => {
                const items = table
                  .getSelectedRowModel()
                  .rows.map((r) => r.original as FileItem);
                setItemsToDelete(items);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-500/50 px-3 py-1.5 text-sm font-medium hover:bg-rose-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Hapus</span>
            </button>
            <div className="h-4 w-px bg-emerald-500 mx-1" />
            <button
              onClick={() => table.resetRowSelection()}
              className="text-emerald-100 hover:text-white transition-colors text-sm font-medium ml-1"
            >
              Batal
            </button>
          </div>
        </div>
      )}
      {/* Table Area */}
      <div
        className="w-full text-left text-sm flex flex-col min-h-[200px]"
        onDragOver={(e) => handleDragOver(e)}
        onDrop={(e) => handleDrop(e)}
      >
        {/* Mobile Sort Control */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Urutkan:</span>
          <ModernSelect 
            value={sorting.length > 0 ? `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` : 'name-asc'}
            onChange={(value) => {
              const [id, desc] = value.split('-');
              setSorting([{ id, desc: desc === 'desc' }]);
            }}
            options={[
              { value: 'name-asc', label: 'Nama (A-Z)' },
              { value: 'name-desc', label: 'Nama (Z-A)' },
              { value: 'updatedAt-desc', label: 'Terbaru' },
              { value: 'updatedAt-asc', label: 'Terlama' },
              { value: 'size-desc', label: 'Ukuran (Terbesar)' },
              { value: 'size-asc', label: 'Ukuran (Terkecil)' }
            ]}
            triggerClassName="w-full flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            className="flex-1 min-w-0"
          />
        </div>

        {/* Table Header (Desktop) */}
        <div className="hidden md:flex w-full bg-slate-50/90 backdrop-blur-md border-b border-slate-100">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();
                return (
                  <div
                    key={header.id}
                    className={`px-4 lg:px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1 ${(header.column.columnDef.meta as Record<string, string>)?.className || ""} ${canSort ? "cursor-pointer select-none hover:text-slate-700" : ""}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {canSort && (
                      <span className="text-slate-400">
                        {{
                          asc: <ArrowUp className="h-3 w-3" />,
                          desc: <ArrowDown className="h-3 w-3" />,
                        }[isSorted as string] ?? (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
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
                  draggable={!item.isRestricted}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={(e) => handleDragLeave(e, item)}
                  onDrop={(e) => handleDrop(e, item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className={`flex w-full items-center transition-all py-1 border-2 border-transparent ${
                    isDragOver
                      ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 rounded-lg scale-[1.01] shadow-md z-10"
                      : "hover:bg-slate-50/50"
                  } ${draggedItem?.id === item.id ? "opacity-50" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className={`px-4 lg:px-6 py-2 ${(cell.column.columnDef.meta as Record<string, string>)?.className || ""}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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
                      (item.mimeType?.includes("pdf") ||
                        item.mimeType?.includes("image"))
                    ) {
                      handlePreview(item);
                    }
                  }}
                >
                  <div
                    className={`flex h-16 w-16 mb-3 items-center justify-center rounded-2xl transition-transform ${item.type === "folder" ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"}`}
                  >
                    {item.type === "folder" ? (
                      <FolderIcon className="h-8 w-8 fill-blue-500 text-blue-500" />
                    ) : (
                      getIcon(item)
                    )}
                  </div>
                  <div className="flex flex-col w-full text-center">
                    <span
                      className={`text-sm font-bold truncate px-1 ${item.type === "folder" ? "text-slate-800" : "text-slate-700"}`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 truncate">
                      {item.type === "file"
                        ? `${item.size || "-"} • ${item.updatedAt}`
                        : item.updatedAt}
                    </span>
                  </div>

                  {/* Grid Action Buttons overlay */}
                  <div
                    className={`absolute top-2 left-2 transition-opacity ${row.getIsSelected() ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      checked={row.getIsSelected()}
                      disabled={!row.getCanSelect() || item.isRestricted}
                      onChange={row.getToggleSelectedHandler()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div
                    className={`absolute top-2 right-2 transition-opacity ${contextMenu.item?.id === item.id ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setContextMenu({
                          visible: true,
                          x: rect.left - 150, // open to the left so it doesn't overflow right
                          y: rect.bottom + window.scrollY,
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

      {/* Pagination Controls */}
      {data.length > 10 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 px-6">
          <span className="text-xs font-semibold text-slate-500">
            Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
            {table.getPageCount()}
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
        itemName={
          itemsToDelete.length === 1 ? itemsToDelete[0].name : undefined
        }
        itemType={
          itemsToDelete.length === 1 ? itemsToDelete[0].type : undefined
        }
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
        onSuccess={() => table.resetRowSelection()}
      />

      <VersionHistoryModal
        isOpen={!!versionHistoryFile}
        onClose={() => setVersionHistoryFile(null)}
        file={versionHistoryFile}
        folderId={folderId || null}
      />

      {contextMenu.visible && contextMenu.item && (
        <div
          className="fixed z-50 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 250),
            left: Math.max(
              16,
              Math.min(contextMenu.x, window.innerWidth - 240),
            ),
          }}
        >
          <div className="px-3 py-2 border-b border-slate-50 mb-1">
            <p className="text-xs font-bold text-slate-800 truncate w-full">
              {contextMenu.item.name}
            </p>
          </div>

          {contextMenu.item.type !== "folder" &&
            (contextMenu.item.mimeType?.includes("pdf") ||
              contextMenu.item.mimeType?.includes("image")) && (
              <button
                onClick={() => {
                  handlePreview(contextMenu.item!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <Eye className="h-4 w-4" /> Pratinjau
              </button>
            )}

          {!contextMenu.item.isRestricted && (
            <button
              onClick={() => {
                const row = table
                  .getRowModel()
                  .rows.find((r) => r.original.id === contextMenu.item!.id);
                if (row) row.toggleSelected();
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" /> Pilih Item
            </button>
          )}

          {!contextMenu.item.isRestricted && (
              <button
                onClick={() => {
                  handleDownloadItems([contextMenu.item!]);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            )}

          {!contextMenu.item.isRestricted &&
            contextMenu.item.type !== "folder" && (
              <button
                onClick={() => {
                  handleShare(contextMenu.item!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <Share2 className="h-4 w-4" /> Bagikan
              </button>
            )}

          {!contextMenu.item.isRestricted &&
            contextMenu.item.type !== "folder" && (
              <button
                onClick={() => {
                  handleCopyLink(contextMenu.item!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <Link2 className="h-4 w-4" /> Salin Tautan
              </button>
            )}

          {!contextMenu.item.isRestricted && (
            <>
              <div className="h-px w-full bg-slate-50 my-1" />
              <button
                onClick={() => {
                  if (onShowInfo) onShowInfo(contextMenu.item!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <Info className="h-4 w-4" /> Detail File
              </button>
              {contextMenu.item.type !== "folder" && (
                <button
                  onClick={() => {
                    setVersionHistoryFile(contextMenu.item!);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
                >
                  <History className="h-4 w-4" /> Riwayat Versi
                </button>
              )}
              <button
                onClick={() => {
                  setItemToRename(contextMenu.item!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <Pencil className="h-4 w-4" /> Ganti Nama
              </button>
              <button
                onClick={() => {
                  setMoveModalMode("move");
                  setItemsToMove([contextMenu.item!]);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <FolderIcon className="h-4 w-4" /> Pindahkan
              </button>
              <button
                onClick={() => {
                  setMoveModalMode("copy");
                  setItemsToMove([contextMenu.item!]);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600"
              >
                <Copy className="h-4 w-4" /> Salin
              </button>
              <button
                onClick={() => {
                  handleDeleteClick(contextMenu.item!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
