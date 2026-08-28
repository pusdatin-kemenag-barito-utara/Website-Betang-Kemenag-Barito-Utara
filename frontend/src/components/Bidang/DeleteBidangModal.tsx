"use client"

import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { deleteBidang, reloadSoon } from "@/lib/api"
import { toast } from "sonner"

interface DeleteBidangModalProps {
  isOpen: boolean
  onClose: () => void
  bidangId: string
  bidangName: string
}

export function DeleteBidangModal({ isOpen, onClose, bidangId, bidangName }: DeleteBidangModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteBidang(bidangId)
      if (res.success) {
        toast.success("Bidang berhasil dihapus")
        onClose()
        reloadSoon()
      } else {
        toast.error(res.error || "Gagal menghapus bidang")
      }
    } catch (error) {
      console.error(error)
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!isDeleting ? onClose : undefined} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100 animate-in zoom-in-95">
        <div className="flex flex-col items-center p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-800">Hapus Bidang?</h3>
          <p className="text-sm text-slate-500">
            Apakah Anda yakin ingin menghapus bidang <span className="font-bold text-slate-700">{bidangName}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="mt-4 rounded-lg bg-orange-50 p-3 text-xs text-orange-800 border border-orange-100">
            <p className="font-semibold mb-1">Catatan Penting:</p>
            Bidang hanya dapat dihapus jika <strong>tidak ada pengguna</strong> maupun <strong>dokumen/file</strong> yang sedang terdaftar di dalamnya.
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 bg-slate-50 p-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full max-w-[140px] rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex w-full max-w-[140px] items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:bg-rose-700 disabled:opacity-50 disabled:shadow-none"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Ya, Hapus"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}