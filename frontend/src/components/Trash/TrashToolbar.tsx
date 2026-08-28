import { Search, X, RotateCcw, Trash2, Loader2 } from "lucide-react";

interface TrashToolbarProps {
  searchQuery: string;
  selectedCount: number;
  totalCount: number;
  isBatchRestoring: boolean;
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
  onSearchChange,
  onBatchRestore,
  onBatchDelete,
  onEmptyTrash,
}: TrashToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari item di sampah..."
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
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
