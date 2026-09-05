import { useState, useEffect } from "react";
import {
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  Lock,
  Building2,
  ShieldCheck,
  Plus,
  FolderKey,
  Folder,
  User,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Bidang, RootFolderOption, EditUserFormState } from "./types";
import type { UserItem } from "@/lib/api";
import { AddBidangModal } from "@/components/Bidang/AddBidangModal";

interface EditUserModalProps {
  user: UserItem | null;
  onClose: () => void;
  onSubmit: (data: EditUserFormState) => Promise<void>;
  bidangList: Bidang[];
  allRootFolders?: RootFolderOption[];
  isSubmitting: boolean;
  onOpenFolderAccessForBidang?: (bidangId: string, bidangName: string) => void;
  onBidangAdded?: (newBidang: Bidang) => void;
  isSelf?: boolean;
}

export function EditUserModal({
  user,
  onClose,
  onSubmit,
  bidangList,
  allRootFolders = [],
  isSubmitting,
  onOpenFolderAccessForBidang,
  onBidangAdded,
  isSelf = false,
}: EditUserModalProps) {
  const [form, setForm] = useState<EditUserFormState>({
    full_name: "",
    role: "Admin Bidang",
    bidang_id: null,
    is_active: true,
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isAddBidangOpen, setIsAddBidangOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || "",
        role:
          user.role === "super_admin" || user.role === "Super Admin"
            ? "Super Admin"
            : "Admin Bidang",
        bidang_id: user.bidang_id || null,
        is_active: user.is_active ?? true,
        password: "",
      });
      setShowPassword(false);
    }
  }, [user]);

  // Dukungan tombol Escape untuk menutup modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting && !isAddBidangOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting, isAddBidangOpen]);

  if (!user) return null;

  const selectedBidang = bidangList.find((b) => b.id === form.bidang_id);

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

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/80 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-7 sm:px-8 py-4.5 bg-gradient-to-r from-emerald-50/50 via-slate-50/30 to-white flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Edit Data Pengguna
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Perbarui profil, hak akses seksi/bidang, atau atur ulang kata sandi pengguna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Tutup (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Konten Form 2 Kolom (Skala Lebih Besar & Nyaman) */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Banner Akun Terpilih */}
          <div className="mx-7 sm:mx-8 mt-5 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/30 to-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-white p-2 shadow-2xs border border-emerald-100 flex items-center justify-center shrink-0">
                <img
                  src="/kemenag.svg"
                  alt="Logo Kemenag"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {user.full_name || "Tanpa Nama"}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">
                    (@{user.username})
                  </span>
                  {isSelf && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Akun Anda
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  user.is_active
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                    : "bg-rose-50 text-rose-700 border border-rose-200/70"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    user.is_active ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {user.is_active ? "Aktif" : "Nonaktif"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold border ${
                  user.role === "super_admin" || user.role === "Super Admin"
                    ? "bg-purple-50 text-purple-700 border-purple-200/70"
                    : "bg-blue-50 text-blue-700 border-blue-200/70"
                }`}
              >
                {user.role === "super_admin" || user.role === "Super Admin"
                  ? "Super Admin"
                  : "Admin Bidang"}
              </span>
            </div>
          </div>

          {/* Grid 2 Kolom Utama (Wider & Comfortable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-7 sm:p-8">
            {/* KOLOM KIRI: Profil & Keamanan */}
            <div className="space-y-4.5 flex flex-col justify-between">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Nama Lengkap Pengguna <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, full_name: e.target.value }))
                    }
                    placeholder="Nama lengkap beserta gelar"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10.5 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Ganti Kata Sandi (Opsional) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Ganti Kata Sandi{" "}
                    <span className="text-slate-400 font-normal lowercase">
                      (opsional)
                    </span>
                  </label>
                  <span className="text-xs text-slate-400">Min. 6 karakter</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="Kosongkan bila tidak diubah"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10.5 pr-11 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                    title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 pl-0.5 leading-relaxed">
                  Biarkan kosong jika kata sandi pengguna tidak ingin diubah.
                </p>
              </div>

              {/* Status Keberlakuan Akun */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Status Akun
                </label>
                <label
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelf
                      ? "opacity-70 cursor-not-allowed border-slate-200 bg-slate-50"
                      : form.is_active
                      ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/15"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    disabled={isSelf}
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, is_active: e.target.checked }))
                    }
                    className="h-4.5 w-4.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {form.is_active ? "Akun Aktif (Dapat Masuk ke Sistem)" : "Akun Dinonaktifkan"}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      {isSelf
                        ? "Akun Anda saat ini (tidak dapat dinonaktifkan)."
                        : form.is_active
                        ? "Pengguna memiliki izin masuk ke portal SI BETANG."
                        : "Akses masuk diblokir sementara waktu."}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* KOLOM KANAN: Peran & Seksi/Bidang */}
            <div className="space-y-4.5 flex flex-col justify-between">
              {/* Pilihan Peran (Role) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Peran Hak Akses (Role) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Admin Bidang */}
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() =>
                      setForm((p) => ({ ...p, role: "Admin Bidang" }))
                    }
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelf
                        ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50"
                        : form.role === "Admin Bidang"
                        ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl ${
                        form.role === "Admin Bidang"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        Admin Bidang
                      </div>
                      <div className="text-xs text-slate-500 leading-tight mt-0.5">
                        Arsip Seksi
                      </div>
                    </div>
                    {form.role === "Admin Bidang" && (
                      <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    )}
                  </button>

                  {/* Super Admin */}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        role: "Super Admin",
                        bidang_id: null,
                      }))
                    }
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      form.role === "Super Admin"
                        ? "border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl ${
                        form.role === "Super Admin"
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        Super Admin
                      </div>
                      <div className="text-xs text-slate-500 leading-tight mt-0.5">
                        Akses Penuh
                      </div>
                    </div>
                    {form.role === "Super Admin" && (
                      <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                </div>

                {isSelf && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Akun Anda: Peran Super Admin dikunci agar tidak kehilangan akses.
                  </p>
                )}
              </div>

              {/* Penempatan Seksi / Bidang (jika Admin Bidang) */}
              {form.role === "Admin Bidang" ? (
                <div className="space-y-3 rounded-2xl bg-slate-50/90 p-4 sm:p-4.5 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Penempatan Seksi / Bidang <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddBidangOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Bidang Baru</span>
                    </button>
                  </div>

                  <select
                    value={form.bidang_id || ""}
                    required
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        bidang_id: e.target.value || null,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Pilih Seksi / Bidang Penempatan --</option>
                    {bidangList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  {/* RBAC Folder Access Ringkas */}
                  {selectedBidang ? (
                    <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <FolderKey className="h-4 w-4 text-emerald-600" />
                          <span>Hak Akses Folder (RBAC):</span>
                        </div>
                        {onOpenFolderAccessForBidang && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenFolderAccessForBidang(
                                selectedBidang.id,
                                selectedBidang.name
                              )
                            }
                            className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                          >
                            Atur Hak Akses
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {selectedBidang.accessibleFolderNames &&
                        selectedBidang.accessibleFolderNames.length > 0 ? (
                          selectedBidang.accessibleFolderNames.map((fn, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60"
                            >
                              <Folder className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{fn}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-medium border border-amber-200/50">
                            Belum ada folder root yang dikaitkan.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic pl-0.5">
                      Pilih seksi/bidang penugasan agar akun ini memiliki izin akses folder arsip.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-purple-900 leading-relaxed">
                    <p className="font-bold text-sm">Akses Global Super Admin</p>
                    <p className="text-xs text-purple-700 mt-1">
                      Pengguna ini memiliki hak penuh membuka seluruh folder, berkas arsip, manajemen pengguna, dan pengaturan sistem tanpa batasan bidang.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Aksi */}
          <div className="flex items-center justify-end gap-3.5 border-t border-slate-100 px-7 sm:px-8 py-4 bg-slate-50/70 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Simpan Perubahan</span>
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
