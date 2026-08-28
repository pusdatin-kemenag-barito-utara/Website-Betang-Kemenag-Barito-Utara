import { useState } from "react";
import { FolderPlus, X, Loader2 } from "lucide-react";
import { createFolder, reloadSoon } from "@/lib/api";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string;
  onSuccess?: () => void;
}

export function CreateFolderModal({ isOpen, onClose, parentId, onSuccess }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError("");

    const result = await createFolder(name.trim(), parentId);

    setIsLoading(false);
    if (result.success) {
      trackEvent("create_folder", {
        folder_name: name.trim(),
        parent_id: parentId,
      });
      setName("");
      onClose();
      toast.success("Folder berhasil dibuat.");
      window.dispatchEvent(new CustomEvent("folder-content-updated"));
      window.dispatchEvent(new CustomEvent("storage-updated"));
      if (onSuccess) {
        onSuccess();
      } else {
        reloadSoon();
      }
    } else {
      setError(result.error || "Gagal membuat folder");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md animate-in zoom-in-95 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <FolderPlus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Buat Folder Baru</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="folderName" className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Folder
              </label>
              <input
                id="folderName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Dokumen Kepegawaian"
                className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-all"
                autoFocus
                required
              />
              {error && <p className="mt-2 text-xs text-rose-500 font-medium">{error}</p>}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}