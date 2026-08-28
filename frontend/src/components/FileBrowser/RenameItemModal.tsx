// Modal ubah nama item. Salin utuh dari aplikasi lama.
import { useState, useEffect } from "react";
import { Pencil, Loader2, X } from "lucide-react";

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (itemType === "file") {
          const lastDot = initialName.lastIndexOf(".");
          if (lastDot > 0) {
            setName(initialName.substring(0, lastDot));
          } else {
            setName(initialName);
          }
        } else {
          setName(initialName);
        }
        setError("");
      }, 0);
    }
  }, [isOpen, initialName, itemType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Nama tidak boleh kosong");
      return;
    }

    if (name.trim() === initialName) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Pasang kembali ekstensi bila file.
      let finalName = name.trim();
      if (itemType === "file") {
        const lastDot = initialName.lastIndexOf(".");
        if (lastDot > 0) {
          finalName = `${finalName}${initialName.substring(lastDot)}`;
        }
      }

      await onConfirm(finalName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md animate-in zoom-in-95 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Ubah Nama</h2>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{itemType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-1.5">
                Nama Baru
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 transition-all disabled:opacity-50"
                  placeholder={`Masukkan nama ${itemType}...`}
                  autoFocus
                />
                {itemType === "file" && initialName.includes(".") && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 pointer-events-none">
                    {initialName.substring(initialName.lastIndexOf("."))}
                  </span>
                )}
              </div>
              {error && <p className="mt-2 text-xs font-medium text-rose-500">{error}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
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