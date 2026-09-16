import { useState, useRef, useEffect } from "react";
import { saveFileMetadata, getPresignedUploadUrl, uploadFileDirect } from "@/lib/api";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import {
  extractFilesFromZip,
  isZipFile,
  getMimeTypeFromFileName,
  ensureFolderPath,
  type ExtractedZipItem,
} from "@/lib/zipUtils";

export type FileStatus = "pending" | "uploading" | "success" | "error";

export interface UploadItem {
  id: string;
  file: File;
  relativePath?: string;
  directorySegments?: string[];
  progress: number;
  status: FileStatus;
  error?: string;
}

export function useUploadManager({
  isOpen,
  folderId,
  userBidangId: _userBidangId,
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
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const cancelToken = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setUploadItems([]);
        setIsUploading(false);
        setIsUnpacking(false);
        setIsMinimized(false);
        setIsCollapsed(false);
        setGlobalError("");
        cancelToken.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const unpackZipItem = async (itemId: string, file: File) => {
    setIsUnpacking(true);
    const toastId = toast.loading(`Mengekstrak "${file.name}"...`);
    try {
      const result = await extractFilesFromZip(file, 100);
      if (result.items.length === 0) {
        toast.error("Tidak ada berkas dokumen yang ditemukan di dalam arsip ZIP.", { id: toastId });
        return;
      }

      setUploadItems((prev) => {
        const filtered = prev.filter((i) => i.id !== itemId);
        const newItems: UploadItem[] = result.items.map((extracted) => ({
          id: Math.random().toString(36).substring(2, 9) + Date.now() + Math.random().toString(36).substring(2, 5),
          file: extracted.file,
          relativePath: extracted.relativePath,
          directorySegments: extracted.directorySegments,
          progress: 0,
          status: "pending",
        }));
        const combined = [...filtered, ...newItems];
        if (combined.length > 100) {
          setGlobalError("Maksimal 100 file dapat diunggah sekaligus.");
          return combined.slice(0, 100);
        }
        return combined;
      });

      if (result.skippedCount > 0) {
        toast.warning(
          `Berhasil mengekstrak ${result.items.length} berkas. ${result.skippedCount} berkas dilewati karena batas 100 berkas.`,
          { id: toastId }
        );
      } else {
        toast.success(`Berhasil mengekstrak ${result.items.length} berkas dari "${file.name}".`, { id: toastId });
      }
    } catch (err) {
      console.error("Gagal mengekstrak berkas ZIP:", err);
      toast.error("Gagal mengekstrak berkas ZIP. Pastikan arsip tidak rusak atau berpassword.", { id: toastId });
    } finally {
      setIsUnpacking(false);
    }
  };

  const unpackAllZips = async () => {
    const zipItems = uploadItems.filter((i) => isZipFile(i.file));
    if (zipItems.length === 0) return;

    setIsUnpacking(true);
    const toastId = toast.loading(`Mengekstrak ${zipItems.length} berkas arsip ZIP...`);
    try {
      let totalExtracted: ExtractedZipItem[] = [];
      const zipItemIds = new Set(zipItems.map((i) => i.id));

      for (const zipItem of zipItems) {
        const remainingQuota = 100 - (uploadItems.length - zipItems.length) - totalExtracted.length;
        if (remainingQuota <= 0) break;
        const result = await extractFilesFromZip(zipItem.file, remainingQuota);
        totalExtracted.push(...result.items);
      }

      if (totalExtracted.length === 0) {
        toast.error("Tidak ada berkas dokumen yang ditemukan di dalam arsip ZIP.", { id: toastId });
        return;
      }

      setUploadItems((prev) => {
        const nonZips = prev.filter((i) => !zipItemIds.has(i.id));
        const newItems: UploadItem[] = totalExtracted.map((extracted) => ({
          id: Math.random().toString(36).substring(2, 9) + Date.now() + Math.random().toString(36).substring(2, 5),
          file: extracted.file,
          relativePath: extracted.relativePath,
          directorySegments: extracted.directorySegments,
          progress: 0,
          status: "pending",
        }));
        const combined = [...nonZips, ...newItems];
        if (combined.length > 100) {
          setGlobalError("Maksimal 100 file dapat diunggah sekaligus.");
          return combined.slice(0, 100);
        }
        return combined;
      });

      toast.success(`Berhasil mengekstrak total ${totalExtracted.length} berkas dari arsip ZIP.`, { id: toastId });
    } catch (err) {
      console.error("Gagal mengekstrak berkas ZIP:", err);
      toast.error("Gagal mengekstrak sebagian berkas ZIP.", { id: toastId });
    } finally {
      setIsUnpacking(false);
    }
  };

  const addFiles = (newFiles: File[]) => {
    if (uploadItems.length + newFiles.length > 100) {
      setGlobalError("Maksimal 100 file dapat diunggah sekaligus.");
      newFiles = newFiles.slice(0, 100 - uploadItems.length);
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

    const folderCache = new Map<string, string>();

    for (const item of pendingItems) {
      if (cancelToken.current) break;
      updateItemStatus(item.id, { status: "uploading", progress: 20, error: undefined });

      try {
        // Tentukan folder tujuan jika berkas memiliki hierarki subfolder dari ZIP
        const targetUploadFolderId =
          item.directorySegments && item.directorySegments.length > 0
            ? await ensureFolderPath(folderId, item.directorySegments, folderCache)
            : folderId;

        // 1. Prioritaskan Direct Upload Langsung ke Cloudflare R2 via Presigned PUT
        const fileExt = item.file.name.split(".").pop();
        const originalName = item.file.name.substring(0, item.file.name.lastIndexOf(".")) || item.file.name;
        const safeName = originalName.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 40);
        const fileName = `${safeName}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const folderPathSegment = targetUploadFolderId === "root" ? "root" : targetUploadFolderId;
        const filePath = `arsip/global/${folderPathSegment}/${fileName}`;

        let uploadedViaR2 = false;

        const effectiveMimeType = isZipFile(item.file)
          ? "application/zip"
          : (item.file.type || getMimeTypeFromFileName(item.file.name));

        const presignRes = await getPresignedUploadUrl(filePath, effectiveMimeType);

        if (presignRes.success && presignRes.presignedUrl && presignRes.r2ObjectKey) {
          updateItemStatus(item.id, { progress: 50 });
          if (cancelToken.current) break;

          try {
            const uploadResponse = await fetch(presignRes.presignedUrl, {
              method: "PUT",
              body: item.file,
              headers: { "Content-Type": effectiveMimeType },
            });

            if (uploadResponse.ok) {
              updateItemStatus(item.id, { progress: 85 });
              if (cancelToken.current) break;

              const metaRes = await saveFileMetadata({
                name: item.file.name,
                folderId: targetUploadFolderId,
                r2ObjectKey: presignRes.r2ObjectKey,
                mimeType: effectiveMimeType,
                sizeBytes: item.file.size,
              });

              if (metaRes.success) {
                uploadedViaR2 = true;
                successCount++;
                trackEvent("upload_file", {
                  file_name: item.file.name,
                  file_size: item.file.size,
                  mime_type: effectiveMimeType,
                });
                updateItemStatus(item.id, { status: "success", progress: 100 });
                continue;
              }
            }
          } catch (r2Err) {
            console.warn("Direct Cloudflare R2 upload gagal, beralih ke backend upload:", r2Err);
          }
        }

        // 2. Fallback: Direct Multipart Upload melalui backend Go
        if (!uploadedViaR2) {
          updateItemStatus(item.id, { progress: 60 });
          const directRes = await uploadFileDirect(item.file, targetUploadFolderId, item.file.name);
          if (!directRes.success) {
            throw new Error(directRes.error || "Gagal mengunggah berkas ke penyimpanan Cloudflare R2.");
          }
          successCount++;
          trackEvent("upload_file", {
            file_name: item.file.name,
            file_size: item.file.size,
            mime_type: effectiveMimeType,
          });
          updateItemStatus(item.id, { status: "success", progress: 100 });
        }
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
    isUnpacking,
    unpackZipItem,
    unpackAllZips,
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
