"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Breadcrumbs } from "@/components/FileBrowser/Breadcrumbs"
import { FileTable } from "@/components/FileBrowser/FileTable"
import { Search, LayoutGrid, List, Info, X, FileText, Image as ImageIcon, Folder as FolderIcon, Calendar, HardDrive, Type, SlidersHorizontal, Filter, Plus, FileUp, FolderUp } from "lucide-react"
import { ModernSelect } from "@/components/ui/ModernSelect"
import { CreateFolderModal } from "./CreateFolderModal"
import { UploadFileModal } from "./UploadFileModal"
import type { FileItem } from "@/types"

interface FileBrowserViewProps {
  folderId: string
  initialItems: FileItem[]
  breadcrumbs: { id: string; name: string }[]
  userBidangId: string
  initialSearchQuery?: string
}

export function FileBrowserView({ folderId, initialItems, breadcrumbs, userBidangId, initialSearchQuery = "" }: FileBrowserViewProps) {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== initialSearchQuery) {
        if (searchQuery) {
          router.push(`/folders/${folderId === 'root' ? 'root' : folderId}?q=${encodeURIComponent(searchQuery)}`)
        } else {
          router.push(`/folders/${folderId === 'root' ? 'root' : folderId}`)
        }
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, folderId, router, initialSearchQuery])
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [externalFiles, setExternalFiles] = useState<File[]>([])
  const [selectedInfoItem, setSelectedInfoItem] = useState<FileItem | null>(null)
  
  // Advanced Search Filters
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>("all") // all, folder, image, pdf, document
  const [filterDate, setFilterDate] = useState<string>("all") // all, today, 7days, 30days

  // "Baru +" Menu
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false)
  const [isFolderUploadMode, setIsFolderUploadMode] = useState(false)

  const handleFilesDrop = (files: File[]) => {
    setExternalFiles(files)
    setIsUploadOpen(true)
  }
  
  const getIcon = (item: FileItem) => {
    if (item.type === "folder") return <FolderIcon className="h-12 w-12 fill-blue-500 text-blue-500" />
    if (item.mimeType?.includes("pdf")) return <FileText className="h-12 w-12 text-rose-500" />
    if (item.mimeType?.includes("image")) return <ImageIcon className="h-12 w-12 text-emerald-500" />
    return <FileText className="h-12 w-12 text-slate-500" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-100 min-w-0">
        <Breadcrumbs items={breadcrumbs} currentFolderId={folderId} />
        
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Cari file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 sm:h-10 w-full sm:w-[240px] rounded-lg sm:rounded-xl border-0 bg-slate-50 pl-9 pr-9 sm:pl-10 sm:pr-10 text-xs sm:text-sm font-medium text-slate-900 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isFilterOpen || filterType !== 'all' || filterDate !== 'all' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-200'}`}
              title="Filter Lanjutan"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            
            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-100 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-emerald-600" />
                    Filter Pencarian
                  </h4>
                  <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2 block">Tipe File</label>
                    <ModernSelect 
                      value={filterType}
                      onChange={(value) => setFilterType(value)}
                      triggerClassName="w-full rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 text-sm font-medium text-slate-700 py-2 px-3 hover:bg-slate-100"
                      options={[
                        { value: 'all', label: 'Semua Tipe' },
                        { value: 'folder', label: 'Hanya Folder' },
                        { value: 'image', label: 'Gambar (JPG, PNG)' },
                        { value: 'pdf', label: 'PDF Document' },
                        { value: 'document', label: 'Office (Word, Excel, PPT)' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2 block">Waktu Perubahan</label>
                    <ModernSelect 
                      value={filterDate}
                      onChange={(value) => setFilterDate(value)}
                      triggerClassName="w-full rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 text-sm font-medium text-slate-700 py-2 px-3 hover:bg-slate-100"
                      options={[
                        { value: 'all', label: 'Kapan Saja' },
                        { value: 'today', label: 'Hari Ini' },
                        { value: '7days', label: '7 Hari Terakhir' },
                        { value: '30days', label: '30 Hari Terakhir' }
                      ]}
                    />
                  </div>
                  
                  {(filterType !== 'all' || filterDate !== 'all') && (
                    <button 
                      onClick={() => { setFilterType('all'); setFilterDate('all'); }}
                      className="w-full py-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors mt-2"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-3">
            <div className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200">
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md sm:rounded-lg p-1.5 sm:p-2 transition-all ${viewMode === "list" ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                title="List View"
              >
                <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md sm:rounded-lg p-1.5 sm:p-2 transition-all ${viewMode === "grid" ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-emerald-600 px-4 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 ring-1 ring-emerald-500"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                Baru
              </button>
              
              {/* New Menu Dropdown */}
              {isNewMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNewMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100 z-50 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => { setIsCreateOpen(true); setIsNewMenuOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <FolderIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                      Folder baru
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button
                      onClick={() => { setIsFolderUploadMode(false); setIsUploadOpen(true); setIsNewMenuOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <FileUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                      Upload file
                    </button>
                    <button
                      onClick={() => { setIsFolderUploadMode(true); setIsUploadOpen(true); setIsNewMenuOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <FolderUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                      Upload folder
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4 h-full relative min-w-0">
        <div className={`transition-all duration-300 flex-1 min-w-0 ${selectedInfoItem ? 'hidden xl:block' : 'block'}`}>
          <FileTable 
            data={initialItems} 
            onNavigate={(id) => router.push(`/folders/${id}`)}
            onFilesDrop={handleFilesDrop}
            onShowInfo={(item) => setSelectedInfoItem(item)}
            folderId={folderId}
            searchQuery={searchQuery}
            viewMode={viewMode}
            filterType={filterType}
            filterDate={filterDate}
          />
        </div>

        {selectedInfoItem && (
          <div className="w-full xl:w-80 shrink-0 bg-white rounded-3xl shadow-sm ring-1 ring-slate-100 p-6 flex flex-col animate-in slide-in-from-right-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-600" />
                Detail File
              </h3>
              <button 
                onClick={() => setSelectedInfoItem(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-24 w-24 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                {getIcon(selectedInfoItem)}
              </div>
              <h4 className="font-bold text-slate-800 break-all w-full leading-tight">{selectedInfoItem.name}</h4>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1"><Type className="h-3.5 w-3.5" /> Tipe</span>
                <p className="font-medium text-slate-700">{selectedInfoItem.type === "folder" ? "Folder" : selectedInfoItem.mimeType || "File"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1"><HardDrive className="h-3.5 w-3.5" /> Ukuran</span>
                <p className="font-medium text-slate-700">{selectedInfoItem.type === "folder" ? "-" : selectedInfoItem.size || "Tidak diketahui"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1"><Calendar className="h-3.5 w-3.5" /> Terakhir Diubah</span>
                <p className="font-medium text-slate-700">{selectedInfoItem.updatedAt}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateFolderModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        parentId={folderId} 
      />
      
      <UploadFileModal 
        isOpen={isUploadOpen} 
        onClose={() => {
          setIsUploadOpen(false)
          setExternalFiles([])
          setIsFolderUploadMode(false)
        }} 
        folderId={folderId}
        userBidangId={userBidangId}
        initialFiles={externalFiles}
        isFolderMode={isFolderUploadMode}
      />
    </div>
  )
}
