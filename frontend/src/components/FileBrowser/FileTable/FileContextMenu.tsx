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
  FolderArchive,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { getOfficeFileType, openInDesktopOffice } from "@/lib/officeUri";
import { getR2FileUrl } from "@/lib/api";
import { exportFileForExternalApp } from "@/lib/exportUtils";
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
  onExtract?: (item: FileItem) => void;
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
  onExtract,
}: FileContextMenuProps) {
  if (!visible || !item) return null;

  const isFolder = item.type === "folder";
  const isPreviewable = !isFolder;
  const officeApp = !isFolder ? getOfficeFileType(item.name, item.mimeType) : null;
  const fileNameLower = item.name.toLowerCase();
  const isArchive =
    !isFolder &&
    (fileNameLower.endsWith(".zip") ||
      fileNameLower.endsWith(".rar") ||
      fileNameLower.endsWith(".7z") ||
      fileNameLower.endsWith(".tar") ||
      fileNameLower.endsWith(".gz") ||
      Boolean(item.mimeType?.includes("zip")) ||
      Boolean(item.mimeType?.includes("rar")) ||
      Boolean(item.mimeType?.includes("tar")) ||
      Boolean(item.mimeType?.includes("compressed")));

  const topPos = typeof window !== "undefined" ? Math.max(12, Math.min(y, window.innerHeight - 340)) : y;
  const leftPos = typeof window !== "undefined" ? Math.max(12, Math.min(x, window.innerWidth - 270)) : x;

  const hasPrimaryActions = isPreviewable || (isArchive && onExtract) || officeApp || !isFolder;
  const hasSecondaryActions = !isFolder || onDuplicate || isFolder;

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
        className="fixed z-[9999] w-[260px] min-w-[250px] rounded-2xl bg-white p-1.5 shadow-2xl ring-1 border border-slate-200/90 animate-in fade-in zoom-in-95 select-none"
        style={{ top: topPos, left: leftPos }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar 5 Icon Aksi Cepat (Pindah, Salin, Ganti Nama, Unduh, Hapus) */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-slate-50/90 rounded-xl border border-slate-200/70 mb-1.5 shadow-xs">
          {/* 1. Pindahkan ke... */}
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
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg active:scale-95 transition-all duration-150 relative group ${
              item.isLocked
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "text-slate-600 hover:text-indigo-600 hover:bg-white hover:shadow-xs cursor-pointer"
            }`}
            title={
              item.isLocked
                ? `Sedang dibuka & diedit oleh ${item.lockedBy || "pengguna lain"}`
                : "Pindahkan ke..."
            }
          >
            <FolderInput
              className={`h-4 w-4 transition-transform ${
                item.isLocked ? "text-slate-400" : "text-indigo-600 group-hover:scale-110"
              }`}
            />
            <span className="text-[10px] font-medium leading-none mt-1">Pindah</span>
            {item.isLocked && <Lock className="h-2.5 w-2.5 text-amber-500 absolute top-1 right-1" />}
          </button>

          {/* 2. Salin ke... */}
          <button
            type="button"
            onClick={() => {
              onCopy(item);
              onClose();
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-white hover:shadow-xs active:scale-95 transition-all duration-150 cursor-pointer group"
            title="Salin ke..."
          >
            <Copy className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium leading-none mt-1">Salin</span>
          </button>

          {/* 3. Ganti Nama */}
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
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg active:scale-95 transition-all duration-150 relative group ${
              item.isLocked
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "text-slate-600 hover:text-amber-600 hover:bg-white hover:shadow-xs cursor-pointer"
            }`}
            title={
              item.isLocked
                ? `Sedang dibuka & diedit oleh ${item.lockedBy || "pengguna lain"}`
                : "Ganti Nama"
            }
          >
            <Pencil
              className={`h-4 w-4 transition-transform ${
                item.isLocked ? "text-slate-400" : "text-amber-600 group-hover:scale-110"
              }`}
            />
            <span className="text-[10px] font-medium leading-none mt-1">Ganti</span>
            {item.isLocked && <Lock className="h-2.5 w-2.5 text-amber-500 absolute top-1 right-1" />}
          </button>

          {/* 4. Unduh Berkas / Unduh Folder */}
          <button
            type="button"
            onClick={() => {
              onDownload(item);
              onClose();
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white hover:shadow-xs active:scale-95 transition-all duration-150 cursor-pointer group"
            title={isFolder ? "Unduh Folder (ZIP)" : "Unduh Berkas"}
          >
            <Download className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium leading-none mt-1">Unduh</span>
          </button>

          {/* 5. Hapus */}
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
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg active:scale-95 transition-all duration-150 relative group ${
              item.isLocked
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-xs cursor-pointer"
            }`}
            title={
              item.isLocked
                ? `Sedang dibuka & diedit oleh ${item.lockedBy || "pengguna lain"}`
                : "Hapus"
            }
          >
            <Trash2 className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium leading-none mt-1">Hapus</span>
            {item.isLocked && <Lock className="h-2.5 w-2.5 text-amber-500 absolute top-1 right-1" />}
          </button>
        </div>

        {/* Daftar Aksi Tambahan & Spesifik */}
        <div className="flex flex-col gap-0.5">
          {isPreviewable && (
            <button
              type="button"
              onClick={() => {
                onPreview(item);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
            >
              <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Pratinjau Berkas</span>
            </button>
          )}

          {isArchive && onExtract && (
            <button
              type="button"
              onClick={() => {
                onExtract(item);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors text-left cursor-pointer"
            >
              <FolderArchive className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Ekstrak Berkas di Sini</span>
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
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left cursor-pointer"
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

          {!isFolder && (
            <button
              type="button"
              onClick={async () => {
                onClose();
                await exportFileForExternalApp(item);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50/70 hover:bg-purple-100 hover:text-purple-800 transition-colors text-left cursor-pointer"
              title="Siapkan berkas untuk di-drag atau ditempel ke SRIKANDI / TTE Kemenag"
            >
              <Send className="h-4 w-4 text-purple-600 shrink-0" />
              <span>Kirim ke SRIKANDI / TTE</span>
            </button>
          )}

          {hasPrimaryActions && hasSecondaryActions && <div className="h-px bg-slate-100 my-1" />}

          {!isFolder && (
            <button
              type="button"
              onClick={() => {
                onShare(item);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
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
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-amber-600 transition-colors text-left cursor-pointer"
          >
            <Star
              className={`h-4 w-4 shrink-0 ${isStarred ? "fill-amber-400 text-amber-400" : "text-slate-400"}`}
            />
            <span>{isStarred ? "Hapus dari Berbintang" : "Tambahkan ke Berbintang"}</span>
          </button>

          {onDuplicate && (
            <button
              type="button"
              onClick={() => {
                onDuplicate(item);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
            >
              <CopyPlus className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Buat Salinan</span>
            </button>
          )}

          {isFolder && (
            <button
              type="button"
              onClick={() => {
                onColor(item);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
            >
              <Palette className="h-4 w-4 text-rose-500 shrink-0" />
              <span>Warna Folder</span>
            </button>
          )}

          <div className="h-px bg-slate-100 my-1" />

          {!isFolder && (
            <button
              type="button"
              onClick={() => {
                onVersion(item);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
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
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
          >
            <Info className="h-4 w-4 text-slate-500 shrink-0" />
            <span>Detail Informasi</span>
          </button>
        </div>
      </div>
    </>
  );
}
