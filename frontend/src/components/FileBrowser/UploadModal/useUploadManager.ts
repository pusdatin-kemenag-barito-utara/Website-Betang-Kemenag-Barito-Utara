import { useState, useRef, useEffect } from "react";
import { saveFileMetadata, getPresignedUploadUrl, uploadFileDirect } from "@/lib/api";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export type FileStatus = "pending" | "uploading" | "success" | "error";

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: FileStatus;
  error?: string;
}

export function useUploadManager({
  isOpen,
  folderId,
  userBidangId,
  initialFiles,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  folderId: string;
  userBidangId: string;
  initialFiles?: File[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const cancelToken = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setUploadItems([]);
        setIsUploading(false);
        setIsMinimized(false);
        setIsCollapsed(false);
        setGlobalError("");
        cancelToken.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const addFiles = (newFiles: File[]) => {
    if (uploadItems.length + newFiles.length > 50) {
      setGlobalError("Maksimal 50 file dapat diunggah sekaligus.");
      newFiles = newFiles.slice(0, 50 - uploadItems.length);
    } else {
      setGlobalError("");
    }

    const items: UploadItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      file,
      progress: 0,
      status: "pending",
    }));

    setUploadItems((prev) => [...prev, ...items]);
  };

  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0 && uploadItems.length === 0) {
      const timer = setTimeout(() => addFiles(initialFiles), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialFiles]);

  const removeFile = (id: string) => {
    setUploadItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemStatus = (id: string, updates: Partial<UploadItem>) => {
    setUploadItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleUpload = async () => {
    const pendingItems = uploadItems.filter((i) => i.status === "pending" || i.status === "error");
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    setIsMinimized(true);
    setIsCollapsed(false);
    cancelToken.current = false;
    setGlobalError("");
    let successCount = 0;

    trackEvent("upload_start", {
      total_items: pendingItems.length,
      folder_id: folderId,
    });

    for (const item of pendingItems) {
      if (cancelToken.current) break;
      updateItemStatus(item.id, { status: "uploading", progress: 25, error: undefined });

      try {
        // 1. Coba Direct Multipart Upload ke backend
        const directRes = await uploadFileDirect(item.file, folderId, item.file.name);
        if (directRes.success) {
          successCount++;
          trackEvent("upload_file", {
            file_name: item.file.name,
            file_size: item.file.size,
            mime_type: item.file.type || "application/octet-stream",
          });
          updateItemStatus(item.id, { status: "success", progress: 100 });
          continue;
        }

        // 2. Fallback ke Pre-signed URL PUT
        updateItemStatus(item.id, { progress: 45 });
        const fileExt = item.file.name.split(".").pop();
        const originalName = item.file.name.substring(0, item.file.name.lastIndexOf(".")) || item.file.name;
        const safeName = originalName.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 40);
        const fileName = `${safeName}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const folderPathSegment = folderId === "root" ? "root" : folderId;
        const filePath = `arsip/${userBidangId}/${folderPathSegment}/${fileName}`;

        const { success, presignedUrl, r2ObjectKey, error: presignedError } =
          await getPresignedUploadUrl(filePath, item.file.type || "application/octet-stream");
        if (!success || !presignedUrl || !r2ObjectKey) {
          throw new Error(directRes.error || presignedError || "Gagal mengunggah file.");
        }

        if (cancelToken.current) break;
        updateItemStatus(item.id, { progress: 65 });

        let uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          body: item.file,
          headers: { "Content-Type": item.file.type || "application/octet-stream" },
        }).catch(() => null);

        if (!uploadResponse || !uploadResponse.ok) {
          uploadResponse = await fetch(`/api/proxy-upload?url=${encodeURIComponent(presignedUrl)}`, {
            method: "PUT",
            body: item.file,
            headers: { "Content-Type": item.file.type || "application/octet-stream" },
          });
        }

        if (!uploadResponse.ok) {
          throw new Error(directRes.error || "Gagal mengunggah file ke penyimpanan");
        }

        if (cancelToken.current) break;
        updateItemStatus(item.id, { progress: 85 });

        const result = await saveFileMetadata({
          name: item.file.name,
          folderId: folderId,
          r2ObjectKey: r2ObjectKey,
          mimeType: item.file.type || "application/octet-stream",
          sizeBytes: item.file.size,
        });

        if (!result.success) throw new Error(result.error || "Database error");

        successCount++;
        trackEvent("upload_file", {
          file_name: item.file.name,
          file_size: item.file.size,
          mime_type: item.file.type || "application/octet-stream",
        });
        updateItemStatus(item.id, { status: "success", progress: 100 });
      } catch (err) {
        updateItemStatus(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          progress: 0,
        });
      }
    }

    setIsUploading(false);

    if (!cancelToken.current && successCount > 0) {
      trackEvent("upload_complete", { success_count: successCount, total_items: pendingItems.length });
      toast.success(`${successCount} file berhasil diunggah.`);
      window.dispatchEvent(new CustomEvent("storage-updated"));
      window.dispatchEvent(new CustomEvent("folder-content-updated"));
      if (onSuccess) onSuccess();
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    cancelToken.current = true;
    onClose();
  };

  return {
    uploadItems,
    isUploading,
    isMinimized,
    isCollapsed,
    setIsCollapsed,
    globalError,
    setGlobalError,
    addFiles,
    removeFile,
    handleUpload,
    handleCancel,
  };
}
