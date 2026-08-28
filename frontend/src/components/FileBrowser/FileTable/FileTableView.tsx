import { flexRender } from "@tanstack/react-table";
import type { Table } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { FileItem } from "@/lib/types";

interface FileTableViewProps {
  table: Table<FileItem>;
  dragOverFolderId: string | null;
  onDragStart: (e: React.DragEvent, item: FileItem) => void;
  onDragOver: (e: React.DragEvent, item: FileItem) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onRowClick: (item: FileItem) => void;
  onRowDoubleClick: (item: FileItem) => void;
}

export function FileTableView({
  table,
  dragOverFolderId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onContextMenu,
  onRowClick,
  onRowDoubleClick,
}: FileTableViewProps) {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/50">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();

                return (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1.5 ${
                          canSort ? "cursor-pointer hover:text-slate-800" : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-slate-400">
                            {isSorted === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
                            ) : isSorted === "desc" ? (
                              <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => {
            const item = row.original;
            const isDragOver = dragOverFolderId === item.id;

            return (
              <tr
                key={row.id}
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
                onClick={() => onRowClick(item)}
                onDoubleClick={() => onRowDoubleClick(item)}
                className={`group cursor-pointer transition-colors select-none ${
                  row.getIsSelected()
                    ? "bg-emerald-50/60 hover:bg-emerald-50"
                    : isDragOver
                    ? "bg-blue-50/80 ring-2 ring-blue-500 ring-inset"
                    : "hover:bg-slate-50/80"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
