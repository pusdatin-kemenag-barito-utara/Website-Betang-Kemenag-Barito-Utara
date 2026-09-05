import { useState } from "react";
import {
  UserPlus,
  X,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User as UserIcon,
  Building2,
  ShieldCheck,
  Plus,
  FolderKey,
  Folder,
} from "lucide-react";
import type { Bidang, RootFolderOption, AddUserFormState } from "./types";
import { AddBidangModal } from "@/components/Bidang/AddBidangModal";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddUserFormState) => Promise<void>;
  bidangList: Bidang[];
  allRootFolders?: RootFolderOption[];
  isSubmitting: boolean;
  onOpenFolderAccessForBidang?: (bidangId: string, bidangName: string) => void;
  onBidangAdded?: (newBidang: Bidang) => void;
}

export function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
  bidangList,
  allRootFolders = [],
  isSubmitting,
  onOpenFolderAccessForBidang,
  onBidangAdded,
}: AddUserModalProps) {
  const [form, setForm] = useState<AddUserFormState>({
    email: "",
    username: "",
    full_name: "",
    password: "",
    role: "Admin Bidang",
    bidang_id: null,
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isAddBidangOpen, setIsAddBidangOpen] = useState(false);

  if (!isOpen) return null;

  const selectedBidang = bidangList.find((b) => b.id === form.bidang_id);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const handleBidangCreated = (created?: { id: string; name: string }) => {
    if (created) {
      const newB: Bidang = {
        id: created.id,
        name: created.name,
        accessibleFolderNames: [created.name],
      };
      if (onBidangAdded) {
        onBidangAdded(newB);
      }
      setForm((p) => ({ ...p, bidang_id: created.id }));
    }
    setIsAddBidangOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl ring-1 ring-slate-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Tambah Pengguna Baru
              </h3>
              <p className="text-xs text-slate-500">
                Buat akun autentikasi dan tetapkan hak akses di SI BETANG
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, full_name: e.target.value }))
                }
                placeholder="Contoh: Muhammad Nazilah, S.E"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Email & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Akun <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      email: e.target.value,
                      username: p.username || e.target.value.split("@")[0],
                    }))
                  }
                  placeholder="admin@kemenag.go.id"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  setForm((p) => ({ ...p, username: e.target.value }))
                }
                placeholder="nama.pengguna"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Kata Sandi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Kata Sandi Awal <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Peran (Role) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Peran Akses <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, role: "Admin Bidang" }))
                }
                className={`flex items-center justify-center gap-2 rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer ${
                  form.role === "Admin Bidang"
                    ? "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Admin Bidang</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    role: "Super Admin",
                    bidang_id: null,
                  }))
                }
                className={`flex items-center justify-center gap-2 rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer ${
                  form.role === "Super Admin"
                    ? "border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-500/20"
                    : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Super Admin</span>
              </button>
            </div>
          </div>

          {/* Pilihan Seksi / Bidang (jika Admin Bidang) */}
          {form.role === "Admin Bidang" && (
            <div className="space-y-2.5 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200/70">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Penempatan Seksi / Bidang <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddBidangOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah Bidang Baru</span>
                </button>
              </div>

              <select
                value={form.bidang_id || ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    bidang_id: e.target.value || null,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="">-- Pilih Seksi / Bidang --</option>
                {bidangList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* RBAC Info Card */}
              {selectedBidang ? (
                <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <FolderKey className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Hak Akses Folder Root (RBAC):</span>
                    </div>
                    {onOpenFolderAccessForBidang && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenFolderAccessForBidang(selectedBidang.id, selectedBidang.name)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        <span>Atur Akses</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {selectedBidang.accessibleFolderNames &&
                    selectedBidang.accessibleFolderNames.length > 0 ? (
                      selectedBidang.accessibleFolderNames.map((fn, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200/50"
                        >
                          <Folder className="h-3 w-3 text-emerald-600" />
                          <span>{fn}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                        Bidang ini belum memiliki akses ke folder root manapun.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Pilih bidang untuk mengaitkan hak akses folder root arsip bagi pengguna ini.
                </p>
              )}
            </div>
          )}

          {/* Status Aktif */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="add-is-active"
              checked={form.is_active}
              onChange={(e) =>
                setForm((p) => ({ ...p, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label
              htmlFor="add-is-active"
              className="text-xs font-bold text-slate-700 cursor-pointer select-none"
            >
              Akun Langsung Aktif dan Siap Digunakan
            </label>
          </div>

          {/* Tombol Aksi */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Simpan Pengguna</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Submodal Tambah Bidang Cepat */}
      {isAddBidangOpen && (
        <AddBidangModal
          isOpen={isAddBidangOpen}
          onClose={() => setIsAddBidangOpen(false)}
          allRootFolders={allRootFolders}
          onSuccess={handleBidangCreated}
        />
      )}
    </div>
  );
}
