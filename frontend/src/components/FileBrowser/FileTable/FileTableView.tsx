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

const getColumnWidthClass = (colId: string) => {
  if (colId === "select") return "w-10 sm:w-12";
  if (colId === "name") return "w-auto";
  if (colId === "size") return "hidden sm:table-cell sm:w-24";
  if (colId === "format") return "hidden sm:table-cell sm:w-20";
  if (colId === "updatedAt") return "hidden md:table-cell md:w-32";
  if (colId === "actions") return "w-16 sm:w-14";
  return "";
};

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
    <div className="w-full overflow-hidden">
      <table className="w-full table-fixed text-left border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/50">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();
                const widthClass = getColumnWidthClass(header.column.id);

                return (
                  <th
                    key={header.id}
                    className={`px-3 sm:px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none ${widthClass}`}
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
                {row.getVisibleCells().map((cell) => {
                  const widthClass = getColumnWidthClass(cell.column.id);
                  return (
                    <td key={cell.id} className={`px-3 sm:px-4 py-2.5 sm:py-3 text-sm overflow-hidden ${widthClass}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
