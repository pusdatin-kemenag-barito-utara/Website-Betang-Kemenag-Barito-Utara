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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Samping Kanan */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header Panel */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Detail Informasi
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="Tutup Panel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Preview Card */}
        <div className="p-5 flex flex-col items-center justify-center border-b border-slate-100 bg-slate-50/40 text-center">
          <div className="relative group mb-3">
            <div
              className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-105 duration-200",
                isFolder
                  ? "bg-amber-500/10 text-amber-500"
                  : isPdf
                  ? "bg-rose-500/10 text-rose-500"
                  : isImage
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-emerald-500/10 text-emerald-500"
              )}
              style={
                isFolder && item.color
                  ? { backgroundColor: `${item.color}20`, color: item.color }
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
              type="button"
              onClick={() => onToggleStar?.(item)}
              className={cn(
                "absolute -top-1 -right-1 p-1.5 rounded-full shadow-md transition-all cursor-pointer",
                item.isStarred
                  ? "bg-amber-400 text-slate-900 scale-110"
                  : "bg-white text-slate-400 hover:text-amber-500 hover:scale-110 border border-slate-200"
              )}
              title={item.isStarred ? "Hapus dari Berbintang" : "Tambahkan ke Berbintang"}
            >
              <Star className={cn("w-3.5 h-3.5", item.isStarred && "fill-current")} />
            </button>
          </div>

          <h3 className="font-bold text-slate-800 text-sm break-all max-w-full line-clamp-2 px-2">
            {item.name}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            {getFileCategoryName()}
          </p>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 mt-4 flex-wrap justify-center">
            {!isFolder && (
              <button
                type="button"
                onClick={() => onPreview?.(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
                title="Pratinjau Berkas"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pratinjau</span>
              </button>
            )}

            {!isFolder && (
              <button
                type="button"
                onClick={() => onShare?.(item)}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                title="Bagikan Tautan"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {isFolder && (
              <button
                type="button"
                onClick={() => onChangeColor?.(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Ganti Warna Folder"
              >
                <Palette className="w-3.5 h-3.5 text-emerald-600" />
                <span>Warna</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onDownload?.(item)}
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              title="Unduh"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onRename?.(item)}
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              title="Ubah Nama"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onDelete?.(item)}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 cursor-pointer"
              title="Hapus ke Recycle Bin"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata Detail List */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 mb-2.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              Informasi Berkas
            </h4>
            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  Ukuran
                </span>
                <span className="font-semibold text-slate-800 text-right">
                  {item.size || "-"}
                  {item.rawSizeBytes && item.rawSizeBytes > 0
                    ? ` (${item.rawSizeBytes.toLocaleString("id-ID")} bytes)`
                    : ""}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Tipe MIME
                </span>
                <span className="font-mono text-[11px] text-slate-800 text-right truncate max-w-[140px]">
                  {item.mimeType || (isFolder ? "inode/directory" : "application/octet-stream")}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Terakhir Diubah
                </span>
                <span className="font-semibold text-slate-800 text-right">
                  {item.updatedAt}
                </span>
              </div>

              {item.createdAt && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Dibuat Pada
                  </span>
                  <span className="font-semibold text-slate-800 text-right">
                    {item.createdAt}
                  </span>
                </div>
              )}

              {item.uploadedBy && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Pengunggah
                  </span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[130px]">
                    {item.uploadedBy}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Security & Access Info */}
          <div>
            <h4 className="font-bold text-slate-700 mb-2.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              Hak Akses & Keamanan
            </h4>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Visibilitas</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {item.isRestricted ? "Terbatas (Seksi)" : "Publik Internal"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status Berbintang</span>
                <span className="text-slate-700 font-semibold">
                  {item.isStarred ? "⭐ Ya (Favorit)" : "Tidak"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
