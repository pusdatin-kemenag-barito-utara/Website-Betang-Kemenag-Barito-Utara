import {
  Folder as FolderIcon,
  FileText,
  RotateCcw,
  Trash2,
  Loader2,
} from "lucide-react";
import type { TrashItem } from "./types";

interface TrashTableProps {
  items: TrashItem[];
  selectedIds: Set<string>;
  loadingId: string | null;
  actionType: "restore" | "delete" | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRestoreSingle: (item: TrashItem) => void;
  onDeleteSingle: (item: TrashItem) => void;
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
}: TrashTableProps) {
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </th>
            <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Nama
            </th>
            <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Dihapus Pada
            </th>
            <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kedaluwarsa
            </th>
            <th className="w-24 px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isFolder = item.type === "folder";
            const isLoadingThis = loadingId === item.id;

            return (
              <tr
                key={item.id}
                onClick={() => onToggleSelect(item.id)}
                className={`group cursor-pointer transition-colors ${
                  isSelected ? "bg-emerald-50/60 hover:bg-emerald-50" : "hover:bg-slate-50/80"
                }`}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0 max-w-xs sm:max-w-md">
                    {isFolder ? (
                      <FolderIcon className="h-5 w-5 shrink-0 text-blue-500 fill-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                    <span className="truncate text-xs sm:text-sm font-semibold text-slate-800">
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {item.deletedAt}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {item.expiresAt}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onRestoreSingle(item)}
                      disabled={isLoadingThis}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                      title="Pulihkan"
                    >
                      {isLoadingThis && actionType === "restore" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteSingle(item)}
                      disabled={isLoadingThis}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
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
