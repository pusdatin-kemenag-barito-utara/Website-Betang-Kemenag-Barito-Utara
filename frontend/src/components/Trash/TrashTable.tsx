import {
  Folder as FolderIcon,
  FileText,
  RotateCcw,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import type { TrashItem } from "./types";
import { formatFileSize } from "@/lib/utils";

interface TrashTableProps {
  items: TrashItem[];
  selectedIds: Set<string>;
  loadingId: string | null;
  actionType: "restore" | "delete" | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRestoreSingle: (item: TrashItem) => void;
  onDeleteSingle: (item: TrashItem) => void;
  onPreviewFile?: (item: TrashItem) => void;
}

export function TrashTable({
  items,
  selectedIds,
  loadingId,
  actionType,
  onToggleSelect,
  onToggleSelectAll,
  onRestoreSingle,
  onDeleteSingle,
  onPreviewFile,
}: TrashTableProps) {
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </th>
            <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Nama
            </th>
            <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Dihapus Pada
            </th>
            <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kedaluwarsa
            </th>
            <th className="w-28 px-4 py-3 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isFolder = item.type === "folder";
            const isLoadingThis = loadingId === item.id;

            return (
              <tr
                key={item.id}
                onClick={() => onToggleSelect(item.id)}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30"
                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                }`}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0 max-w-xs sm:max-w-md">
                    {isFolder ? (
                      <FolderIcon className="h-5 w-5 shrink-0 text-blue-500 fill-blue-500/20" />
                    ) : (
                      <FileText className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {item.name}
                      </span>
                      {!isFolder && item.sizeBytes !== undefined && item.sizeBytes > 0 && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {formatFileSize(item.sizeBytes)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {item.deletedAt}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-300">{item.expiresAt}</span>
                    {typeof item.daysRemaining === "number" && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-tight ${
                          item.daysRemaining <= 3
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60"
                            : item.daysRemaining <= 7
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        Sisa {item.daysRemaining} hari
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {!isFolder && onPreviewFile && (
                      <button
                        type="button"
                        onClick={() => onPreviewFile(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                        title="Pratinjau Berkas"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRestoreSingle(item)}
                      disabled={isLoadingThis}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors disabled:opacity-40"
                      title="Pulihkan"
                    >
                      {isLoadingThis && actionType === "restore" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSingle(item)}
                      disabled={isLoadingThis}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-40"
                      title="Hapus Permanen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

