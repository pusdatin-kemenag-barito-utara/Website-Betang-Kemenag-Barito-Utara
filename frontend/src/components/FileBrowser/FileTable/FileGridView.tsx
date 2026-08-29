import { Star, MoreVertical } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { getFileIcon } from "./FileTableColumns";
import type { FileItem } from "@/lib/types";

interface FileGridViewProps {
  data: FileItem[];
  selectedIds: Record<string, boolean>;
  starredMap: Record<string, boolean>;
  dragOverFolderId: string | null;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onToggleStar: (item: FileItem, e?: React.MouseEvent) => void;
  onNavigate?: (id: string) => void;
  onPreview: (item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onOpenMenu?: (e: React.MouseEvent, item: FileItem) => void;
  onDragStart: (e: React.DragEvent, item: FileItem) => void;
  onDragOver: (e: React.DragEvent, item: FileItem) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, item: FileItem) => void;
}

export function FileGridView({
  data,
  selectedIds,
  starredMap,
  dragOverFolderId,
  onToggleSelect,
  onToggleStar,
  onNavigate,
  onPreview,
  onContextMenu,
  onOpenMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileGridViewProps) {
  return (
    <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
      {data.map((item) => {
        const isFolder = item.type === "folder";
        const isSelected = selectedIds[item.id];
        const isStarred = starredMap[item.id] ?? item.isStarred ?? false;
        const isDragOver = dragOverFolderId === item.id;
        const displaySize =
          item.size && item.size !== "-"
            ? item.size
            : item.rawSizeBytes && item.rawSizeBytes > 0
            ? formatFileSize(item.rawSizeBytes)
            : isFolder
            ? "Folder"
            : "0 B";

        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            onDragOver={(e) => onDragOver(e, item)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, item)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(e, item);
            }}
            onClick={() => {
              if (isFolder && onNavigate) {
                onNavigate(item.id);
              } else if (!isFolder) {
                onPreview(item);
              }
            }}
            className={`group relative flex flex-col p-3 rounded-2xl border transition-all cursor-pointer select-none ${
              isSelected
                ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                : isDragOver
                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500 shadow-md scale-105"
                : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md"
            }`}
          >
            {/* Header Card: Checkbox, Bintang, Titik 3 */}
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={() => {}}
                onClick={(e) => onToggleSelect(item.id, e)}
                className={`h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer ${
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                } transition-opacity`}
              />
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(item, e);
                  }}
                  className={`p-1 rounded-lg text-slate-300 hover:text-amber-400 transition-colors cursor-pointer ${
                    isStarred ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  title={isStarred ? "Hapus dari Berbintang" : "Tambahkan ke Berbintang"}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      isStarred ? "fill-amber-400 text-amber-400" : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onOpenMenu) {
                      onOpenMenu(e, item);
                    } else {
                      onContextMenu(e, item);
                    }
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-100 transition-colors cursor-pointer"
                  title="Menu Opsi"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Thumbnail / Icon */}
            <div className="flex items-center justify-center h-20 w-full rounded-xl bg-slate-50 mb-2.5 overflow-hidden">
              <div className="scale-125 transition-transform group-hover:scale-135">
                {getFileIcon(item)}
              </div>
            </div>

            {/* Nama & Metadata */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                {item.name}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {displaySize}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
