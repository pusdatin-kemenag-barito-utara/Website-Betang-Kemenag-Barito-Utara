"use client"

import { useState } from "react"
import { Building2, Plus, Pencil, Trash2, Folder, FolderKey } from "lucide-react"
import { AddBidangModal } from "./AddBidangModal"
import { EditBidangModal } from "./EditBidangModal"
import { DeleteBidangModal } from "./DeleteBidangModal"
import { FolderAccessModal, type RootFolderOption } from "./FolderAccessModal"

interface BidangData {
  id: string
  name: string
  count: number
  sort_order: number
  accessibleFolderIds?: string[]
  accessibleFolderNames?: string[]
}

interface BidangViewProps {
  bidangData: BidangData[]
  allRootFolders?: RootFolderOption[]
}

export function BidangView({ bidangData, allRootFolders = [] }: BidangViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<BidangData | null>(null)
  const [deleteItem, setDeleteItem] = useState<BidangData | null>(null)
  const [accessItem, setAccessItem] = useState<BidangData | null>(null)

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
                <th className="border-b border-slate-100 px-3 md:px-8 py-4 hidden lg:table-cell">Akses Folder Root</th>
                <th className="border-b border-slate-100 px-3 md:px-8 py-4 hidden sm:table-cell">Total Dokumen</th>
                <th className="border-b border-slate-100 px-3 md:px-8 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bidangData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-8 text-center text-slate-500 font-medium">
                    Belum ada bidang terdaftar
                  </td>
                </tr>
              ) : (
                bidangData.map((b) => {
                  const folderNames = b.accessibleFolderNames || []
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
                          <div>
                            <span className="block font-bold text-slate-800">{b.name}</span>
                            {/* Tampilan mobile untuk folder root */}
                            <div className="mt-1 flex flex-wrap gap-1 lg:hidden">
                              {folderNames.length > 0 ? (
                                folderNames.slice(0, 1).map((fname, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                                  >
                                    <Folder className="h-2.5 w-2.5" />
                                    {fname}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Belum ada akses folder</span>
                              )}
                              {folderNames.length > 1 && (
                                <span className="text-[10px] font-bold text-slate-500">
                                  +{folderNames.length - 1}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-8 py-4 border-b border-slate-50 hidden lg:table-cell">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {folderNames.length > 0 ? (
                            <>
                              {folderNames.slice(0, 2).map((fname, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60 shadow-2xs"
                                >
                                  <Folder className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[130px]">{fname}</span>
                                </span>
                              ))}
                              {folderNames.length > 2 && (
                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                  +{folderNames.length - 2} lainnya
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum diatur</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 md:px-8 py-4 text-sm font-medium text-slate-500 border-b border-slate-50 hidden sm:table-cell">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {b.count} dokumen
                        </span>
                      </td>
                      <td className="px-3 md:px-8 py-4 border-b border-slate-50">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setAccessItem(b)}
                          className="rounded-lg p-2 text-slate-500 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          title="Atur Hak Akses Folder Root"
                        >
                          <FolderKey className="h-4 w-4 text-emerald-600" />
                        </button>
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
        allRootFolders={allRootFolders}
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

      {accessItem && (
        <FolderAccessModal
          isOpen={!!accessItem}
          onClose={() => setAccessItem(null)}
          bidangId={accessItem.id}
          bidangName={accessItem.name}
          currentFolderIds={accessItem.accessibleFolderIds || []}
          allRootFolders={allRootFolders}
        />
      )}
    </>
  )
}