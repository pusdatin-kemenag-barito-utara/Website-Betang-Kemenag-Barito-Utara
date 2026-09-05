import {
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FileTableProps, ContextMenuState } from "./FileTable/types";
import { useFileDragDrop } from "./FileTable/useFileDragDrop";
import { useFileTableModals } from "./FileTable/useFileTableModals";
import { createFileTableColumns } from "./FileTable/FileTableColumns";
import { FileTableView } from "./FileTable/FileTableView";
import { FileGridView } from "./FileTable/FileGridView";
import { FileContextMenu } from "./FileTable/FileContextMenu";
import { FileTableEmptyState } from "./FileTable/FileTableEmptyState";
import { FileTableBatchBar } from "./FileTable/FileTableBatchBar";
import { FileTableModals } from "./FileTable/FileTableModals";
import type { FileItem } from "@/lib/types";
import { copyItem } from "@/lib/api";
import { toast } from "sonner";

export function FileTable({
  data,
  onNavigate,
  onShowInfo,
  onRefresh,
  folderId,
  searchQuery = "",
  viewMode = "list",
}: FileTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [detailsItem, setDetailsItem] = useState<FileItem | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
  });

  const {
    dragOverFolderId,
    optimisticHiddenIds,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFileDragDrop({ folderId, onRefresh });

  const {
    previewFile,
    setPreviewFile,
    previewUrl,
    setPreviewUrl,
    previewLoading,
    itemsToDelete,
    setItemsToDelete,
    isDeleting,
    itemToRename,
    setItemToRename,
    folderToColor,
    setFolderToColor,
    shareLinkFile,
    setShareLinkFile,
    versionHistoryFile,
    setVersionHistoryFile,
    itemsToMove,
    setItemsToMove,
    moveModalMode,
    setMoveModalMode,
    localStarredMap,
    handleToggleStar,
    handlePreview,
    handleDownload,
    handleDeleteConfirm,
  } = useFileTableModals({ folderId, onNavigate, onRefresh });

  const filteredData = useMemo(() => {
    return data.filter((item) => !optimisticHiddenIds.includes(item.id));
  }, [data, optimisticHiddenIds]);

  const handleOpenItemMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

    let targetX = rect.right - 220;
    if (targetX < 12) targetX = 12;
    if (targetX + 220 > viewportWidth - 12) targetX = viewportWidth - 232;

    let targetY = rect.bottom + 4;
    if (targetY + 380 > viewportHeight - 12) {
      targetY = Math.max(12, rect.top - 384);
    }

    setContextMenu({ visible: true, x: targetX, y: targetY, item });
  };

  const handleContextMenuTrigger = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

    const targetX = Math.min(e.clientX, viewportWidth - 232);
    const targetY = Math.min(e.clientY, viewportHeight - 380);

    setContextMenu({ visible: true, x: targetX, y: targetY, item });
  };

  const handleDuplicate = async (item: FileItem) => {
    try {
      const res = await copyItem(item.id, item.type, folderId || "root", folderId || "root");
      if (res.success) {
        toast.success(`Salinan "${item.name}" berhasil dibuat`);
        window.dispatchEvent(new CustomEvent("folder-content-updated"));
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Gagal membuat salinan item");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menduplikasi item");
    }
  };

  const handleShowDetails = (item: FileItem) => {
    setDetailsItem(item);
    onShowInfo?.(item);
  };

  const columns = useMemo(
    () =>
      createFileTableColumns({
        onNavigate,
        onPreview: handlePreview,
        onDownload: handleDownload,
        onToggleStar: handleToggleStar,
        onDelete: (item) => setItemsToDelete([item]),
        onShowInfo: handleShowDetails,
        onOpenMenu: handleOpenItemMenu,
        starredMap: localStarredMap,
      }),
    [onNavigate, onShowInfo, localStarredMap, handlePreview, handleDownload, handleToggleStar, setItemsToDelete],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedItems = selectedRows.map((r) => r.original);

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <FileTableBatchBar
        selectedItems={selectedItems}
        onMoveBatch={() => {
          setItemsToMove(selectedItems);
          setMoveModalMode("move");
        }}
        onCopyBatch={() => {
          setItemsToMove(selectedItems);
          setMoveModalMode("copy");
        }}
        onDeleteBatch={() => setItemsToDelete(selectedItems)}
      />

      {/* Tampilan List atau Grid */}
      {filteredData.length === 0 ? (
        <FileTableEmptyState searchQuery={searchQuery} />
      ) : viewMode === "grid" ? (
        <FileGridView
          data={filteredData}
          selectedIds={rowSelection}
          starredMap={localStarredMap}
          dragOverFolderId={dragOverFolderId}
          onToggleSelect={(id, e) => {
            e.stopPropagation();
            setRowSelection((prev) => ({ ...prev, [id]: !prev[id] }));
          }}
          onToggleStar={handleToggleStar}
          onNavigate={onNavigate}
          onPreview={handlePreview}
          onContextMenu={handleContextMenuTrigger}
          onOpenMenu={handleOpenItemMenu}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ) : (
        <FileTableView
          table={table}
          dragOverFolderId={dragOverFolderId}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onContextMenu={handleContextMenuTrigger}
          onRowClick={(item) => {
            setRowSelection((prev) => {
              const next = { ...prev };
              if (next[item.id]) {
                delete next[item.id];
              } else {
                next[item.id] = true;
              }
              return next;
            });
          }}
          onRowDoubleClick={(item) => {
            if (item.type === "folder" && onNavigate) onNavigate(item.id);
            else handlePreview(item);
          }}
        />
      )}

      {/* Pagination Footer */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          <span>
            Menampilkan {table.getRowModel().rows.length} dari {filteredData.length} item
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-700">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <FileContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        item={contextMenu.item}
        isStarred={contextMenu.item ? (localStarredMap[contextMenu.item.id] ?? contextMenu.item.isStarred ?? false) : false}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onShare={(item) => setShareLinkFile(item)}
        onToggleStar={handleToggleStar}
        onMove={(item) => {
          setItemsToMove([item]);
          setMoveModalMode("move");
        }}
        onCopy={(item) => {
          setItemsToMove([item]);
          setMoveModalMode("copy");
        }}
        onDuplicate={handleDuplicate}
        onRename={(item) => setItemToRename(item)}
        onColor={(item) => setFolderToColor(item)}
        onVersion={(item) => setVersionHistoryFile(item)}
        onDelete={(item) => setItemsToDelete([item])}
        onShowInfo={handleShowDetails}
      />

      {/* Dialog Modals */}
      <FileTableModals
        folderId={folderId || "root"}
        previewFile={previewFile}
        previewUrl={previewUrl}
        previewLoading={previewLoading}
        itemsToDelete={itemsToDelete}
        isDeleting={isDeleting}
        itemToRename={itemToRename}
        folderToColor={folderToColor}
        shareLinkFile={shareLinkFile}
        versionHistoryFile={versionHistoryFile}
        itemsToMove={itemsToMove}
        moveModalMode={moveModalMode}
        itemForDetails={detailsItem}
        onClosePreview={() => {
          setPreviewFile(null);
          setPreviewUrl(null);
        }}
        onCloseDelete={() => setItemsToDelete([])}
        onConfirmDelete={() => handleDeleteConfirm(() => setRowSelection({}))}
        onCloseRename={() => setItemToRename(null)}
        onCloseMove={() => setItemsToMove([])}
        onCloseColor={() => setFolderToColor(null)}
        onCloseShare={() => setShareLinkFile(null)}
        onCloseVersion={() => setVersionHistoryFile(null)}
        onCloseDetails={() => setDetailsItem(null)}
        onTriggerPreview={handlePreview}
        onTriggerDownload={handleDownload}
        onTriggerToggleStar={handleToggleStar}
        onTriggerRename={(item) => setItemToRename(item)}
        onTriggerChangeColor={(item) => setFolderToColor(item)}
        onTriggerShare={(item) => setShareLinkFile(item)}
        onTriggerDelete={(item) => setItemsToDelete([item])}
        onRefresh={onRefresh}
      />
    </div>
  );
}