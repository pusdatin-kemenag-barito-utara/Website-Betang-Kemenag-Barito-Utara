import {
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { useState, useMemo, useEffect } from "react";
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
import { ExtractProgressModal } from "./FileTable/ExtractProgressModal";
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
  sortBy = (!folderId || folderId === "root") ? "name-desc" : "name-asc",
  onSortChange,
}: FileTableProps) {
  const isRoot = !folderId || folderId === "root";
  // Default sorting: di root menggunakan descending (panah bawah), di dalam subfolder tetap urutan awal (ascending)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: isRoot },
  ]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [detailsItem, setDetailsItem] = useState<FileItem | null>(null);

  // Update sorting saat folderId berpindah
  useEffect(() => {
    const isRootFolder = !folderId || folderId === "root";
    setSorting([{ id: "name", desc: isRootFolder }]);
  }, [folderId]);

  // Sinkronkan sorting tabel saat opsi sortBy di dropdown berubah
  useEffect(() => {
    if (sortBy === "name-asc") {
      setSorting([{ id: "name", desc: false }]);
    } else if (sortBy === "name-desc") {
      setSorting([{ id: "name", desc: true }]);
    } else if (sortBy === "date-desc") {
      setSorting([{ id: "updatedAt", desc: true }]);
    } else if (sortBy === "date-asc") {
      setSorting([{ id: "updatedAt", desc: false }]);
    } else if (sortBy === "size-desc") {
      setSorting([{ id: "size", desc: true }]);
    } else if (sortBy === "size-asc") {
      setSorting([{ id: "size", desc: false }]);
    }
  }, [sortBy]);

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
    handleExtractArchive,
    extractProgress,
    handleCloseExtractProgress,
    handleToggleCollapseExtractProgress,
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

    let targetX = rect.right - 260;
    if (targetX < 12) targetX = 12;
    if (targetX + 260 > viewportWidth - 12) targetX = viewportWidth - 272;

    let targetY = rect.bottom + 4;
    if (targetY + 340 > viewportHeight - 12) {
      targetY = Math.max(12, rect.top - 344);
    }

    setContextMenu({ visible: true, x: targetX, y: targetY, item });
  };

  const handleContextMenuTrigger = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

    const targetX = Math.min(e.clientX, viewportWidth - 272);
    const targetY = Math.min(e.clientY, viewportHeight - 340);

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
        onExtract: handleExtractArchive,
        starredMap: localStarredMap,
      }),
    [onNavigate, onShowInfo, localStarredMap, handlePreview, handleDownload, handleToggleStar, setItemsToDelete, handleExtractArchive],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: true,
    manualSorting: true,
    getRowId: (row) => row.id,
    onSortingChange: (updaterOrValue) => {
      setSorting((prev) => {
        const next = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
        if (next && next.length > 0 && onSortChange) {
          const first = next[0];
          if (first.id === "name") {
            onSortChange(first.desc ? "name-desc" : "name-asc");
          } else if (first.id === "updatedAt") {
            onSortChange(first.desc ? "date-desc" : "date-asc");
          } else if (first.id === "size") {
            onSortChange(first.desc ? "size-desc" : "size-asc");
          }
        }
        return next;
      });
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
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
            setDetailsItem(item);
          }}
          onRowDoubleClick={(item) => {
            if (item.type === "folder" && onNavigate) onNavigate(item.id);
            else handlePreview(item);
          }}
        />
      )}

      {/* Status Bar Footer (Tanpa Pagination - Memanjang ke bawah seperti Google Drive) */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 select-none">
          <span>
            {selectedItems.length > 0
              ? `${selectedItems.length} dari ${filteredData.length} item dipilih`
              : `${filteredData.length} item`}
          </span>
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
        onExtract={handleExtractArchive}
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

      {/* Modal / Widget Progres Ekstraksi Arsip */}
      <ExtractProgressModal
        state={extractProgress}
        onToggleCollapse={handleToggleCollapseExtractProgress}
        onClose={handleCloseExtractProgress}
      />
    </div>
  );
}