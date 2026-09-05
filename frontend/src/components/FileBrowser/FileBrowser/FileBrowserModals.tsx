import { CreateFolderModal } from "../CreateFolderModal";
import { UploadFileModal } from "../UploadFileModal";
import { FileDetailsPanel } from "../FileDetailsPanel";
import type { FileItem } from "@/lib/types";

interface FileBrowserModalsProps {
  isCreateOpen: boolean;
  isUploadOpen: boolean;
  isFolderMode: boolean;
  currentFolderId: string;
  userBidangId: string;
  selectedItemForInfo: FileItem | null;
  initialFiles?: File[];
  onCloseCreate: () => void;
  onCloseUpload: () => void;
  onCloseInfo: () => void;
  onSuccessMutation: () => void;
}

export function FileBrowserModals({
  isCreateOpen,
  isUploadOpen,
  isFolderMode,
  currentFolderId,
  userBidangId,
  selectedItemForInfo,
  initialFiles,
  onCloseCreate,
  onCloseUpload,
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

      <UploadFileModal
        isOpen={isUploadOpen}
        onClose={onCloseUpload}
        folderId={currentFolderId}
        userBidangId={userBidangId}
        isFolderMode={isFolderMode}
        initialFiles={initialFiles}
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
