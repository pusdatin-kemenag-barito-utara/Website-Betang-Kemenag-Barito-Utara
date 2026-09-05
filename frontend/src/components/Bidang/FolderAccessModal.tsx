"use client"

import { useState } from "react"
import { X, Loader2, Folder, CheckSquare, Square, Search, ShieldCheck } from "lucide-react"
import { updateBidangFolders, reloadSoon } from "@/lib/api"
import { toast } from "sonner"

export interface RootFolderOption {
  id: string
  name: string
}

interface FolderAccessModalProps {
  isOpen: boolean
  onClose: () => void
  bidangId: string
  bidangName: string
  currentFolderIds: string[]
  allRootFolders: RootFolderOption[]
  onSuccess?: (updatedIds: string[]) => void
}

export function FolderAccessModal({
  isOpen,
  onClose,
  bidangId,
  bidangName,
  currentFolderIds,
  allRootFolders,
  onSuccess,
}: FolderAccessModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentFolderIds || [])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const filteredFolders = allRootFolders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  const toggleFolder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedIds(allRootFolders.map((f) => f.id))
  }

  const handleDeselectAll = () => {
    setSelectedIds([])
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await updateBidangFolders(bidangId, selectedIds)
      if (res.success) {
        toast.success(`Hak akses folder untuk ${bidangName} berhasil disimpan`)
        onClose()
        if (onSuccess) {
          onSuccess(selectedIds)
        } else {
          reloadSoon()
        }
      } else {
        toast.error(res.error || "Gagal menyimpan hak akses folder")
      }
    } catch (error) {
      console.error(error)
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 sm:px-8 py-5 bg-gradient-to-r from-slate-50/90 to-white">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                  Atur Hak Akses Folder Root (RBAC)
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
                  {bidangName}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tentukan folder root mana saja yang diizinkan untuk dibuka dan dikelola oleh admin pada seksi ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Toolbar Pencarian & Opsi Seleksi Cepat */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-slate-100 px-6 sm:px-8 py-3.5 bg-white">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari folder root berdasarkan nama..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors cursor-pointer"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Pilih Semua</span>
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-colors cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Batal Semua</span>
              </button>
            </div>
          </div>

          {/* Daftar Folder Root (Grid 2 Kolom Lebar & Lapang) */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 min-h-[320px] max-h-[520px] bg-slate-50/40">
            {filteredFolders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Folder className="h-12 w-12 text-slate-300 stroke-1 mb-2" />
                <p className="text-sm font-bold text-slate-600">
                  {searchQuery ? "Tidak ada folder yang sesuai pencarian" : "Belum ada folder root terdaftar"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Folder root dibuat di halaman File Browser
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredFolders.map((f) => {
                  const isChecked = selectedIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFolder(f.id)}
                      className={`group flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-sm"
                          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-2">
                        <div className="shrink-0">
                          {isChecked ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                              <CheckSquare className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-slate-300 bg-slate-50 group-hover:border-slate-400">
                              <Square className="h-4 w-4 text-transparent" />
                            </div>
                          )}
                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                          <Folder className="h-5 w-5 fill-amber-500/20" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block text-sm sm:text-base font-bold text-slate-800 leading-snug break-words">
                            {f.name}
                          </span>
                          <span className="block text-[11px] font-medium text-slate-400 mt-0.5">
                            Folder Root Utama
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold text-emerald-800 border border-emerald-200/60">
                            Diizinkan
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-400 border border-slate-200/60">
                            Terkunci
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Info & Tombol Simpan */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 px-6 sm:px-8 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-slate-600">
                <span className="text-emerald-700 font-extrabold">{selectedIds.length}</span> dari{" "}
                {allRootFolders.length} folder root diizinkan
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/35 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Hak Akses"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
