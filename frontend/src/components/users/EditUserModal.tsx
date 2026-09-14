import { useState, useEffect } from "react"
import {
  Pencil,
  X,
  Eye,
  EyeOff,
  Lock,
  User,
  Mail,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import type { Bidang, RootFolderOption, EditUserFormState } from "./types"
import type { UserItem } from "@/lib/api"
import { UserRoleSelector } from "./components/UserRoleSelector"
import { BidangSelector } from "./components/BidangSelector"

interface EditUserModalProps {
  user: UserItem | null
  onClose: () => void
  onSubmit: (data: EditUserFormState) => Promise<void>
  bidangList: Bidang[]
  allRootFolders?: RootFolderOption[]
  isSubmitting: boolean
  onOpenFolderAccessForBidang?: (bidangId: string, bidangName: string) => void
  onBidangAdded?: (newBidang: Bidang) => void
  isSelf?: boolean
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
  })
  const [showPassword, setShowPassword] = useState(false)

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
      })
    }
  }, [user])

  if (!user) return null

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose()
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

        {/* Konten Form 2 Kolom */}
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

          {/* Grid 2 Kolom Utama */}
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
              <UserRoleSelector
                role={form.role}
                onChange={(role) =>
                  setForm((p) => ({
                    ...p,
                    role,
                    ...(role === "Super Admin" ? { bidang_id: null } : {}),
                  }))
                }
                isSelf={isSelf}
              />

              {/* Penempatan Seksi / Bidang */}
              <BidangSelector
                role={form.role}
                bidangId={form.bidang_id}
                onChangeBidang={(bidang_id) =>
                  setForm((p) => ({ ...p, bidang_id }))
                }
                bidangList={bidangList}
                allRootFolders={allRootFolders}
                onOpenFolderAccessForBidang={onOpenFolderAccessForBidang}
                onBidangAdded={onBidangAdded}
              />
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
    </div>
  )
}
