import { useState } from "react";
import { Download, FolderInput, Copy, Trash2, Loader2 } from "lucide-react";
import { downloadZip, getPresignedDownloadUrl, getR2FileUrl } from "@/lib/api";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";

interface FileTableBatchBarProps {
  selectedItems: FileItem[];
  onMoveBatch: () => void;
  onCopyBatch: () => void;
  onDeleteBatch: () => void;
}

export function FileTableBatchBar({
  selectedItems,
  onMoveBatch,
  onCopyBatch,
  onDeleteBatch,
}: FileTableBatchBarProps) {
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const count = selectedItems.length;

  if (count === 0) return null;

  const handleDownloadBatch = async () => {
    setIsDownloadingBatch(true);
    const firstItem = selectedItems[0];

    // Jika hanya 1 file individual terpilih, unduh langsung via Cloudflare R2 CDN
    if (count === 1 && firstItem && firstItem.type === "file") {
      try {
        const directUrl = getR2FileUrl(firstItem.objectKey || firstItem.id);
        const a = document.createElement("a");
        a.href = directUrl;
        a.download = firstItem.name;
        a.target = "_blank";
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Mengunduh ${firstItem.name}`);
        setIsDownloadingBatch(false);
        return;
      } catch {
        try {
          const res = await getPresignedDownloadUrl(firstItem.objectKey || firstItem.id, firstItem.name);
          if (res.success && res.presignedUrl) {
            const a = document.createElement("a");
            a.href = res.presignedUrl;
            a.download = firstItem.name;
            a.click();
            toast.success(`Mengunduh ${firstItem.name}`);
            setIsDownloadingBatch(false);
            return;
          }
        } catch {
          // Lanjutkan ke mekanisme ZIP bila URL direct/presigned gagal
        }
      }
    }

    toast.info("Mengemas berkas ke ZIP...");
    try {
      const items = selectedItems.map((r) => ({ id: r.id, type: r.type }));
      const res = await downloadZip(items);
      if (res.success && res.blob) {
        let zipName = `Arsip_${count}_Dokumen.zip`;
        if (count === 1 && firstItem) {
          zipName = `${firstItem.name}.zip`;
        }

        const url = URL.createObjectURL(res.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = zipName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Download ${zipName} berhasil`);
      } else {
        toast.error("Gagal mengunduh berkas ZIP");
      }
    } catch {
      toast.error("Terjadi kesalahan saat mengunduh");
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 animate-in fade-in">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
          {count}
        </span>
        <span className="text-xs font-bold text-emerald-900">
          {count} item terpilih
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleDownloadBatch}
          disabled={isDownloadingBatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          {isDownloadingBatch ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <span>{count === 1 && selectedItems[0]?.type === "file" ? "Unduh Berkas" : "Unduh ZIP"}</span>
        </button>

        <button
          type="button"
          onClick={onMoveBatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <FolderInput className="h-3.5 w-3.5 text-indigo-600" />
          <span>Pindahkan</span>
        </button>

        <button
          type="button"
          onClick={onCopyBatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <Copy className="h-3.5 w-3.5 text-purple-600" />
          <span>Salin</span>
        </button>

        <button
          type="button"
          onClick={onDeleteBatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 transition-colors cursor-pointer shadow-2xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  );
}
