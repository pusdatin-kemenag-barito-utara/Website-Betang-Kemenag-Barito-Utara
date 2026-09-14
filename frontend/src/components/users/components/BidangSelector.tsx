import { useState } from "react"
import { ShieldCheck, Plus, FolderKey, Folder } from "lucide-react"
import type { Bidang, RootFolderOption } from "../types"
import { AddBidangModal } from "@/components/Bidang/AddBidangModal"

interface BidangSelectorProps {
  role: string
  bidangId: string | null
  onChangeBidang: (id: string | null) => void
  bidangList: Bidang[]
  allRootFolders?: RootFolderOption[]
  onOpenFolderAccessForBidang?: (bidangId: string, bidangName: string) => void
  onBidangAdded?: (newBidang: Bidang) => void
}

export function BidangSelector({
  role,
  bidangId,
  onChangeBidang,
  bidangList,
  allRootFolders = [],
  onOpenFolderAccessForBidang,
  onBidangAdded,
}: BidangSelectorProps) {
  const [isAddBidangOpen, setIsAddBidangOpen] = useState(false)

  const selectedBidang = bidangList.find((b) => b.id === bidangId)
  const isSuperAdmin = role === "super_admin" || role === "Super Admin"

  const handleBidangCreated = (created?: { id: string; name: string }) => {
    if (created) {
      const newB: Bidang = {
        id: created.id,
        name: created.name,
        accessibleFolderNames: [created.name],
      }
      if (onBidangAdded) {
        onBidangAdded(newB)
      }
      onChangeBidang(created.id)
    }
    setIsAddBidangOpen(false)
  }

  if (isSuperAdmin) {
    return (
      <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <p className="font-bold text-sm">Akses Global Super Admin</p>
          <p className="text-xs text-purple-700 mt-1">
            Pengguna ini memiliki hak penuh membuka seluruh folder, berkas arsip, manajemen pengguna, dan pengaturan sistem tanpa batasan bidang.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
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
          value={bidangId || ""}
          required
          onChange={(e) => onChangeBidang(e.target.value || null)}
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
                      selectedBidang.name,
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

      {isAddBidangOpen && (
        <AddBidangModal
          isOpen={isAddBidangOpen}
          onClose={() => setIsAddBidangOpen(false)}
          allRootFolders={allRootFolders}
          onSuccess={handleBidangCreated}
        />
      )}
    </>
  )
}
