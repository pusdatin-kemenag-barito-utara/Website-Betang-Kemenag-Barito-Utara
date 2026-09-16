import { useState, useRef, useEffect, useCallback } from "react";
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

export const MAX_UPLOAD_FILES = 1000;

export interface UploadItem {
  id: string;
  file: File;
  targetFolderId: string;
  targetFolderName?: string;
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
  const uploadItemsRef = useRef<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const cancelToken = useRef(false);

  // Sinkronisasi ref dengan state uploadItems
  useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

  useEffect(() => {
    if (!isOpen && !isUploading && !isMinimized) {
      const timer = setTimeout(() => {
        setUploadItems([]);
        uploadItemsRef.current = [];
        setIsUploading(false);
        isUploadingRef.current = false;
        setIsUnpacking(false);
        setIsMinimized(false);
        setIsCollapsed(false);
        setGlobalError("");
        cancelToken.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isUploading, isMinimized]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__BETANG_IS_UPLOADING__ = isUploading;
    }
    return () => {
      if (typeof window !== "undefined") {
        (window as any).__BETANG_IS_UPLOADING__ = false;
      }
    };
  }, [isUploading]);

  const updateItemStatus = useCallback((id: string, updates: Partial<UploadItem>) => {
    uploadItemsRef.current = uploadItemsRef.current.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setUploadItems([...uploadItemsRef.current]);
  }, []);

  const unpackZipItem = async (itemId: string, file: File) => {
    setIsUnpacking(true);
    const toastId = toast.loading(`Mengekstrak "${file.name}"...`);
    try {
      const result = await extractFilesFromZip(file, MAX_UPLOAD_FILES);
      if (result.items.length === 0) {
        toast.error("Tidak ada berkas dokumen yang ditemukan di dalam arsip ZIP.", { id: toastId });
        return;
      }

      const prevItem = uploadItemsRef.current.find((i) => i.id === itemId);
      const targetFId = prevItem?.targetFolderId || folderId;
      const targetFName = prevItem?.targetFolderName;

      setUploadItems((prev) => {
        const filtered = prev.filter((i) => i.id !== itemId);
        const newItems: UploadItem[] = result.items.map((extracted) => ({
          id: Math.random().toString(36).substring(2, 9) + Date.now() + Math.random().toString(36).substring(2, 5),
          file: extracted.file,
          targetFolderId: targetFId,
          targetFolderName: targetFName,
          relativePath: extracted.relativePath,
          directorySegments: extracted.directorySegments,
          progress: 0,
          status: "pending",
        }));
        const combined = [...filtered, ...newItems];
        if (combined.length > MAX_UPLOAD_FILES) {
          setGlobalError(`Maksimal ${MAX_UPLOAD_FILES} file dapat diunggah sekaligus.`);
          return combined.slice(0, MAX_UPLOAD_FILES);
        }
        return combined;
      });

      if (result.skippedCount > 0) {
        toast.warning(
          `Berhasil mengekstrak ${result.items.length} berkas. ${result.skippedCount} berkas dilewati karena batas ${MAX_UPLOAD_FILES} berkas.`,
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
    const zipItems = uploadItemsRef.current.filter((i) => isZipFile(i.file));
    if (zipItems.length === 0) return;

    setIsUnpacking(true);
    const toastId = toast.loading(`Mengekstrak ${zipItems.length} berkas arsip ZIP...`);
    try {
      let totalExtracted: ExtractedZipItem[] = [];
      const zipItemIds = new Set(zipItems.map((i) => i.id));

      for (const zipItem of zipItems) {
        const remainingQuota = MAX_UPLOAD_FILES - (uploadItemsRef.current.length - zipItems.length) - totalExtracted.length;
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
          targetFolderId: folderId,
          relativePath: extracted.relativePath,
          directorySegments: extracted.directorySegments,
          progress: 0,
          status: "pending",
        }));
        const combined = [...nonZips, ...newItems];
        if (combined.length > MAX_UPLOAD_FILES) {
          setGlobalError(`Maksimal ${MAX_UPLOAD_FILES} file dapat diunggah sekaligus.`);
          return combined.slice(0, MAX_UPLOAD_FILES);
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

  /**
   * Menambahkan berkas ke antrean unggah.
   * Jika autoStart bernilai true atau proses upload sedang aktif, berkas langsung mengalir ke antrean dinamis.
   */
  const addFiles = useCallback(
    (
      newFiles: File[],
      overrideFolderId?: string,
      overrideFolderName?: string,
      autoStart?: boolean
    ) => {
      // Abaikan berkas sampah sistem seperti desktop.ini, thumbs.db, .DS_Store
      let filteredFiles = newFiles.filter((file) => {
        const lowerName = file.name.toLowerCase();
        return (
          lowerName !== "desktop.ini" &&
          lowerName !== "thumbs.db" &&
          lowerName !== ".ds_store" &&
          !lowerName.startsWith("._")
        );
      });

      const currentCount = uploadItemsRef.current.length;
      if (currentCount + filteredFiles.length > MAX_UPLOAD_FILES) {
        setGlobalError(`Maksimal ${MAX_UPLOAD_FILES} file dapat diunggah sekaligus.`);
        filteredFiles = filteredFiles.slice(0, Math.max(0, MAX_UPLOAD_FILES - currentCount));
      } else {
        setGlobalError("");
      }

      if (filteredFiles.length === 0) return;

      const items: UploadItem[] = filteredFiles.map((file) => {
        const customRelPath = (file as any).relativePath || (file as any).customRelativePath;
        const rawRelPath = customRelPath || file.webkitRelativePath || "";
        const cleanRelPath = rawRelPath.replace(/^[/\\]+/, "").replace(/\\/g, "/").trim();
        const parts = cleanRelPath ? cleanRelPath.split("/").filter(Boolean) : [];
        const directorySegments =
          (file as any).directorySegments ||
          (parts.length > 1 ? parts.slice(0, parts.length - 1) : undefined);

        return {
          id: Math.random().toString(36).substring(2, 9) + Date.now() + Math.random().toString(36).substring(2, 5),
          file,
          targetFolderId: overrideFolderId || folderId,
          targetFolderName: overrideFolderName,
          relativePath: cleanRelPath || undefined,
          directorySegments,
          progress: 0,
          status: "pending",
        };
      });

      uploadItemsRef.current = [...uploadItemsRef.current, ...items];
      setUploadItems([...uploadItemsRef.current]);

      // Jika autoStart aktif atau proses upload sedang berlangsung, pastikan worker antrean berjalan
      if (autoStart && !isUploadingRef.current) {
        setTimeout(() => {
          processQueue();
        }, 50);
      }
    },
    [folderId]
  );

  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0 && uploadItems.length === 0) {
      const timer = setTimeout(() => addFiles(initialFiles), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialFiles, addFiles]);

  const removeFile = (id: string) => {
    uploadItemsRef.current = uploadItemsRef.current.filter((item) => item.id !== id);
    setUploadItems([...uploadItemsRef.current]);
  };

  /**
   * Worker pemroses antrean unggah dinamis (FIFO Queue Loop).
   * Loop while akan terus berjalan selama masih ada item pending di dalam uploadItemsRef,
   * sehingga berkas baru yang ditambahkan di tengah-tengah upload akan otomatis diproses berikutnya.
   */
  const processQueue = async () => {
    if (isUploadingRef.current) return;

    // Pastikan ada item yang perlu diunggah
    const hasPending = uploadItemsRef.current.some(
      (i) => i.status === "pending" || i.status === "error"
    );
    if (!hasPending) return;

    // Reset error items menjadi pending untuk percobaan ulang
    uploadItemsRef.current = uploadItemsRef.current.map((item) =>
      item.status === "error"
        ? { ...item, status: "pending" as FileStatus, progress: 0, error: undefined }
        : item
    );
    setUploadItems([...uploadItemsRef.current]);

    isUploadingRef.current = true;
    setIsUploading(true);
    setIsMinimized(true);
    setIsCollapsed(false);
    cancelToken.current = false;
    setGlobalError("");

    trackEvent("upload_start", {
      total_items: uploadItemsRef.current.length,
      folder_id: folderId,
    });

    const folderCache = new Map<string, string>();
    let successCount = 0;

    try {
      while (!cancelToken.current) {
        // Ambil berkas antrean pertama yang berstatus "pending"
        const currentItem = uploadItemsRef.current.find((i) => i.status === "pending");
        if (!currentItem) {
          // Antrean habis atau semua telah selesai
          break;
        }

        updateItemStatus(currentItem.id, {
          status: "uploading",
          progress: 20,
          error: undefined,
        });

        try {
          const baseFolderId = currentItem.targetFolderId || folderId;
          const targetUploadFolderId =
            currentItem.directorySegments && currentItem.directorySegments.length > 0
              ? await ensureFolderPath(baseFolderId, currentItem.directorySegments, folderCache)
              : baseFolderId;

          const fileExt = currentItem.file.name.split(".").pop();
          const originalName =
            currentItem.file.name.substring(0, currentItem.file.name.lastIndexOf(".")) ||
            currentItem.file.name;
          const safeName = originalName.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 40);
          const fileName = `${safeName}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const folderPathSegment = targetUploadFolderId === "root" ? "root" : targetUploadFolderId;
          const filePath = `arsip/global/${folderPathSegment}/${fileName}`;

          let uploadedViaR2 = false;
          const effectiveMimeType = isZipFile(currentItem.file)
            ? "application/zip"
            : (currentItem.file.type || getMimeTypeFromFileName(currentItem.file.name));

          const presignRes = await getPresignedUploadUrl(filePath, effectiveMimeType);

          if (presignRes.success && presignRes.presignedUrl && presignRes.r2ObjectKey) {
            updateItemStatus(currentItem.id, { progress: 50 });
            if (cancelToken.current) break;

            try {
              const uploadResponse = await fetch(presignRes.presignedUrl, {
                method: "PUT",
                body: currentItem.file,
                headers: { "Content-Type": effectiveMimeType },
              });

              if (uploadResponse.ok) {
                updateItemStatus(currentItem.id, { progress: 85 });
                if (cancelToken.current) break;

                const metaRes = await saveFileMetadata({
                  name: currentItem.file.name,
                  folderId: targetUploadFolderId,
                  r2ObjectKey: presignRes.r2ObjectKey,
                  mimeType: effectiveMimeType,
                  sizeBytes: currentItem.file.size,
                });

                if (metaRes.success) {
                  uploadedViaR2 = true;
                  successCount++;
                  trackEvent("upload_file", {
                    file_name: currentItem.file.name,
                    file_size: currentItem.file.size,
                    mime_type: effectiveMimeType,
                  });
                  updateItemStatus(currentItem.id, { status: "success", progress: 100 });
                  continue;
                }
              }
            } catch (r2Err) {
              console.warn("Direct Cloudflare R2 upload gagal, beralih ke backend upload:", r2Err);
            }
          }

          // 2. Fallback: Direct Multipart Upload melalui backend Go
          if (!uploadedViaR2) {
            updateItemStatus(currentItem.id, { progress: 60 });
            const directRes = await uploadFileDirect(
              currentItem.file,
              targetUploadFolderId,
              currentItem.file.name
            );
            if (!directRes.success) {
              throw new Error(directRes.error || "Gagal mengunggah berkas ke penyimpanan Cloudflare R2.");
            }
            successCount++;
            trackEvent("upload_file", {
              file_name: currentItem.file.name,
              file_size: currentItem.file.size,
              mime_type: effectiveMimeType,
            });
            updateItemStatus(currentItem.id, { status: "success", progress: 100 });
          }
        } catch (err) {
          updateItemStatus(currentItem.id, {
            status: "error",
            error: err instanceof Error ? err.message : String(err),
            progress: 0,
          });
        }
      }
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);

      if (!cancelToken.current && successCount > 0) {
        trackEvent("upload_complete", { success_count: successCount });
        toast.success(`${successCount} berkas berhasil diunggah.`);
        window.dispatchEvent(new CustomEvent("storage-updated"));
        window.dispatchEvent(new CustomEvent("folder-content-updated"));
        if (onSuccess) onSuccess();
      }
    }
  };

  const handleUpload = () => {
    processQueue();
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    cancelToken.current = true;
    isUploadingRef.current = false;
    setIsUploading(false);
    setIsMinimized(false);
    setUploadItems([]);
    uploadItemsRef.current = [];
    onClose();
  };

  const dismiss = () => {
    cancelToken.current = true;
    isUploadingRef.current = false;
    setIsUploading(false);
    setIsMinimized(false);
    setUploadItems([]);
    uploadItemsRef.current = [];
    onClose();
  };

  return {
    uploadItems,
    isUploading,
    isUnpacking,
    unpackZipItem,
    unpackAllZips,
    isMinimized,
    setIsMinimized,
    isCollapsed,
    setIsCollapsed,
    globalError,
    setGlobalError,
    addFiles,
    removeFile,
    handleUpload,
    handleCancel,
    dismiss,
  };
}
