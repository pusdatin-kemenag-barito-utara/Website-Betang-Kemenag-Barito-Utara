import { Search, X, RotateCcw, Trash2, Loader2, Filter } from "lucide-react";

interface TrashToolbarProps {
  searchQuery: string;
  selectedCount: number;
  totalCount: number;
  isBatchRestoring: boolean;
  filterType: "all" | "file" | "folder";
  fileCount: number;
  folderCount: number;
  onFilterChange: (type: "all" | "file" | "folder") => void;
  onSearchChange: (q: string) => void;
  onBatchRestore: () => void;
  onBatchDelete: () => void;
  onEmptyTrash: () => void;
}

export function TrashToolbar({
  searchQuery,
  selectedCount,
  totalCount,
  isBatchRestoring,
  filterType,
  fileCount,
  folderCount,
  onFilterChange,
  onSearchChange,
  onBatchRestore,
  onBatchDelete,
  onEmptyTrash,
}: TrashToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Search Input & Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari item di sampah..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("file")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === "file"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Berkas ({fileCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("folder")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === "folder"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Folder ({folderCount})
          </button>
        </div>
      </div>

      {/* Batch & Empty Actions */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {selectedCount > 0 && (
          <>
            <button
              onClick={onBatchRestore}
              disabled={isBatchRestoring}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isBatchRestoring ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span>Pulihkan ({selectedCount})</span>
            </button>

            <button
              onClick={onBatchDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus ({selectedCount})</span>
            </button>
          </>
        )}

        {totalCount > 0 && (
          <button
            onClick={onEmptyTrash}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold shadow-xs transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Kosongkan Sampah</span>
          </button>
        )}
      </div>
    </div>
  );
}
