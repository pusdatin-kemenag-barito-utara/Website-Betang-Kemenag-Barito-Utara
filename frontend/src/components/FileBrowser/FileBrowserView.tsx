import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FileTable } from "./FileTable";
import { FileBrowserHeader, type FileSortOption } from "./FileBrowser/FileBrowserHeader";
import { FileFilterChips } from "./FileBrowser/FileFilterChips";
import { FileBrowserModals } from "./FileBrowser/FileBrowserModals";
import type { FileItem } from "@/lib/types";
import { getFolderContents, getBreadcrumbs } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";

interface FileBrowserViewProps {
  folderId: string;
  initialItems: FileItem[];
  breadcrumbs: { id: string; name: string }[];
  userBidangId: string;
  initialSearchQuery?: string;
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return format(d, "d MMM yyyy", { locale: id });
  } catch {
    return "-";
  }
};

const formatFolderContentsToItems = (contents: any): FileItem[] => {
  const folders: any[] = contents?.folders ?? [];
  const files: any[] = contents?.files ?? [];

  return [
    ...(folders || []).map((f: any) => {
      const folderObj = f.folder || f;
      const folderSize = f.total_size || folderObj.total_size || 0;
      const dateVal = folderObj.updated_at || folderObj.created_at;
      return {
        id: folderObj.id,
        name: folderObj.name || "Folder Tanpa Nama",
        type: "folder" as const,
        size: folderSize > 0 ? formatFileSize(folderSize) : "-",
        rawSizeBytes: folderSize,
        updatedAt: formatDate(dateVal),
        rawDate: dateVal,
        createdAt: formatDate(folderObj.created_at),
        isRestricted: folderObj.is_restricted || false,
        isStarred: folderObj.is_starred || false,
        color: folderObj.color || null,
      };
    }),
    ...(files || []).map((f: any) => {
      const dateVal = f.updated_at || f.updatedAt || f.created_at || f.createdAt;
      const sizeBytes = f.size_bytes || f.sizeBytes || 0;
      return {
        id: f.id,
        name: f.name,
        type: "file" as const,
        mimeType: f.mime_type || f.mimeType,
        size: formatFileSize(sizeBytes),
        rawSizeBytes: sizeBytes,
        updatedAt: formatDate(dateVal),
        rawDate: dateVal,
        createdAt: formatDate(f.created_at || f.createdAt),
        uploadedBy: f.uploaded_by || f.uploadedBy,
        isRestricted: f.is_restricted || f.isRestricted || false,
        isStarred: f.is_starred || f.isStarred || false,
        objectKey: f.r2_object_key || f.r2ObjectKey || f.object_key || f.objectKey,
      };
    }),
  ];
};

export function FileBrowserView({
  folderId: initialFolderId,
  initialItems,
  breadcrumbs: initialBreadcrumbs,
  userBidangId,
  initialSearchQuery = "",
}: FileBrowserViewProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string>(initialFolderId || "root");
  const [items, setItems] = useState<FileItem[]>(initialItems);
  const [breadcrumbsList, setBreadcrumbsList] = useState<{ id: string; name: string }[]>(initialBreadcrumbs);
  const [isLoadingFolder, setIsLoadingFolder] = useState<boolean>(false);

  useEffect(() => {
    setCurrentFolderId(initialFolderId || "root");
    setItems(initialItems);
    setBreadcrumbsList(initialBreadcrumbs);
  }, [initialFolderId, initialItems, initialBreadcrumbs]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFolderMode, setIsFolderMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<FileSortOption>("name-asc");
  const [selectedItemForInfo, setSelectedItemForInfo] = useState<FileItem | null>(null);

  // External file drag & drop states
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[] | undefined>(undefined);
  const dragCounter = useRef(0);

  const loadFolder = useCallback(async (targetId: string, pushState = true) => {
    setIsLoadingFolder(true);
    try {
      const [contentsRes, breadcrumbsRes] = await Promise.all([
        getFolderContents(targetId),
        getBreadcrumbs(targetId),
      ]);

      if (contentsRes.success && contentsRes.data) {
        setItems(formatFolderContentsToItems(contentsRes.data));
      } else if (!contentsRes.success) {
        toast.error("Gagal memuat isi folder");
      }

      if (breadcrumbsRes.success && Array.isArray(breadcrumbsRes.data)) {
        setBreadcrumbsList(breadcrumbsRes.data);
      }

      setCurrentFolderId(targetId);

      if (pushState && typeof window !== "undefined") {
        const nextUrl = targetId === "root" ? "/" : `/folders/${targetId}`;
        window.history.pushState({ folderId: targetId }, "", nextUrl);
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan saat memuat folder");
    } finally {
      setIsLoadingFolder(false);
    }
  }, []);

  const handleNavigate = useCallback((targetId: string) => {
    loadFolder(targetId, true);
  }, [loadFolder]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const folderId = e.state?.folderId || "root";
      loadFolder(folderId, false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadFolder]);

  useEffect(() => {
    const handleContentUpdated = () => {
      loadFolder(currentFolderId, false);
    };
    window.addEventListener("folder-content-updated", handleContentUpdated);
    return () => window.removeEventListener("folder-content-updated", handleContentUpdated);
  }, [currentFolderId, loadFolder]);

  // Drag & drop handlers for external files
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      dragCounter.current += 1;
      setIsDragOverWindow(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOverWindow(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOverWindow(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setDroppedFiles(filesArray);
      setIsFolderMode(false);
      setIsUploadOpen(true);
      toast.info(`${filesArray.length} berkas siap diunggah`);
    }
  };

  const sortedAndFilteredItems = useMemo(() => {
    let result = [...items];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }
    if (filterType === "starred") {
      result = result.filter((item) => item.isStarred);
    } else if (filterType === "folder") {
      result = result.filter((item) => item.type === "folder");
    } else if (filterType === "pdf") {
      result = result.filter((item) => item.type === "file" && item.mimeType?.includes("pdf"));
    } else if (filterType === "image") {
      result = result.filter((item) => item.type === "file" && item.mimeType?.includes("image"));
    } else if (filterType === "archive") {
      result = result.filter(
        (item) =>
          item.type === "file" && (item.mimeType?.includes("zip") || item.name.endsWith(".zip")),
      );
    }

    // Apply Sorting: Folder selalu di atas, lalu urutkan sesuai opsi
    return result.sort((a, b) => {
      // Prioritaskan folder selalu di atas
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }

      switch (sortBy) {
        case "name-desc":
          return b.name.localeCompare(a.name, "id-ID", { sensitivity: "base" });
        case "date-desc": {
          const tA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
          const tB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
          return tB - tA;
        }
        case "date-asc": {
          const tA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
          const tB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
          return tA - tB;
        }
        case "size-desc": {
          const sA = a.rawSizeBytes || 0;
          const sB = b.rawSizeBytes || 0;
          return sB - sA;
        }
        case "size-asc": {
          const sA = a.rawSizeBytes || 0;
          const sB = b.rawSizeBytes || 0;
          return sA - sB;
        }
        case "name-asc":
        default:
          return a.name.localeCompare(b.name, "id-ID", { sensitivity: "base" });
      }
    });
  }, [items, searchQuery, filterType, sortBy]);

  return (
    <div
      className="space-y-4 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Dropzone Overlay saat Drag & Drop berkas dari luar */}
      {isDragOverWindow && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-emerald-600/90 text-white backdrop-blur-xs rounded-2xl border-2 border-dashed border-white p-6 animate-in fade-in zoom-in-95 pointer-events-none">
          <UploadCloud className="h-16 w-16 mb-3 animate-bounce" />
          <h3 className="text-base sm:text-lg font-bold">Lepaskan Berkas untuk Mengunggah</h3>
          <p className="text-xs text-emerald-100 mt-1">
            Berkas akan otomatis disiapkan untuk diunggah ke folder ini
          </p>
        </div>
      )}

      <FileBrowserHeader
        breadcrumbsList={breadcrumbsList}
        currentFolderId={currentFolderId}
        searchQuery={searchQuery}
        viewMode={viewMode}
        sortBy={sortBy}
        onSearchChange={setSearchQuery}
        onViewModeChange={setViewMode}
        onSortChange={setSortBy}
        onOpenCreateFolder={() => setIsCreateOpen(true)}
        onOpenUploadFile={() => {
          setIsFolderMode(false);
          setDroppedFiles(undefined);
          setIsUploadOpen(true);
        }}
        onOpenUploadFolder={() => {
          setIsFolderMode(true);
          setDroppedFiles(undefined);
          setIsUploadOpen(true);
        }}
        onNavigateBreadcrumb={handleNavigate}
      />

      <FileFilterChips filterType={filterType} onFilterChange={setFilterType} />

      {isLoadingFolder ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xs font-semibold">Memuat berkas...</span>
        </div>
      ) : (
        <FileTable
          data={sortedAndFilteredItems}
          folderId={currentFolderId}
          onNavigate={handleNavigate}
          onShowInfo={setSelectedItemForInfo}
          onRefresh={() => loadFolder(currentFolderId, false)}
          searchQuery={searchQuery}
          viewMode={viewMode}
        />
      )}

      <FileBrowserModals
        isCreateOpen={isCreateOpen}
        isUploadOpen={isUploadOpen}
        isFolderMode={isFolderMode}
        currentFolderId={currentFolderId}
        userBidangId={userBidangId}
        selectedItemForInfo={selectedItemForInfo}
        initialFiles={droppedFiles}
        onCloseCreate={() => setIsCreateOpen(false)}
        onCloseUpload={() => {
          setIsUploadOpen(false);
          setDroppedFiles(undefined);
        }}
        onCloseInfo={() => setSelectedItemForInfo(null)}
        onSuccessMutation={() => loadFolder(currentFolderId, false)}
      />
    </div>
  );
}