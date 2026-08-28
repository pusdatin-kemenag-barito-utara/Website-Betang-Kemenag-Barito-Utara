"use client"

import { useState } from "react"
import { Building2, Plus, Pencil, Trash2 } from "lucide-react"
import { AddBidangModal } from "./AddBidangModal"
import { EditBidangModal } from "./EditBidangModal"
import { DeleteBidangModal } from "./DeleteBidangModal"

interface BidangData {
  id: string
  name: string
  count: number
  sort_order: number
}

interface BidangViewProps {
  bidangData: BidangData[]
}

export function BidangView({ bidangData }: BidangViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<BidangData | null>(null)
  const [deleteItem, setDeleteItem] = useState<BidangData | null>(null)

  return (
    <>
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 md:px-8 py-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">Daftar Bidang</h3>
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30"
          >
            <Plus className="h-4 w-4" />
            Tambah Bidang
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="border-b border-slate-100 px-3 md:px-8 py-4 w-10 hidden md:table-cell">No.</th>
                <th className="border-b border-slate-100 px-3 md:px-8 py-4">Nama Bidang</th>
                <th className="border-b border-slate-100 px-3 md:px-8 py-4 hidden sm:table-cell">Total Dokumen</th>
                <th className="border-b border-slate-100 px-3 md:px-8 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bidangData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-8 text-center text-slate-500 font-medium">
                    Belum ada bidang terdaftar
                  </td>
                </tr>
              ) : (
                bidangData.map((b) => {
                  return (
                    <tr 
                      key={b.id} 
                      className="group transition-colors hover:bg-slate-50/80 bg-white"
                    >
                      <td className="px-3 md:px-8 py-4 font-semibold text-slate-500 border-b border-slate-50 hidden md:table-cell">
                        {b.sort_order}
                      </td>
                      <td className="px-3 md:px-8 py-4 font-bold text-slate-700 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Building2 className="h-5 w-5" />
                          </div>
                          {b.name}
                        </div>
                      </td>
                      <td className="px-3 md:px-8 py-4 text-sm font-medium text-slate-500 border-b border-slate-50 hidden sm:table-cell">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {b.count} dokumen
                        </span>
                      </td>
                      <td className="px-3 md:px-8 py-4 border-b border-slate-50">
                      {/* Tombol aksi langsung ditampilkan tanpa opacity-0 hover:opacity-100 */}
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditItem(b)}
                          className="rounded-lg p-2 text-slate-400 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          title="Ubah Nama Bidang"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteItem(b)}
                          className="rounded-lg p-2 text-slate-400 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Hapus Bidang"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddBidangModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
      />
      
      {editItem && (
        <EditBidangModal 
          isOpen={!!editItem} 
          onClose={() => setEditItem(null)} 
          bidangId={editItem.id}
          currentName={editItem.name}
          currentSortOrder={editItem.sort_order}
        />
      )}

      {deleteItem && (
        <DeleteBidangModal 
          isOpen={true} 
          onClose={() => setDeleteItem(null)}
          bidangId={deleteItem.id}
          bidangName={deleteItem.name}
        />
      )}
    </>
  )
}