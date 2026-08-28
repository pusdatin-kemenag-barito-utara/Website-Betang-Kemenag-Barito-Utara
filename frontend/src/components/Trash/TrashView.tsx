"use client"

import {
  Trash2,
  AlertTriangle,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  FileArchive,
  RotateCcw,
} from "lucide-react"
import { useState, useMemo } from "react"
import { restoreTrashItem, restoreTrashItemsBatch, permanentDeleteTrashItems } from "@/lib/api"
import { toast } from "sonner"
import { DeleteConfirmModal } from "../FileBrowser/DeleteConfirmModal"
import { trackEvent, trackSearch } from "@/lib/analytics"

interface TrashItem {
  id: string
  name: string
  type: "folder" | "file"
  deletedAt: string
  expiresAt: string
}

interface TrashViewProps {
  initialData: TrashItem[]
}

export function TrashView({ initialData }: TrashViewProps) {
  const [items, setItems] = useState<TrashItem[]>(initialData)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(null)
  const [isBatchRestoring, setIsBatchRestoring] = useState(false)

  const [itemsToDelete, setItemsToDelete] = useState<TrashItem[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter pencarian client-side
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(q))
  }, [items, searchQuery])

  // Toggle seleksi per baris
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle pilih semua
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)))
    }
  }

  // Restore satu item
  const handleRestore = async (item: TrashItem) => {
    setLoadingId(item.id)
    setActionType("restore")
    try {
      const { success, error } = await restoreTrashItem(item.id, item.type)

      if (!success) throw new Error(error || "Gagal merestore item")

      trackEvent("restore_trash_item", {
        item_id: item.id,
        item_name: item.name,
        item_type: item.type,
      })

      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      window.dispatchEvent(new CustomEvent("storage-updated"))
      toast.success(`"${item.name}" berhasil dipulihkan.`)
    } catch (error) {
      console.error("Restore failed:", error)
      toast.error(error instanceof Error ? error.message : "Gagal merestore item.")
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }

  // Restore banyak item terpilih
  const handleBatchRestore = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id))
    if (selectedItems.length === 0) return

    setIsBatchRestoring(true)
    try {
      const payload = selectedItems.map((i) => ({ id: i.id, type: i.type }))
      const { success, error } = await restoreTrashItemsBatch(payload)

      if (!success) throw new Error(error || "Gagal memulihkan item terpilih")

      trackEvent("restore_trash_batch", {
        count: selectedItems.length,
      })

      const restoredIds = new Set(selectedItems.map((i) => i.id))
      setItems((prev) => prev.filter((i) => !restoredIds.has(i.id)))
      setSelectedIds(new Set())
      window.dispatchEvent(new CustomEvent("storage-updated"))
      toast.success(`${selectedItems.length} item berhasil dipulihkan.`)
    } catch (error) {
      console.error("Batch restore failed:", error)
      toast.error(error instanceof Error ? error.message : "Gagal memulihkan item.")
    } finally {
      setIsBatchRestoring(false)
    }
  }

  // Konfirmasi hapus permanen
  const confirmDelete = async () => {
    if (itemsToDelete.length === 0) return

    setIsDeleting(true)
    try {
      const itemsToDel = itemsToDelete.map((i) => ({ id: i.id, type: i.type }))
      const { success, error } = await permanentDeleteTrashItems(itemsToDel)

      if (!success) throw new Error(error || "Gagal menghapus item permanen")

      trackEvent("permanent_delete_trash", {
        count: itemsToDelete.length,
        is_empty_all: itemsToDelete.length === items.length,
      })

      const deletedIds = new Set(itemsToDelete.map((i) => i.id))
      setItems((prev) => prev.filter((i) => !deletedIds.has(i.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        deletedIds.forEach((id) => next.delete(id))
        return next
      })

      toast.success(
        itemsToDelete.length > 1
          ? `${itemsToDelete.length} item berhasil dihapus permanen.`
          : "File berhasil dihapus permanen."
      )
      window.dispatchEvent(new CustomEvent("storage-updated"))
    } catch (error) {
      console.error("Delete failed:", error)
      toast.error("Gagal menghapus item secara permanen.")
    } finally {
      setIsDeleting(false)
      setItemsToDelete([])
    }
  }

  const handlePermanentDeleteSingle = (item: TrashItem) => {
    setItemsToDelete([item])
  }

  const handleBatchPermanentDelete = () => {
    const selected = items.filter((i) => selectedIds.has(i.id))
    if (selected.length === 0) return
    setItemsToDelete(selected)
  }

  const handleEmptyTrash = () => {
    if (items.length === 0) return
    setItemsToDelete(items)
  }

  const getItemIcon = (item: TrashItem) => {
    if (item.type === "folder") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <FolderIcon className="h-5 w-5 fill-blue-500 text-blue-500" />
        </div>
      )
    }
    const ext = item.name.split(".").pop()?.toLowerCase() || ""
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <ImageIcon className="h-5 w-5" />
        </div>
      )
    }
    if (ext === "pdf") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
          <FileText className="h-5 w-5" />
        </div>
      )
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <FileArchive className="h-5 w-5" />
        </div>
      )
    }
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
        <FileText className="h-5 w-5" />
      </div>
    )
  }

  const isAllSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
      {/* Header Toolbar */}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-6 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-600 bg-amber-50/80 px-4 py-2 rounded-2xl ring-1 ring-amber-200/60">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Item di Recycle Bin dapat dipulihkan atau dihapus permanen secara aman.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleEmptyTrash}
              disabled={items.length === 0}
              className="flex items-center gap-2 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Trash2 className="h-4 w-4" />
              Kosongkan Trash
            </button>
          </div>
        </div>

        {/* Search Bar & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Cari item di trash..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value.length > 2) {
                  trackSearch(e.target.value, filteredItems.length, "trash")
                }
              }}
              className="h-10 w-full rounded-xl border-0 bg-white pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          {/* Batch Action Buttons (Hanya muncul jika ada yang dipilih) */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
              <span className="text-xs font-bold text-slate-600 px-2">
                {selectedIds.size} dipilih
              </span>
              <button
                onClick={handleBatchRestore}
                disabled={isBatchRestoring}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {isBatchRestoring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Pulihkan
              </button>
              <button
                onClick={handleBatchPermanentDelete}
                className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Permanen
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabel Item Trash */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            <tr>
              <th className="border-b border-slate-100 px-4 sm:px-6 py-4 w-12 text-center">
                <button
                  onClick={toggleSelectAll}
                  disabled={filteredItems.length === 0}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
                  title={isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
                >
                  {isAllSelected ? (
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="border-b border-slate-100 px-4 sm:px-6 py-4">Nama Item</th>
              <th className="border-b border-slate-100 px-4 sm:px-6 py-4 hidden sm:table-cell">
                Waktu Dihapus
              </th>
              <th className="border-b border-slate-100 px-4 sm:px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.id)
              return (
                <tr
                  key={item.id}
                  className={`group transition-colors ${
                    isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/80"
                  }`}
                >
                  <td className="px-4 sm:px-6 py-4 text-center">
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-4 font-bold text-slate-800">
                    <div className="flex items-center gap-3">
                      {getItemIcon(item)}
                      <div className="min-w-0">
                        <span className="truncate block max-w-[200px] sm:max-w-md text-sm font-bold text-slate-800">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {item.type === "folder" ? "Folder Arsip" : "File Dokumen"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-500 hidden sm:table-cell">
                    {item.deletedAt}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={loadingId === item.id}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 ring-1 ring-emerald-100/70 transition-all hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50"
                        title="Kembalikan ke lokasi semula"
                      >
                        {loadingId === item.id && actionType === "restore" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Pulihkan</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteSingle(item)}
                        disabled={loadingId === item.id}
                        className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100/70 transition-all hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50"
                        title="Hapus permanen dari basis data"
                      >
                        {loadingId === item.id && actionType === "delete" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Hapus Permanen</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <Trash2 className="h-10 w-10 text-slate-300" />
            </div>
            <p className="mt-4 font-bold text-slate-700 text-base">
              {searchQuery ? "Tidak ada item yang cocok dengan pencarian" : "Recycle Bin kosong"}
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">
              {searchQuery
                ? `Coba kata kunci lain atau hapus pencarian "${searchQuery}".`
                : "Semua dokumen dan folder aktif aman. Item yang Anda hapus sementara akan tampil di sini."}
            </p>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={itemsToDelete.length > 0}
        onClose={() => setItemsToDelete([])}
        onConfirm={confirmDelete}
        itemName={itemsToDelete.length === 1 ? itemsToDelete[0].name : undefined}
        itemType={itemsToDelete.length === 1 ? itemsToDelete[0].type : undefined}
        itemCount={itemsToDelete.length}
        isDeleting={isDeleting}
        isPermanent={true}
      />
    </div>
  )
}