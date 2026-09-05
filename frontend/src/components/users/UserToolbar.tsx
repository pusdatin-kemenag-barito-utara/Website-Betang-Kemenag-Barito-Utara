import { Search, Filter, UserPlus, X } from "lucide-react";
import type { Bidang } from "./types";

interface UserToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  bidangFilter: string;
  onBidangFilterChange: (value: string) => void;
  bidangList: Bidang[];
  onOpenAddModal: () => void;
}

export function UserToolbar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  bidangFilter,
  onBidangFilterChange,
  bidangList,
  onOpenAddModal,
}: UserToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* 🔍 Input Pencarian Cepat */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama, email, username, atau bidang..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Bersihkan pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 🏷️ Filter Peran & Bidang & Tombol Tambah */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="ALL">Semua Peran</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin Bidang">Admin Bidang</option>
            </select>

            <select
              value={bidangFilter}
              onChange={(e) => onBidangFilterChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">Semua Bidang</option>
              {bidangList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/35 active:scale-95 cursor-pointer ml-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>
    </div>
  );
}
