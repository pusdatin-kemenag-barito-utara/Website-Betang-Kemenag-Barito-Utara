import {
  FileIcon,
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Star,
  MoreVertical,
  Info,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { formatFileSize } from "@/lib/utils";
import type { FileItem } from "@/lib/types";

export const getFileIcon = (item: FileItem) => {
  if (item.type === "folder") {
    const colorStyle = item.color ? { color: item.color, fill: item.color } : undefined;
    return (
      <FolderIcon
        className={`h-5 w-5 shrink-0 ${item.color ? "" : "fill-blue-500 text-blue-500"}`}
        style={colorStyle}
      />
    );
  }
  if (item.mimeType?.includes("pdf")) return <FileText className="h-5 w-5 shrink-0 text-rose-500" />;
  if (item.mimeType?.includes("image")) return <ImageIcon className="h-5 w-5 shrink-0 text-emerald-500" />;
  if (item.mimeType?.includes("zip") || item.name.endsWith(".zip"))
    return <FileArchive className="h-5 w-5 shrink-0 text-amber-500" />;
  return <FileIcon className="h-5 w-5 shrink-0 text-slate-500" />;
};

export const getFileTypeLabel = (item: FileItem): string => {
  if (item.type === "folder") return "Folder";
  const name = item.name.trim();
  const lastDot = name.lastIndexOf(".");
  if (lastDot > 0 && lastDot < name.length - 1) {
    const ext = name.substring(lastDot + 1).toUpperCase();
    if (ext.length <= 5) return ext;
  }
  if (item.mimeType?.includes("pdf")) return "PDF";
  if (item.mimeType?.includes("image")) return "Gambar";
  if (item.mimeType?.includes("zip")) return "ZIP";
  return "Berkas";
};

export function createFileTableColumns({
  onNavigate,
  onPreview,
  onToggleStar,
  onOpenMenu,
  starredMap,
  onShowInfo,
}: {
  onNavigate?: (id: string) => void;
  onPreview: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onToggleStar: (item: FileItem, e?: React.MouseEvent) => void;
  onDelete: (item: FileItem) => void;
  onShowInfo?: (item: FileItem) => void;
  onOpenMenu: (e: React.MouseEvent, item: FileItem) => void;
  starredMap: Record<string, boolean>;
}): ColumnDef<FileItem>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => {
        const item = row.original;
        const isFolder = item.type === "folder";
        const isStarred = starredMap[item.id] ?? item.isStarred ?? false;
        const formatLabel = getFileTypeLabel(item);
        const hasRealSize =
          (item.rawSizeBytes && item.rawSizeBytes > 0) ||
          (item.size && item.size !== "-" && item.size !== "Folder" && item.size !== "—");
        const displaySize = hasRealSize
          ? item.rawSizeBytes && item.rawSizeBytes > 0
            ? formatFileSize(item.rawSizeBytes)
            : item.size
          : "";

        const content = (
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="font-semibold text-slate-800 hover:text-emerald-600 transition-colors truncate block w-full text-xs sm:text-sm">
              {item.name}
            </span>
            {/* Subtitle metadata khusus tampilan mobile (< sm) */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5 sm:hidden truncate overflow-hidden">
              {displaySize ? (
                <>
                  <span className="shrink-0">{displaySize}</span>
                  <span>•</span>
                </>
              ) : null}
              <span className="shrink-0">{formatLabel}</span>
              {(item.updatedAt || item.createdAt) && (
                <>
                  <span>•</span>
                  <span className="truncate">{item.updatedAt || item.createdAt}</span>
                </>
              )}
            </div>
          </div>
        );

        return (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full overflow-hidden">
            {/* Tombol bintang di kolom nama hanya tampil di desktop (di mobile menyatu di kolom aksi kanan) */}
            <button
              type="button"
              onClick={(e) => onToggleStar(item, e)}
              className="hidden sm:inline-flex text-slate-300 hover:text-amber-400 transition-colors p-0.5 shrink-0 cursor-pointer"
              title={isStarred ? "Hapus dari Berbintang" : "Tambahkan ke Berbintang"}
            >
              <Star
                className={`h-4 w-4 ${
                  isStarred ? "fill-amber-400 text-amber-400" : "hover:scale-110"
                }`}
              />
            </button>

            {isFolder ? (
              <a
                href={`/folders/${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(item.id);
                  }
                }}
                className="flex items-center gap-2 sm:gap-2.5 min-w-0 w-full overflow-hidden"
              >
                {getFileIcon(item)}
                {content}
              </a>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(item);
                }}
                className="flex items-center gap-2 sm:gap-2.5 min-w-0 w-full overflow-hidden text-left cursor-pointer"
              >
                {getFileIcon(item)}
                {content}
              </button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "size",
      header: "Ukuran",
      cell: ({ row }) => {
        const item = row.original;
        const displaySize =
          item.size && item.size !== "-"
            ? item.size
            : item.rawSizeBytes && item.rawSizeBytes > 0
            ? formatFileSize(item.rawSizeBytes)
            : item.type === "folder"
            ? "—"
            : "0 B";

        return (
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {displaySize}
          </span>
        );
      },
      size: 100,
    },
    {
      id: "format",
      header: "Jenis",
      cell: ({ row }) => {
        const item = row.original;
        const formatLabel = getFileTypeLabel(item);
        const isFolder = item.type === "folder";

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase whitespace-nowrap ${
              isFolder
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200/70"
                : formatLabel === "PDF"
                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70"
                : ["JPG", "JPEG", "PNG", "WEBP", "GIF", "GAMBAR"].includes(formatLabel)
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
                : ["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(formatLabel)
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70"
                : ["DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX"].includes(formatLabel)
                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70"
                : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {formatLabel}
          </span>
        );
      },
      size: 90,
    },
    {
      accessorKey: "updatedAt",
      header: "Terakhir Diubah",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {item.updatedAt || item.createdAt || "-"}
          </span>
        );
      },
      size: 130,
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const item = row.original;
        const isStarred = starredMap[item.id] ?? item.isStarred ?? false;

        return (
          <div className="flex items-center justify-end gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Tombol Bintang untuk layar Mobile (< sm) */}
            <button
              type="button"
              onClick={(e) => onToggleStar(item, e)}
              className="sm:hidden p-1.5 rounded-lg text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
              title={isStarred ? "Hapus dari Berbintang" : "Tambahkan ke Berbintang"}
            >
              <Star
                className={`h-4 w-4 ${
                  isStarred ? "fill-amber-400 text-amber-400" : "hover:scale-110"
                }`}
              />
            </button>

            {onShowInfo && (
              <button
                type="button"
                onClick={() => onShowInfo(item)}
                className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Detail Informasi"
              >
                <Info className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => onOpenMenu(e, item)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Menu Opsi"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        );
      },
      enableSorting: false,
      size: 85,
    },
  ];
}
