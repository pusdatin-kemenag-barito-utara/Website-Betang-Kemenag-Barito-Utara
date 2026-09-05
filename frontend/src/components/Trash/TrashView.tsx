import { useState, useMemo } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  restoreTrashItem,
  restoreTrashItemsBatch,
  permanentDeleteTrashItems,
  getR2FileUrl,
} from "@/lib/api";
import { toast } from "sonner";
import { DeleteConfirmModal } from "../FileBrowser/DeleteConfirmModal";
import { FilePreviewModal } from "../FileBrowser/FilePreviewModal";
import { trackEvent } from "@/lib/analytics";
import type { TrashItem, TrashViewProps } from "./types";
import { TrashToolbar } from "./TrashToolbar";
import { TrashTable } from "./TrashTable";

export function TrashView({ initialData }: TrashViewProps) {
  const [items, setItems] = useState<TrashItem[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "file" | "folder">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(null);
  const [isBatchRestoring, setIsBatchRestoring] = useState(false);

  const [itemsToDelete, setItemsToDelete] = useState<TrashItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewItem, setPreviewItem] = useState<TrashItem | null>(null);

  const fileCount = useMemo(() => items.filter((i) => i.type === "file").length, [items]);
  const folderCount = useMemo(() => items.filter((i) => i.type === "folder").length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === "all" || item.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchQuery, filterType]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleRestore = async (item: TrashItem) => {
    setLoadingId(item.id);
    setActionType("restore");
    try {
      const { success, error } = await restoreTrashItem(item.id, item.type);
      if (!success) throw new Error(error || "Gagal merestore item");

      trackEvent("restore_trash_item", {
        item_id: item.id,
        item_name: item.name,
        item_type: item.type,
      });

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      window.dispatchEvent(new CustomEvent("storage-updated"));
      toast.success(`"${item.name}" berhasil dipulihkan.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal merestore item.");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    setIsBatchRestoring(true);
    try {
      const payload = selectedItems.map((i) => ({ id: i.id, type: i.type }));
      const { success, error } = await restoreTrashItemsBatch(payload);
      if (!success) throw new Error(error || "Gagal memulihkan batch");

      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      window.dispatchEvent(new CustomEvent("storage-updated"));
      toast.success(`${selectedItems.length} item berhasil dipulihkan.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memulihkan item.");
    } finally {
      setIsBatchRestoring(false);
    }
  };

  const handlePermanentDeleteConfirm = async () => {
    if (itemsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      const payload = itemsToDelete.map((i) => ({ id: i.id, type: i.type }));
      const { success, error } = await permanentDeleteTrashItems(payload);
      if (!success) throw new Error(error || "Gagal menghapus permanen");

      const deletedIds = new Set(itemsToDelete.map((i) => i.id));
      setItems((prev) => prev.filter((i) => !deletedIds.has(i.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      window.dispatchEvent(new CustomEvent("storage-updated"));
      toast.success(`${itemsToDelete.length} item berhasil dihapus permanen.`);
      setItemsToDelete([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus permanen.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice Retention */}
      <div className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div>
          <span className="font-bold">Informasi Masa Retensi: </span>
          <span>
            Item yang berada di Sampah akan otomatis dihapus secara permanen setelah 30 hari sejak
            tanggal dihapus.
          </span>
        </div>
      </div>

      <TrashToolbar
        searchQuery={searchQuery}
        selectedCount={selectedIds.size}
        totalCount={items.length}
        isBatchRestoring={isBatchRestoring}
        filterType={filterType}
        fileCount={fileCount}
        folderCount={folderCount}
        onFilterChange={setFilterType}
        onSearchChange={setSearchQuery}
        onBatchRestore={handleBatchRestore}
        onBatchDelete={() => setItemsToDelete(items.filter((i) => selectedIds.has(i.id)))}
        onEmptyTrash={() => setItemsToDelete([...items])}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600 mb-3">
              <Trash2 className="h-8 w-8 stroke-1" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              {searchQuery || filterType !== "all" ? "Tidak ada hasil ditemukan" : "Sampah Kosong"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {searchQuery
                ? `Tidak ada item yang cocok dengan "${searchQuery}".`
                : filterType !== "all"
                ? `Tidak ada ${filterType === "file" ? "berkas" : "folder"} di dalam sampah.`
                : "Tidak ada berkas atau folder yang dihapus saat ini."}
            </p>
          </div>
        ) : (
          <TrashTable
            items={filteredItems}
            selectedIds={selectedIds}
            loadingId={loadingId}
            actionType={actionType}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onRestoreSingle={handleRestore}
            onDeleteSingle={(item) => setItemsToDelete([item])}
            onPreviewFile={(item) => setPreviewItem(item)}
          />
        )}
      </div>

      {itemsToDelete.length > 0 && (
        <DeleteConfirmModal
          isOpen={itemsToDelete.length > 0}
          itemName={itemsToDelete[0]?.name}
          itemType={itemsToDelete[0]?.type}
          itemCount={itemsToDelete.length}
          isDeleting={isDeleting}
          isPermanent={true}
          onClose={() => setItemsToDelete([])}
          onConfirm={handlePermanentDeleteConfirm}
        />
      )}

      {/* File Preview Modal */}
      {previewItem && (
        <FilePreviewModal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          fileUrl={getR2FileUrl(previewItem.r2ObjectKey || previewItem.id)}
          fileName={previewItem.name}
          mimeType={previewItem.mimeType || "application/octet-stream"}
        />
      )}
    </div>
  );
}