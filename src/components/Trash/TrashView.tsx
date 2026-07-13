"use client"

import { RefreshCw, Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { useState } from "react"
import { restoreTrashItem, permanentDeleteTrashItems } from "@/app/(dashboard)/trash/actions"
import { toast } from "sonner"
import { DeleteConfirmModal } from "../FileBrowser/DeleteConfirmModal"

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
  const [items, setItems] = useState(initialData)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(null)
  
  const [itemsToDelete, setItemsToDelete] = useState<TrashItem[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  


  const handleRestore = async (item: TrashItem) => {
    setLoadingId(item.id)
    setActionType("restore")
    try {
      const { success, error } = await restoreTrashItem(item.id, item.type)

      if (!success) throw new Error(error || "Gagal merestore item")
      
      setItems(prev => prev.filter(i => i.id !== item.id))
      window.dispatchEvent(new CustomEvent('storage-updated'))
      toast.success("Item berhasil dikembalikan.")
    } catch (error) {
      console.error("Restore failed:", error)
      toast.error(error instanceof Error ? error.message : "Gagal merestore item.")
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }

  const confirmDelete = async () => {
    if (itemsToDelete.length === 0) return
    
    setIsDeleting(true)
    try {
      const itemsToDel = itemsToDelete.map(i => ({ id: i.id, type: i.type }))
      const { success, error } = await permanentDeleteTrashItems(itemsToDel)
      
      if (!success) throw new Error(error || "Gagal menghapus item permanen")
      
      const deletedIds = itemsToDelete.map(i => i.id)
      setItems(prev => prev.filter(i => !deletedIds.includes(i.id)))
      
      toast.success(itemsToDelete.length > 1 ? "Recycle Bin berhasil dikosongkan." : "File berhasil dihapus permanen.")
      window.dispatchEvent(new CustomEvent('storage-updated'))
    } catch (error) {
      console.error("Delete failed:", error)
      toast.error("Gagal menghapus item secara permanen.")
    } finally {
      setIsDeleting(false)
      setItemsToDelete([])
    }
  }

  const handlePermanentDelete = (item: TrashItem) => {
    setItemsToDelete([item])
  }

  const handleEmptyTrash = () => {
    if (items.length === 0) return
    setItemsToDelete(items)
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-4 md:px-8 py-6">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500 bg-orange-50 px-4 py-2 rounded-xl ring-1 ring-orange-100/50">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Item di bawah ini dapat dikembalikan ke lokasi asal.
        </div>
        <button 
          onClick={handleEmptyTrash}
          disabled={items.length === 0}
          className="flex items-center gap-2 text-sm font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-transparent"
        >
          Kosongkan Trash
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/90 text-xs font-bold tracking-wider text-slate-500 uppercase">
            <tr>
              <th className="border-b border-slate-100 px-3 md:px-8 py-4">Nama Item</th>
              <th className="border-b border-slate-100 px-3 md:px-8 py-4 hidden sm:table-cell">Tanggal Dihapus</th>
              <th className="border-b border-slate-100 px-3 md:px-8 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={item.id} className="group transition-colors hover:bg-slate-50/80">
                <td className="px-3 md:px-8 py-4 font-bold text-slate-700">
                  <div className="flex items-center gap-3">
                    {item.type === "folder" ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">F</span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 font-bold text-xs">D</span>
                    )}
                    <span className="truncate max-w-[150px] sm:max-w-none">{item.name}</span>
                  </div>
                </td>
                <td className="px-3 md:px-8 py-4 text-sm font-medium text-slate-500 hidden sm:table-cell">{item.deletedAt}</td>
                <td className="px-3 md:px-8 py-4">
                  <div className="flex justify-end gap-2 transition-opacity">
                    <button 
                      onClick={() => handleRestore(item)}
                      disabled={loadingId === item.id}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2 md:px-3 md:py-2 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50"
                    >
                      {loadingId === item.id && actionType === "restore" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="hidden md:inline">Restore</span>
                    </button>
                    <button 
                      onClick={() => handlePermanentDelete(item)}
                      disabled={loadingId === item.id}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2 md:px-3 md:py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50"
                    >
                      {loadingId === item.id && actionType === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      <span className="hidden md:inline">Hapus Permanen</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
              <Trash2 className="h-10 w-10" />
            </div>
            <p className="mt-4 font-bold text-slate-700">Recycle Bin kosong</p>
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
