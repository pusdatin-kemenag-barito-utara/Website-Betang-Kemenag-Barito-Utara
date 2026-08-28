import {
  X,
  Star,
  FileText,
  Image as ImageIcon,
  Folder as FolderIcon,
  HardDrive,
  Calendar,
  Clock,
  User,
  Share2,
  Download,
  Eye,
  Trash2,
  Edit2,
  Palette,
  FileArchive,
} from "lucide-react";
import type { FileItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FileDetailsPanelProps {
  item: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPreview?: (item: FileItem) => void;
  onToggleStar?: (item: FileItem) => void;
  onShare?: (item: FileItem) => void;
  onDownload?: (item: FileItem) => void;
  onRename?: (item: FileItem) => void;
  onChangeColor?: (item: FileItem) => void;
  onDelete?: (item: FileItem) => void;
}

export function FileDetailsPanel({
  item,
  isOpen,
  onClose,
  onPreview,
  onToggleStar,
  onShare,
  onDownload,
  onRename,
  onChangeColor,
  onDelete,
}: FileDetailsPanelProps) {
  if (!isOpen || !item) return null;

  const isFolder = item.type === "folder";
  const isImage = !isFolder && item.mimeType?.startsWith("image/");
  const isPdf = !isFolder && item.mimeType === "application/pdf";
  const isZip = !isFolder && (item.mimeType?.includes("zip") || item.name.endsWith(".zip"));

  const getFileCategoryName = () => {
    if (isFolder) return "Folder Direktori";
    if (isPdf) return "Dokumen PDF";
    if (isImage) return "File Gambar";
    if (isZip) return "Arsip ZIP";
    return "Berkas Dokumen";
  };

  return (
    <div className="w-full lg:w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-200 z-20 shadow-xl lg:shadow-none">
      {/* Header Panel */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Rincian Item
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
          title="Tutup Panel Rincian (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Preview Card */}
      <div className="p-5 flex flex-col items-center justify-center border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 text-center">
        <div className="relative group mb-3">
          <div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105 duration-200",
              isFolder
                ? "bg-amber-500/10 text-amber-500"
                : isPdf
                ? "bg-red-500/10 text-red-500"
                : isImage
                ? "bg-blue-500/10 text-blue-500"
                : "bg-emerald-500/10 text-emerald-500"
            )}
            style={
              isFolder && item.color
                ? {
                    backgroundColor: `${item.color}20`,
                    color: item.color,
                  }
                : undefined
            }
          >
            {isFolder ? (
              <FolderIcon className="w-10 h-10 fill-current" />
            ) : isPdf ? (
              <FileText className="w-10 h-10" />
            ) : isImage ? (
              <ImageIcon className="w-10 h-10" />
            ) : isZip ? (
              <FileArchive className="w-10 h-10" />
            ) : (
              <FileText className="w-10 h-10" />
            )}
          </div>

          {/* Star Button Badge */}
          <button
            onClick={() => onToggleStar?.(item)}
            className={cn(
              "absolute -top-1 -right-1 p-1.5 rounded-full shadow-md transition-all",
              item.isStarred
                ? "bg-amber-400 text-slate-900 scale-110"
                : "bg-white dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:scale-110 border border-slate-200 dark:border-slate-700"
            )}
            title={item.isStarred ? "Hapus dari Berbintang" : "Tambahkan ke Berbintang"}
          >
            <Star className={cn("w-3.5 h-3.5", item.isStarred && "fill-current")} />
          </button>
        </div>

        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm break-all max-w-full line-clamp-2 px-2">
          {item.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {getFileCategoryName()}
        </p>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 mt-4">
          {!isFolder && (
            <button
              onClick={() => onPreview?.(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
              title="Pratinjau Berkas"
            >
              <Eye className="w-3.5 h-3.5" />
              Pratinjau
            </button>
          )}

          {!isFolder && (
            <button
              onClick={() => onShare?.(item)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              title="Bagikan Tautan"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {isFolder && (
            <button
              onClick={() => onChangeColor?.(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
              title="Ganti Warna Folder"
            >
              <Palette className="w-3.5 h-3.5 text-emerald-500" />
              Warna
            </button>
          )}

          <button
            onClick={() => onDownload?.(item)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Unduh"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => onRename?.(item)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Ubah Nama"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete?.(item)}
            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40"
            title="Hapus ke Recycle Bin"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metadata Detail List */}
      <div className="p-4 space-y-4 text-xs">
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            Informasi Berkas
          </h4>
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                Ukuran
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                {item.size || "-"}
                {item.rawSizeBytes && item.rawSizeBytes > 0
                  ? ` (${item.rawSizeBytes.toLocaleString("id-ID")} bytes)`
                  : ""}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Tipe MIME
              </span>
              <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 text-right truncate max-w-[140px]">
                {item.mimeType || (isFolder ? "inode/directory" : "application/octet-stream")}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Terakhir Diubah
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                {item.updatedAt}
              </span>
            </div>

            {item.createdAt && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Dibuat Pada
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                  {item.createdAt}
                </span>
              </div>
            )}

            {item.uploadedBy && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Pengunggah
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right truncate max-w-[130px]">
                  {item.uploadedBy}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security & Access Info */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            Hak Akses & Keamanan
          </h4>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Visibilitas</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {item.isRestricted ? "Terbatas (Seksi)" : "Publik Internal"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status Berbintang</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {item.isStarred ? "⭐ Ya (Favorit)" : "Tidak"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
