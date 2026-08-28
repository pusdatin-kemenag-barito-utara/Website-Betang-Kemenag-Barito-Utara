import { Folder as FolderIcon, Search } from "lucide-react";

interface FileTableEmptyStateProps {
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function FileTableEmptyState({ searchQuery, onClearSearch }: FileTableEmptyStateProps) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-400 mb-3">
          <Search className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Tidak ada berkas yang cocok
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mb-4">
          Tidak ditemukan berkas atau folder dengan kata kunci &quot;{searchQuery}&quot;.
        </p>
        {onClearSearch && (
          <button
            onClick={onClearSearch}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Hapus Pencarian
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300 mb-4">
        <FolderIcon className="h-10 w-10 stroke-1" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">Folder ini kosong</h3>
      <p className="text-xs text-slate-500 max-w-xs">
        Silakan unggah dokumen baru atau buat sub-folder di sini.
      </p>
    </div>
  );
}
