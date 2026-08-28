import {
  Eye,
  Download,
  Share2,
  Copy,
  Pencil,
  Palette,
  History,
  Trash2,
  Info,
  Star,
  FolderInput,
} from "lucide-react";
import type { FileItem } from "@/lib/types";

interface FileContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  item: FileItem | null;
  isStarred: boolean;
  onClose: () => void;
  onPreview: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onShare: (item: FileItem) => void;
  onToggleStar: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onCopy: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onColor: (item: FileItem) => void;
  onVersion: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onShowInfo: (item: FileItem) => void;
}

export function FileContextMenu({
  visible,
  x,
  y,
  item,
  isStarred,
  onClose,
  onPreview,
  onDownload,
  onShare,
  onToggleStar,
  onMove,
  onCopy,
  onRename,
  onColor,
  onVersion,
  onDelete,
  onShowInfo,
}: FileContextMenuProps) {
  if (!visible || !item) return null;

  const isFolder = item.type === "folder";
  const isPreviewable = !isFolder && (item.mimeType?.includes("pdf") || item.mimeType?.includes("image"));

  const topPos = typeof window !== "undefined" ? Math.max(12, Math.min(y, window.innerHeight - 380)) : y;
  const leftPos = typeof window !== "undefined" ? Math.max(12, Math.min(x, window.innerWidth - 230)) : x;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-[9999] min-w-[210px] rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200/90 animate-in fade-in zoom-in-95 select-none"
        style={{ top: topPos, left: leftPos }}
        onClick={(e) => e.stopPropagation()}
      >
        {isPreviewable && (
          <button
            type="button"
            onClick={() => {
              onPreview(item);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
          >
            <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Pratinjau Berkas</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onDownload(item);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
        >
          <Download className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{isFolder ? "Unduh Folder (ZIP)" : "Unduh Berkas"}</span>
        </button>

        {!isFolder && (
          <button
            type="button"
            onClick={() => {
              onShare(item);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-sky-600 shrink-0" />
            <span>Bagikan Tautan</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onToggleStar(item);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-amber-600 transition-colors text-left cursor-pointer"
        >
          <Star className={`h-4 w-4 shrink-0 ${isStarred ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />
          <span>{isStarred ? "Hapus dari Berbintang" : "Tambahkan ke Berbintang"}</span>
        </button>

        <div className="h-px bg-slate-100 my-1" />

        <button
          type="button"
          onClick={() => {
            onMove(item);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
        >
          <FolderInput className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>Pindahkan ke...</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onCopy(item);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
        >
          <Copy className="h-4 w-4 text-purple-600 shrink-0" />
          <span>Salin ke...</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onRename(item);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
        >
          <Pencil className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Ganti Nama</span>
        </button>

        {isFolder && (
          <button
            type="button"
            onClick={() => {
              onColor(item);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
          >
            <Palette className="h-4 w-4 text-rose-500 shrink-0" />
            <span>Warna Folder</span>
          </button>
        )}

        {!isFolder && (
          <button
            type="button"
            onClick={() => {
              onVersion(item);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
          >
            <History className="h-4 w-4 text-teal-600 shrink-0" />
            <span>Riwayat Versi</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onShowInfo(item);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
        >
          <Info className="h-4 w-4 text-slate-500 shrink-0" />
          <span>Detail Informasi</span>
        </button>

        <div className="h-px bg-slate-100 my-1" />

        <button
          type="button"
          onClick={() => {
            onDelete(item);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          <span>Hapus</span>
        </button>
      </div>
    </>
  );
}
