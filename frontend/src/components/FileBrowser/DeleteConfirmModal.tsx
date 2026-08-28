// Modal konfirmasi hapus item (file/folder/batch). Salin utuh dari aplikasi lama.
import { Loader2, Trash2, Files } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  itemType?: "folder" | "file";
  itemCount?: number;
  isDeleting: boolean;
  isPermanent?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  itemCount = 1,
  isDeleting,
  isPermanent = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-md flex-col animate-in zoom-in-95 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-6 ring-8 ring-rose-50">
            {itemCount > 1 ? <Files className="h-8 w-8" /> : <Trash2 className="h-8 w-8" />}
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            {itemCount > 1 ? `Hapus ${itemCount} Item?` : `Hapus ${itemType === "folder" ? "Folder" : "Dokumen"}?`}
          </h2>

          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {itemCount > 1 ? (
              <>Anda yakin ingin menghapus <strong className="text-slate-700">{itemCount} item yang dipilih</strong>?</>
            ) : (
              <>Anda yakin ingin menghapus <strong className="text-slate-700">&quot;{itemName}&quot;</strong>?</>
            )}{" "}
            {isPermanent ? (
              <span className="text-rose-600 font-medium">
                Tindakan ini permanen dan data tidak dapat dikembalikan.
              </span>
            ) : (
              <span>
                File ini akan dipindahkan ke Trash (Tempat Sampah) dan tidak akan hilang permanen
                sebelum Anda mengosongkan Trash.
              </span>
            )}
          </p>
        </div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-1/2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex w-full sm:w-1/2 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/30 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Ya, Hapus</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}