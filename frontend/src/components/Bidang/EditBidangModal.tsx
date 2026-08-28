"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { updateBidang, reloadSoon } from "@/lib/api"
import { toast } from "sonner"

interface EditBidangModalProps {
  isOpen: boolean
  onClose: () => void
  bidangId: string
  currentName: string
  currentSortOrder: number
}

export function EditBidangModal({ isOpen, onClose, bidangId, currentName, currentSortOrder }: EditBidangModalProps) {
  const [name, setName] = useState(currentName)
  const [sortOrder, setSortOrder] = useState<number>(currentSortOrder)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    if (name === currentName && sortOrder === currentSortOrder) {
      onClose()
      return
    }

    setIsSubmitting(true)
    try {
      const res = await updateBidang(bidangId, name, sortOrder)
      if (res.success) {
        toast.success("Nama bidang berhasil diperbarui")
        onClose()
        reloadSoon()
      } else {
        toast.error(res.error || "Gagal memperbarui bidang")
      }
    } catch (error) {
      console.error(error)
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!isSubmitting ? onClose : undefined} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-800">Ubah Nama Bidang</h3>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label htmlFor="editBidangName" className="block text-sm font-semibold text-slate-700 mb-2">
              Nama Bidang / Seksi
            </label>
            <input
              id="editBidangName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Contoh: Seksi Penmad"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="px-6 pb-6">
            <label htmlFor="editBidangOrder" className="block text-sm font-semibold text-slate-700 mb-2">
              Nomor Urut
            </label>
            <input
              id="editBidangOrder"
              type="number"
              min="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || (name === currentName && sortOrder === currentSortOrder)}
              className="flex items-center rounded-xl bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}