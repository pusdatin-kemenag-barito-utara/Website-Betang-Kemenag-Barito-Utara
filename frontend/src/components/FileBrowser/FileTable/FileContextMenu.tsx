import {
  Eye,
  Download,
  Share2,
  Copy,
  CopyPlus,
  Pencil,
  Palette,
  History,
  Trash2,
  Info,
  Star,
  FolderInput,
  ExternalLink,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { getOfficeFileType, openInDesktopOffice } from "@/lib/officeUri";
import { getR2FileUrl } from "@/lib/api";
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
  onDuplicate?: (item: FileItem) => void;
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
  onDuplicate,
  onRename,
  onColor,
  onVersion,
  onDelete,
  onShowInfo,
}: FileContextMenuProps) {
  if (!visible || !item) return null;

  const isFolder = item.type === "folder";
  const isPreviewable = !isFolder;
  const officeApp = !isFolder ? getOfficeFileType(item.name, item.mimeType) : null;

  const topPos = typeof window !== "undefined" ? Math.max(12, Math.min(y, window.innerHeight - 430)) : y;
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
        className="fixed z-[9999] min-w-[220px] rounded-2xl bg-white p-1.5 shadow-2xl ring-1 border border-slate-200/90 animate-in fade-in zoom-in-95 select-none"
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

        {officeApp && (
          <button
            type="button"
            onClick={() => {
              const fileUrl = getR2FileUrl(item.objectKey || item.id);
              openInDesktopOffice(fileUrl, item.name, item.mimeType, item.id);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left cursor-pointer"
          >
            <ExternalLink
              className={`h-4 w-4 shrink-0 ${
                officeApp === "word"
                  ? "text-blue-600"
                  : officeApp === "excel"
                    ? "text-emerald-600"
                    : "text-amber-600"
              }`}
            />
            <span>
              Buka di Microsoft{" "}
              {officeApp === "word"
                ? "Word"
                : officeApp === "excel"
                  ? "Excel"
                  : "PowerPoint"}
            </span>
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
          disabled={item.isLocked}
          onClick={() => {
            if (item.isLocked) {
              toast.error(
                `Berkas sedang dibuka & diedit di Microsoft Office oleh ${item.lockedBy || "pengguna lain"}. Pemindahan dinonaktifkan sementara.`
              );
              return;
            }
            onMove(item);
            onClose();
          }}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors text-left ${
            item.isLocked
              ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400"
              : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
          }`}
          title={
            item.isLocked
              ? `Sedang dibuka & diedit di Microsoft Office oleh ${item.lockedBy || "pengguna lain"}`
              : undefined
          }
        >
          <div className="flex items-center gap-2.5">
            <FolderInput className={`h-4 w-4 shrink-0 ${item.isLocked ? "text-slate-400" : "text-indigo-600"}`} />
            <span>Pindahkan ke...</span>
          </div>
          {item.isLocked && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
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

        {onDuplicate && (
          <button
            type="button"
            onClick={() => {
              onDuplicate(item);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
          >
            <CopyPlus className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Buat Salinan</span>
          </button>
        )}

        <button
          type="button"
          disabled={item.isLocked}
          onClick={() => {
            if (item.isLocked) {
              toast.error(
                `Berkas sedang dibuka & diedit di Microsoft Office oleh ${item.lockedBy || "pengguna lain"}. Ganti nama dinonaktifkan sementara.`
              );
              return;
            }
            onRename(item);
            onClose();
          }}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors text-left ${
            item.isLocked
              ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400"
              : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
          }`}
          title={
            item.isLocked
              ? `Sedang dibuka & diedit di Microsoft Office oleh ${item.lockedBy || "pengguna lain"}`
              : undefined
          }
        >
          <div className="flex items-center gap-2.5">
            <Pencil className={`h-4 w-4 shrink-0 ${item.isLocked ? "text-slate-400" : "text-amber-600"}`} />
            <span>Ganti Nama</span>
          </div>
          {item.isLocked && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
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
          disabled={item.isLocked}
          onClick={() => {
            if (item.isLocked) {
              toast.error(
                `Berkas sedang dibuka & diedit di Microsoft Office oleh ${item.lockedBy || "pengguna lain"}. Penghapusan dinonaktifkan sementara.`
              );
              return;
            }
            onDelete(item);
            onClose();
          }}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors text-left ${
            item.isLocked
              ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400"
              : "text-rose-600 hover:bg-rose-50 cursor-pointer"
          }`}
          title={
            item.isLocked
              ? `Sedang dibuka & diedit di Microsoft Office oleh ${item.lockedBy || "pengguna lain"}`
              : undefined
          }
        >
          <div className="flex items-center gap-2.5">
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>Hapus</span>
          </div>
          {item.isLocked && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
        </button>
      </div>
    </>
  );
}
