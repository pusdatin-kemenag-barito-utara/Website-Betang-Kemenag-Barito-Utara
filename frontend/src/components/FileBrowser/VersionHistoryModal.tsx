// Modal riwayat versi file. Pengganti VersionHistoryModal.tsx lama
// (getFileVersions/restoreFileVersion dari lib/api; reload setelah restore).
import { useState, useEffect } from "react";
import { X, History, RotateCcw, Loader2 } from "lucide-react";
import { getFileVersions, restoreFileVersion, reloadSoon } from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatFileSize } from "@/lib/utils";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  folderId: string | null;
}

interface FileVersionItem {
  id: string;
  created_at: string;
  size_bytes: number;
  uploaded_by_user?: { full_name: string } | null;
}

export function VersionHistoryModal({ isOpen, onClose, file, folderId }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<FileVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  useEffect(() => {
    const loadVersions = async () => {
      if (!file) return;
      setIsLoading(true);
      const { success, data, error } = await getFileVersions(file.id);
      if (success && data) {
        setVersions(data);
      } else {
        toast.error(error || "Gagal memuat riwayat versi");
      }
      setIsLoading(false);
    };

    if (isOpen && file) {
      loadVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file]);

  const handleRestore = async (versionId: string) => {
    if (!file) return;
    setIsRestoring(versionId);
    try {
      const { success, error } = await restoreFileVersion(file.id, versionId, folderId);
      if (success) {
        trackEvent("restore_file_version", {
          file_id: file.id,
          file_name: file.name,
          version_id: versionId,
        });
        toast.success("Berhasil memulihkan ke versi yang dipilih.");
        onClose();
        reloadSoon();
      } else {
        toast.error(error || "Gagal memulihkan versi.");
      }
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setIsRestoring(null);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-lg flex-col animate-in zoom-in-95 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Riwayat Versi</h2>
              <p className="text-sm font-medium text-slate-500 truncate max-w-[250px]">{file.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
              <p className="text-sm text-slate-500 font-medium">Memuat riwayat...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <History className="h-12 w-12 text-slate-300 mb-3" />
              <p className="font-bold text-slate-700">Belum ada versi lama</p>
              <p className="text-sm text-slate-500 max-w-xs mt-1">
                Versi lama akan muncul di sini jika ada pengguna yang mengupload file dengan nama yang sama.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">Versi {versions.length - i}</span>
                    <span className="text-xs font-medium text-slate-500 mt-0.5">
                      {format(new Date(v.created_at), "d MMM yyyy, HH:mm", { locale: id })}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                      {formatFileSize(v.size_bytes)} • Oleh: {v.uploaded_by_user?.full_name || "Unknown"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestore(v.id)}
                    disabled={isRestoring !== null}
                    className="flex h-9 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {isRestoring === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}