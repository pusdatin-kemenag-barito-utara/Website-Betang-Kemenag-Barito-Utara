import { useState, useMemo } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  restoreTrashItem,
  restoreTrashItemsBatch,
  permanentDeleteTrashItems,
} from "@/lib/api";
import { toast } from "sonner";
import { DeleteConfirmModal } from "../FileBrowser/DeleteConfirmModal";
import { trackEvent } from "@/lib/analytics";
import type { TrashItem, TrashViewProps } from "./types";
import { TrashToolbar } from "./TrashToolbar";
import { TrashTable } from "./TrashTable";

export function TrashView({ initialData }: TrashViewProps) {
  const [items, setItems] = useState<TrashItem[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(null);
  const [isBatchRestoring, setIsBatchRestoring] = useState(false);

  const [itemsToDelete, setItemsToDelete] = useState<TrashItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

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
      <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-200/60 text-amber-900 text-xs">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
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
        onSearchChange={setSearchQuery}
        onBatchRestore={handleBatchRestore}
        onBatchDelete={() => setItemsToDelete(items.filter((i) => selectedIds.has(i.id)))}
        onEmptyTrash={() => setItemsToDelete([...items])}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-300 mb-3">
              <Trash2 className="h-8 w-8 stroke-1" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {searchQuery ? "Tidak ada hasil ditemukan" : "Sampah Kosong"}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
              {searchQuery
                ? `Tidak ada item yang cocok dengan "${searchQuery}".`
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
    </div>
  );
}