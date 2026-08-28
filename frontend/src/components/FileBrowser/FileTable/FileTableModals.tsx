import { FilePreviewModal } from "../FilePreviewModal";
import { DeleteConfirmModal } from "../DeleteConfirmModal";
import { RenameItemModal } from "../RenameItemModal";
import { MoveItemModal } from "../MoveItemModal";
import { VersionHistoryModal } from "../VersionHistoryModal";
import { FolderColorModal } from "../FolderColorModal";
import { ShareLinkModal } from "../ShareLinkModal";
import { renameItem, updateFolderColor } from "@/lib/api";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";

interface FileTableModalsProps {
  folderId: string;
  previewFile: FileItem | null;
  previewUrl: string | null;
  previewLoading: boolean;
  itemsToDelete: FileItem[];
  isDeleting: boolean;
  itemToRename: FileItem | null;
  folderToColor: FileItem | null;
  shareLinkFile: FileItem | null;
  versionHistoryFile: FileItem | null;
  itemsToMove: FileItem[];
  moveModalMode: "move" | "copy";
  onClosePreview: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseRename: () => void;
  onCloseMove: () => void;
  onCloseColor: () => void;
  onCloseShare: () => void;
  onCloseVersion: () => void;
  onRefresh?: () => void;
}

export function FileTableModals({
  folderId,
  previewFile,
  previewUrl,
  previewLoading,
  itemsToDelete,
  isDeleting,
  itemToRename,
  folderToColor,
  shareLinkFile,
  versionHistoryFile,
  itemsToMove,
  moveModalMode,
  onClosePreview,
  onCloseDelete,
  onConfirmDelete,
  onCloseRename,
  onCloseMove,
  onCloseColor,
  onCloseShare,
  onCloseVersion,
  onRefresh,
}: FileTableModalsProps) {
  return (
    <>
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          fileName={previewFile.name}
          mimeType={previewFile.mimeType || "application/octet-stream"}
          fileUrl={previewUrl}
          isLoading={previewLoading}
          error={null}
          onClose={onClosePreview}
        />
      )}

      {itemsToDelete.length > 0 && (
        <DeleteConfirmModal
          isOpen={itemsToDelete.length > 0}
          itemName={itemsToDelete[0]?.name}
          itemType={itemsToDelete[0]?.type}
          itemCount={itemsToDelete.length}
          isDeleting={isDeleting}
          onClose={onCloseDelete}
          onConfirm={onConfirmDelete}
        />
      )}

      {itemToRename && (
        <RenameItemModal
          isOpen={!!itemToRename}
          initialName={itemToRename.name}
          itemType={itemToRename.type}
          onClose={onCloseRename}
          onConfirm={async (newName: string) => {
            const res = await renameItem(itemToRename.id, itemToRename.type, newName, folderId || "root");
            if (res.success) {
              toast.success("Nama berhasil diubah");
              onCloseRename();
              window.dispatchEvent(new CustomEvent("folder-content-updated"));
              if (onRefresh) onRefresh();
            } else {
              toast.error(res.error || "Gagal mengubah nama");
            }
          }}
        />
      )}

      {itemsToMove.length > 0 && (
        <MoveItemModal
          isOpen={itemsToMove.length > 0}
          itemsToMove={itemsToMove}
          mode={moveModalMode}
          currentFolderId={folderId || "root"}
          onClose={onCloseMove}
          onSuccess={() => {
            onCloseMove();
            window.dispatchEvent(new CustomEvent("folder-content-updated"));
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {folderToColor && (
        <FolderColorModal
          isOpen={!!folderToColor}
          folder={folderToColor}
          onClose={onCloseColor}
          onSelectColor={async (fId: string, color: string | null) => {
            const res = await updateFolderColor(fId, color);
            if (res.success) {
              toast.success("Warna folder berhasil diperbarui");
              onCloseColor();
              window.dispatchEvent(new CustomEvent("folder-content-updated"));
              if (onRefresh) onRefresh();
            } else {
              toast.error("Gagal mengubah warna folder");
            }
          }}
        />
      )}

      {shareLinkFile && (
        <ShareLinkModal
          isOpen={!!shareLinkFile}
          file={shareLinkFile}
          onClose={onCloseShare}
        />
      )}

      {versionHistoryFile && (
        <VersionHistoryModal
          isOpen={!!versionHistoryFile}
          file={versionHistoryFile}
          folderId={folderId || "root"}
          onClose={onCloseVersion}
        />
      )}
    </>
  );
}
