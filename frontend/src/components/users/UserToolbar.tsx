import { Search, Filter, UserPlus, X } from "lucide-react";
import type { Bidang } from "./types";
import { ModernSelect } from "@/components/ui/ModernSelect";

const ROLE_OPTIONS = [
  { value: "ALL", label: "Semua Peran" },
  { value: "Super Admin", label: "Super Admin" },
  { value: "Admin Bidang", label: "Admin Bidang" },
];

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
  const bidangOptions = [
    { value: "ALL", label: "Semua Bidang" },
    ...bidangList.map((b) => ({ value: b.id, label: b.name })),
  ];

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
            placeholder="Cari nama, email, NIP, atau bidang..."
            className="w-full rounded-2xl border border-slate-200/80 bg-white pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-2xs transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15"
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
            <ModernSelect
              value={roleFilter}
              onChange={onRoleFilterChange}
              options={ROLE_OPTIONS}
              triggerClassName="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white hover:border-slate-300"
              dropdownClassName="w-44"
              title="Filter peran pengguna"
            />

            <ModernSelect
              value={bidangFilter}
              onChange={onBidangFilterChange}
              options={bidangOptions}
              triggerClassName="px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white hover:border-slate-300 max-w-[200px]"
              dropdownClassName="w-56"
              title="Filter seksi / bidang"
            />
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
