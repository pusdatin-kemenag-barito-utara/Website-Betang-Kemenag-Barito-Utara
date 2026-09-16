// Modal ubah nama item dengan dock format ekstensi mandiri agar tidak menutupi teks panjang
import { useState, useEffect } from "react";
import { Pencil, Loader2, X, FileText, Folder } from "lucide-react";

interface RenameItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>;
  initialName: string;
  itemType: "folder" | "file";
}

export function RenameItemModal({ isOpen, onClose, onConfirm, initialName, itemType }: RenameItemModalProps) {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const lastDot = initialName.lastIndexOf(".");
  const fileExtension = itemType === "file" && lastDot > 0 ? initialName.substring(lastDot) : "";

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (itemType === "file" && lastDot > 0) {
          setName(initialName.substring(0, lastDot));
        } else {
          setName(initialName);
        }
        setError("");
      }, 0);
    }
  }, [isOpen, initialName, itemType, lastDot]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nama tidak boleh kosong");
      return;
    }

    const finalName = itemType === "file" && fileExtension ? `${name.trim()}${fileExtension}` : name.trim();

    if (finalName === initialName) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm(finalName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengubah nama");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg animate-in zoom-in-95 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Ubah Nama</h2>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                {itemType === "file" ? <FileText className="w-3 h-3 text-blue-500" /> : <Folder className="w-3 h-3 text-amber-500" />}
                {itemType === "file" ? "Berkas Dokumen" : "Folder"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="rename-input" className="block text-xs sm:text-sm font-bold text-slate-700">
                  Nama Baru
                </label>
                {fileExtension && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Format: <span className="text-slate-600 font-bold">{fileExtension}</span>
                  </span>
                )}
              </div>

              {/* Group Input dengan Extension Docked Terpisah (Mencegah teks nama bertumpuk dengan ekstensi) */}
              <div className="flex items-center rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600 transition-all overflow-hidden shadow-xs">
                <input
                  type="text"
                  id="rename-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 min-w-0 border-0 bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 font-medium"
                  placeholder={`Masukkan nama ${itemType}...`}
                  autoFocus
                />
                {itemType === "file" && fileExtension && (
                  <div className="shrink-0 flex items-center px-3.5 py-3 bg-slate-100 border-l border-slate-200 text-xs sm:text-sm font-bold text-slate-600 select-none tracking-wide">
                    {fileExtension}
                  </div>
                )}
              </div>

              {/* Pratinjau Nama Lengkap Dokumen */}
              {itemType === "file" && fileExtension && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-xs text-slate-600">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    Hasil:
                  </span>
                  <span
                    className="text-xs text-slate-800 font-semibold truncate select-all"
                    title={`${name.trim()}${fileExtension}`}
                  >
                    {name.trim() ? `${name.trim()}${fileExtension}` : `(nama kosong)${fileExtension}`}
                  </span>
                </div>
              )}

              {error && <p className="mt-2 text-xs font-semibold text-rose-500 animate-in fade-in">{error}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-7 flex items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl bg-white px-4.5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}