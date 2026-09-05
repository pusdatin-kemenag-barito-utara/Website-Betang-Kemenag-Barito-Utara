import { Users, Shield, Building2, CheckCircle2 } from "lucide-react";
import type { UserStats } from "./types";

interface UserStatsCardsProps {
  stats: UserStats;
}

export function UserStatsCards({ stats }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Pengguna */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4.5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Pengguna
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-800">{stats.total}</span>
          <span className="text-xs font-semibold text-slate-400">Akun</span>
        </div>
      </div>

      {/* Super Admin */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4.5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Super Admin
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Shield className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-purple-700">{stats.superAdmins}</span>
          <span className="text-xs font-semibold text-slate-400">Akun</span>
        </div>
      </div>

      {/* Admin Seksi / Bidang */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4.5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Admin Bidang
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Building2 className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-blue-700">{stats.adminBidang}</span>
          <span className="text-xs font-semibold text-slate-400">Akun</span>
        </div>
      </div>

      {/* Status Aktif */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4.5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Status Aktif
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-700">{stats.active}</span>
          <span className="text-xs font-semibold text-slate-400">/ {stats.total} Aktif</span>
        </div>
      </div>
    </div>
  );
}
