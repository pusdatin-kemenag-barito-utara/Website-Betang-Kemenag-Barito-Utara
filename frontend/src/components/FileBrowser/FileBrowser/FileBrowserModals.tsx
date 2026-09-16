import { CreateFolderModal } from "../CreateFolderModal";
import { FileDetailsPanel } from "../FileDetailsPanel";
import type { FileItem } from "@/lib/types";

interface FileBrowserModalsProps {
  isCreateOpen: boolean;
  currentFolderId: string;
  selectedItemForInfo: FileItem | null;
  onCloseCreate: () => void;
  onCloseInfo: () => void;
  onSuccessMutation: () => void;
}

export function FileBrowserModals({
  isCreateOpen,
  currentFolderId,
  selectedItemForInfo,
  onCloseCreate,
  onCloseInfo,
  onSuccessMutation,
}: FileBrowserModalsProps) {
  return (
    <>
      <CreateFolderModal
        isOpen={isCreateOpen}
        onClose={onCloseCreate}
        parentId={currentFolderId}
        onSuccess={onSuccessMutation}
      />

      <FileDetailsPanel
        isOpen={!!selectedItemForInfo}
        item={selectedItemForInfo}
        onClose={onCloseInfo}
      />
    </>
  );
}
