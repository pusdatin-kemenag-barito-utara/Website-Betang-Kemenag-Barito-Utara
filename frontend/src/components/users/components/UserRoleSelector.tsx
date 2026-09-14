import { Building2, ShieldCheck, Check, AlertCircle } from "lucide-react"

interface UserRoleSelectorProps {
  role: string
  onChange: (role: "Super Admin" | "Admin Bidang") => void
  isSelf?: boolean
}

export function UserRoleSelector({
  role,
  onChange,
  isSelf = false,
}: UserRoleSelectorProps) {
  const isSuperAdmin = role === "super_admin" || role === "Super Admin"
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
        Peran Hak Akses (Role) <span className="text-rose-500">*</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {/* Admin Bidang */}
        <button
          type="button"
          disabled={isSelf}
          onClick={() => onChange("Admin Bidang")}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            isSelf
              ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50"
              : !isSuperAdmin
              ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs"
              : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              !isSuperAdmin
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
          {!isSuperAdmin && (
            <Check className="h-4 w-4 text-blue-600 shrink-0" />
          )}
        </button>

        {/* Super Admin */}
        <button
          type="button"
          onClick={() => onChange("Super Admin")}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            isSuperAdmin
              ? "border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs"
              : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              isSuperAdmin
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
          {isSuperAdmin && (
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
  )
}
