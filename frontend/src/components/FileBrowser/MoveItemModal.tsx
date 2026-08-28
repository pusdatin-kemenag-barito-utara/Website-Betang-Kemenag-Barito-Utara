// Modal pindah/salin item ke folder lain. Pengganti MoveItemModal.tsx lama
// (moveItem/copyItem/getFoldersByBidang dari lib/api; muat ulang setelah sukses).
import { useState, useEffect } from "react";
import { FolderIcon, Loader2, X } from "lucide-react";
import { moveItem, copyItem, getFoldersByBidang, reloadSoon } from "@/lib/api";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemsToMove: FileItem[];
  currentFolderId: string | null;
  mode?: "move" | "copy";
  onSuccess?: () => void;
}

interface MinimalFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

export function MoveItemModal({
  isOpen,
  onClose,
  itemsToMove,
  currentFolderId,
  mode = "move",
  onSuccess,
}: MoveItemModalProps) {
  const [folders, setFolders] = useState<MinimalFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [currentViewId, setCurrentViewId] = useState<string>("root");

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const res = await getFoldersByBidang();
      if (res.success && res.data) {
        setFolders(res.data);
      } else {
        toast.error("Gagal memuat daftar folder");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchFolders();
        setCurrentViewId("root");
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleMove = async () => {
    const destinationId = currentViewId === "root" ? null : currentViewId;

    setIsMoving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of itemsToMove) {
      if (item.type === "folder" && item.id === destinationId) {
        errorCount++;
        continue;
      }
      if (currentFolderId === destinationId || (currentFolderId === null && destinationId === null)) {
        continue; // Sudah di sini
      }

      if (mode === "copy") {
        const res = await copyItem(item.id, item.type, destinationId, currentFolderId);
        if (res.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } else {
        const res = await moveItem(item.id, item.type, destinationId, currentFolderId);
        if (res.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    setIsMoving(false);

    if (successCount > 0) {
      toast.success(`${successCount} item berhasil di${mode === "copy" ? "salin" : "pindahkan"}.`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} item gagal di${mode === "copy" ? "salin" : "pindahkan"}.`);
    }

    if (successCount > 0 && onSuccess) {
      onSuccess();
    }
    onClose();
    if (successCount > 0 && !onSuccess) {
      reloadSoon();
    }
  };

  if (!isOpen) return null;

  const movingFolderIds = itemsToMove.filter((i) => i.type === "folder").map((i) => i.id);

  const displayedFolders = folders.filter((f) => {
    const inView = currentViewId === "root" ? f.parent_id === null : f.parent_id === currentViewId;
    const notMoving = !movingFolderIds.includes(f.id);
    return inView && notMoving;
  });

  const getBreadcrumbs = () => {
    const paths = [];
    let curr = folders.find((f) => f.id === currentViewId);
    while (curr) {
      paths.unshift(curr);
      const parentId = curr.parent_id;
      if (parentId) {
        curr = folders.find((f) => f.id === parentId);
      } else {
        break;
      }
    }
    return paths;
  };

  const breadcrumbs = getBreadcrumbs();

  const destinationId = currentViewId === "root" ? null : currentViewId;
  const isAlreadyHere = currentFolderId === destinationId || (currentFolderId === null && destinationId === null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={!isMoving ? onClose : undefined}
      />
      <div className="relative w-full max-w-xl sm:max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {mode === "copy" ? "Salin ke..." : "Pindahkan ke..."}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{itemsToMove.length} item terpilih</p>
          </div>
          <button
            onClick={onClose}
            disabled={isMoving}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm">
          <button
            onClick={() => setCurrentViewId("root")}
            className={`font-semibold hover:text-emerald-600 transition-colors ${
              currentViewId === "root" ? "text-slate-800" : "text-slate-500"
            }`}
          >
            Home
          </button>
          {breadcrumbs.map((crumb) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <span className="text-slate-300">/</span>
              <button
                onClick={() => setCurrentViewId(crumb.id)}
                className={`font-semibold hover:text-emerald-600 transition-colors ${
                  currentViewId === crumb.id ? "text-slate-800" : "text-slate-500"
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {displayedFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentViewId(folder.id)}
                  className="flex items-center justify-between rounded-xl p-3 text-left transition-all hover:bg-slate-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500 group-hover:bg-blue-100 transition-colors">
                      <FolderIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
                        {folder.name}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {displayedFolders.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500">
                  Folder ini kosong atau hanya berisi file tujuan Anda.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
          <button
            onClick={onClose}
            disabled={isMoving}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleMove}
            disabled={isMoving || isAlreadyHere}
            className={`flex items-center rounded-xl px-6 py-2 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 disabled:shadow-none ${
              mode === "copy"
                ? "bg-blue-600 shadow-blue-600/20 hover:bg-blue-700"
                : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
            }`}
          >
            {isMoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "copy" ? "Menyalin..." : "Memindahkan..."}
              </>
            ) : mode === "copy" ? (
              "Salin ke sini"
            ) : (
              "Pindahkan ke sini"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}