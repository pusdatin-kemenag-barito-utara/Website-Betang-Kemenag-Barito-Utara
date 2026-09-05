import { AlertCircle, Trash2 } from "lucide-react";
import type { UserItem } from "@/lib/api";

interface DeleteUserModalProps {
  user: UserItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

export function DeleteUserModal({
  user,
  onClose,
  onConfirm,
  isSubmitting,
}: DeleteUserModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="text-lg font-black text-slate-900">
          Hapus Akun Pengguna?
        </h3>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Tindakan ini akan menghapus akun{" "}
          <strong className="text-slate-800">{user.full_name}</strong> (
          <span className="text-slate-700 font-mono">{user.email}</span>)
          secara permanen dari sistem SI BETANG dan mencabut seluruh hak aksesnya.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/25 transition-all hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Menghapus...</span>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Ya, Hapus Akun</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
