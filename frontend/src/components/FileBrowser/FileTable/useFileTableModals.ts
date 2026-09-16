import { useState } from "react";
import {
  deleteItemsBatch,
  getPresignedDownloadUrl,
  downloadZip,
  toggleStar,
  getR2FileUrl,
  getPresignedUploadUrl,
  saveFileMetadata,
  uploadFileDirect,
} from "@/lib/api";
import {
  extractFilesFromZip,
  getMimeTypeFromFileName,
  ensureFolderPath,
} from "@/lib/zipUtils";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";

export interface ExtractedFileItem {
  id: string;
  name: string;
  relativePath?: string;
  folderPath?: string;
  size: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export interface ExtractProgressState {
  isOpen: boolean;
  isCollapsed: boolean;
  archiveName: string;
  archiveSize?: number | string;
  status: "idle" | "downloading" | "unpacking" | "saving" | "success" | "error";
  stageText: string;
  progressPercent: number;
  totalFiles: number;
  completedFiles: number;
  currentFileName: string;
  files: ExtractedFileItem[];
  errorMessage?: string;
}

export function useFileTableModals({
  folderId,
  onNavigate,
  onRefresh,
}: {
  folderId?: string;
  onNavigate?: (id: string) => void;
  onRefresh?: () => void;
}) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<FileItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<ExtractProgressState>({
    isOpen: false,
    isCollapsed: false,
    archiveName: "",
    status: "idle",
    stageText: "",
    progressPercent: 0,
    totalFiles: 0,
    completedFiles: 0,
    currentFileName: "",
    files: [],
  });
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null);
  const [folderToColor, setFolderToColor] = useState<FileItem | null>(null);
  const [shareLinkFile, setShareLinkFile] = useState<FileItem | null>(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileItem | null>(null);
  const [itemsToMove, setItemsToMove] = useState<FileItem[]>([]);
  const [moveModalMode, setMoveModalMode] = useState<"move" | "copy">("move");
  const [localStarredMap, setLocalStarredMap] = useState<Record<string, boolean>>({});

  const handleToggleStar = async (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const current = localStarredMap[item.id] ?? item.isStarred ?? false;
    const next = !current;
    setLocalStarredMap((prev) => ({ ...prev, [item.id]: next }));
    try {
      const res = await toggleStar(item.id, item.type, next);
      if (!res.success) {
        setLocalStarredMap((prev) => ({ ...prev, [item.id]: current }));
        toast.error("Gagal mengubah status bintang");
      }
    } catch {
      setLocalStarredMap((prev) => ({ ...prev, [item.id]: current }));
      toast.error("Terjadi kesalahan saat memberi bintang");
    }
  };

  const handlePreview = (item: FileItem) => {
    if (item.type === "folder") {
      if (onNavigate) onNavigate(item.id);
      return;
    }
    setPreviewFile(item);
    setPreviewLoading(false);
    const key = item.objectKey || item.id;
    const directUrl = getR2FileUrl(key);
    // Tambahkan timestamp dinamis agar peramban selalu mengambil file versi terbaru
    const freshUrl = directUrl
      ? `${directUrl}${directUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
      : null;
    setPreviewUrl(freshUrl);
  };

  const handleDownload = async (item: FileItem) => {
    if (item.type === "folder") {
      toast.info("Menyiapkan unduhan ZIP folder...");
      const res = await downloadZip([{ id: item.id, type: "folder" }]);
      if (res.success && res.blob) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.name}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error("Gagal mengunduh folder");
      }
      return;
    }

    try {
      const key = item.objectKey || item.id;
      const directUrl = getR2FileUrl(key);
      const a = document.createElement("a");
      a.href = directUrl;
      a.download = item.name;
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Fallback ke presigned download URL bila diperlukan
      try {
        const res = await getPresignedDownloadUrl(item.objectKey || item.id, item.name);
        if (res.success && res.presignedUrl) {
          const a = document.createElement("a");
          a.href = res.presignedUrl;
          a.download = item.name;
          a.click();
        }
      } catch {
        toast.error("Gagal mengunduh berkas");
      }
    }
  };

  const handleDeleteConfirm = async (onDoneSelection?: () => void) => {
    if (itemsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      const items = itemsToDelete.map((i) => ({ id: i.id, type: i.type }));
      const res = await deleteItemsBatch(items, folderId || "root");
      if (res.success) {
        toast.success(`Berhasil memindahkan ${itemsToDelete.length} item ke Sampah`);
        setItemsToDelete([]);
        if (onDoneSelection) onDoneSelection();
        window.dispatchEvent(new CustomEvent("folder-content-updated"));
        if (onRefresh) onRefresh();
      } else {
        toast.error("Gagal menghapus item");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menghapus");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseExtractProgress = () => {
    setExtractProgress((prev) => ({ ...prev, isOpen: false }));
  };

  const handleToggleCollapseExtractProgress = () => {
    setExtractProgress((prev) => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  };

  const handleExtractArchive = async (item: FileItem) => {
    if (item.type === "folder") return;

    if (isExtracting) {
      toast.warning("Sedang memproses ekstraksi berkas lain, mohon tunggu sebentar...");
      setExtractProgress((prev) => ({ ...prev, isOpen: true, isCollapsed: false }));
      return;
    }

    const fileNameLower = item.name.toLowerCase();
    const isZip = fileNameLower.endsWith(".zip") || item.mimeType === "application/zip";
    const isRar = fileNameLower.endsWith(".rar") || item.mimeType?.includes("rar");

    if (isRar) {
      toast.info(
        `Arsip "${item.name}" berformat RAR (WinRAR proprietary). Untuk ekstraksi otomatis langsung di sistem web, silakan gunakan arsip berformat .ZIP. Anda dapat mengunduh berkas .RAR ini untuk diekstrak di komputer.`,
        { duration: 7000 }
      );
      return;
    }

    if (!isZip) {
      toast.error(`Format berkas "${item.name}" tidak didukung untuk ekstraksi.`);
      return;
    }

    setIsExtracting(true);
    setExtractProgress({
      isOpen: true,
      isCollapsed: false,
      archiveName: item.name,
      archiveSize: item.rawSizeBytes || item.size,
      status: "downloading",
      stageText: `Mengunduh berkas arsip dari Cloudflare R2...`,
      progressPercent: 12,
      totalFiles: 0,
      completedFiles: 0,
      currentFileName: item.name,
      files: [],
    });

    try {
      // 1. Ambil data blob berkas dari Cloudflare R2
      let blob: Blob | null = null;
      const directUrl = getR2FileUrl(item.objectKey || item.id);
      if (directUrl) {
        try {
          const res = await fetch(directUrl);
          if (res.ok) {
            blob = await res.blob();
          }
        } catch {
          // fallback ke presigned URL
        }
      }

      if (!blob) {
        const presignRes = await getPresignedDownloadUrl(item.objectKey || item.id, item.name);
        if (presignRes.success && presignRes.presignedUrl) {
          const res = await fetch(presignRes.presignedUrl);
          if (res.ok) {
            blob = await res.blob();
          }
        }
      }

      if (!blob) {
        throw new Error("Gagal mengunduh berkas arsip dari penyimpanan Cloudflare R2.");
      }

      // 2. Ekstrak isi berkas dari ZIP secara aman di browser client
      setExtractProgress((prev) => ({
        ...prev,
        status: "unpacking",
        stageText: `Membongkar struktur berkas ZIP di peramban...`,
        progressPercent: 35,
      }));

      const extractRes = await extractFilesFromZip(blob, 100, item.name.replace(/\.zip$/i, ""));

      if (extractRes.items.length === 0) {
        setExtractProgress((prev) => ({
          ...prev,
          status: "error",
          stageText: "Ekstraksi gagal.",
          errorMessage: "Tidak ada berkas dokumen yang ditemukan di dalam arsip ZIP ini.",
          progressPercent: 0,
        }));
        toast.error("Tidak ada berkas dokumen yang ditemukan di dalam arsip ZIP ini.");
        return;
      }

      // 3. Simpan dan unggah berkas hasil ekstraksi ke folder tujuan dan subfolder sesuai hierarki ZIP
      const targetFolderId =
        folderId && folderId !== "root" && folderId !== "undefined" && folderId !== "null" && folderId !== "starred"
          ? folderId
          : "root";

      const folderCache = new Map<string, string>();

      // Buat semua folder dan subfolder di dalam ZIP terlebih dahulu (termasuk folder kosong)
      if (extractRes.directories.length > 0) {
        setExtractProgress((prev) => ({
          ...prev,
          status: "saving",
          stageText: `Menyiapkan ${extractRes.directories.length} folder arsip...`,
          progressPercent: 38,
        }));

        for (const dirPath of extractRes.directories) {
          const segments = dirPath.split("/").filter(Boolean);
          await ensureFolderPath(targetFolderId, segments, folderCache);
        }
      }

      const initialFiles: ExtractedFileItem[] = extractRes.items.map((it, idx) => ({
        id: `ext-${idx}-${Date.now()}`,
        name: it.file.name,
        relativePath: it.relativePath,
        folderPath: it.directoryPath,
        size: it.file.size,
        status: "pending",
      }));

      setExtractProgress((prev) => ({
        ...prev,
        status: "saving",
        stageText: `Menyimpan 0 dari ${extractRes.items.length} berkas ke struktur folder...`,
        progressPercent: 40,
        totalFiles: extractRes.items.length,
        completedFiles: 0,
        files: initialFiles,
      }));

      let successCount = 0;
      for (let i = 0; i < extractRes.items.length; i++) {
        const zipItem = extractRes.items[i];
        const file = zipItem.file;

        // Tentukan folder tujuan berkas berdasarkan hierarki folder di dalam ZIP
        const fileTargetFolderId = await ensureFolderPath(
          targetFolderId,
          zipItem.directorySegments,
          folderCache,
        );

        // Update progress saat mulai mengunggah file ke-i
        setExtractProgress((prev) => {
          const updated = [...prev.files];
          if (updated[i]) updated[i] = { ...updated[i], status: "uploading" };
          const curPct = Math.round(40 + (i / extractRes.items.length) * 58);
          return {
            ...prev,
            progressPercent: curPct,
            completedFiles: i,
            currentFileName: zipItem.relativePath || file.name,
            stageText: `Menyimpan berkas (${i + 1}/${extractRes.items.length}): ${zipItem.relativePath || file.name}`,
            files: updated,
          };
        });

        let uploaded = false;
        const fileExt = file.name.split(".").pop();
        const originalName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const safeName = originalName.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 40);
        const uniqueFileName = `${safeName}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const folderPathSegment = fileTargetFolderId === "root" ? "root" : fileTargetFolderId;
        const filePath = `arsip/global/${folderPathSegment}/${uniqueFileName}`;
        const effectiveMimeType = file.type || getMimeTypeFromFileName(file.name);

        const presignRes = await getPresignedUploadUrl(filePath, effectiveMimeType);
        if (presignRes.success && presignRes.presignedUrl && presignRes.r2ObjectKey) {
          try {
            const putRes = await fetch(presignRes.presignedUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": effectiveMimeType },
            });
            if (putRes.ok) {
              const metaRes = await saveFileMetadata({
                name: file.name,
                folderId: fileTargetFolderId,
                r2ObjectKey: presignRes.r2ObjectKey,
                mimeType: effectiveMimeType,
                sizeBytes: file.size,
              });
              if (metaRes.success) {
                uploaded = true;
                successCount++;
              }
            }
          } catch (err) {
            console.warn("Direct Cloudflare R2 upload gagal saat ekstraksi, mencoba upload direct backend:", err);
          }
        }

        if (!uploaded) {
          const directRes = await uploadFileDirect(file, fileTargetFolderId, file.name);
          if (directRes.success) {
            uploaded = true;
            successCount++;
          }
        }

        // Update progress setelah file ke-i selesai
        setExtractProgress((prev) => {
          const updated = [...prev.files];
          if (updated[i]) updated[i] = { ...updated[i], status: uploaded ? "success" : "error" };
          const curPct = Math.round(40 + ((i + 1) / extractRes.items.length) * 58);
          return {
            ...prev,
            progressPercent: curPct,
            completedFiles: i + 1,
            files: updated,
          };
        });
      }

      if (successCount > 0) {
        setExtractProgress((prev) => ({
          ...prev,
          status: "success",
          stageText: `Selesai! ${successCount} berkas berhasil diekstrak sesuai struktur folder.`,
          progressPercent: 100,
          completedFiles: extractRes.items.length,
          currentFileName: "",
        }));

        toast.success(`Berhasil mengekstrak ${successCount} berkas ke dalam struktur folder.`);
        window.dispatchEvent(new CustomEvent("storage-updated"));
        window.dispatchEvent(new CustomEvent("folder-content-updated"));
        if (onRefresh) onRefresh();
      } else {
        setExtractProgress((prev) => ({
          ...prev,
          status: "error",
          stageText: "Gagal menyimpan berkas.",
          errorMessage: "Tidak ada berkas yang berhasil disimpan ke penyimpanan Cloudflare R2.",
        }));
        toast.error("Gagal menyimpan berkas hasil ekstraksi.");
      }
    } catch (err) {
      console.error("Gagal mengekstrak berkas arsip:", err);
      const msg = err instanceof Error ? err.message : "Gagal mengekstrak berkas arsip.";
      setExtractProgress((prev) => ({
        ...prev,
        status: "error",
        stageText: "Terjadi kesalahan saat mengekstrak.",
        errorMessage: msg,
      }));
      toast.error(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    previewFile,
    setPreviewFile,
    previewUrl,
    setPreviewUrl,
    previewLoading,
    itemsToDelete,
    setItemsToDelete,
    isDeleting,
    isExtracting,
    extractProgress,
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
    handleCloseExtractProgress,
    handleToggleCollapseExtractProgress,
  };
}
