import { useState, useEffect, useCallback, useMemo } from "react";
import { FileTable } from "./FileTable";
import { FileBrowserHeader } from "./FileBrowser/FileBrowserHeader";
import { FileFilterChips } from "./FileBrowser/FileFilterChips";
import { FileBrowserModals } from "./FileBrowser/FileBrowserModals";
import type { FileItem } from "@/lib/types";
import { getFolderContents, getBreadcrumbs } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
      const dateVal = f.updated_at || f.created_at;
      return {
        id: f.id,
        name: f.name,
        type: "file" as const,
        mimeType: f.mime_type,
        size: formatFileSize(f.size_bytes),
        rawSizeBytes: f.size_bytes,
        updatedAt: formatDate(dateVal),
        rawDate: dateVal,
        createdAt: formatDate(f.created_at),
        uploadedBy: f.uploaded_by,
        isRestricted: f.is_restricted || false,
        isStarred: f.is_starred || false,
        objectKey: f.r2_object_key,
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
  const [selectedItemForInfo, setSelectedItemForInfo] = useState<FileItem | null>(null);

  const loadFolder = useCallback(async (targetId: string, pushState = true) => {
    setIsLoadingFolder(true);
    try {
      const [contentsRes, breadcrumbsRes] = await Promise.all([
        getFolderContents(targetId),
        getBreadcrumbs(targetId),
      ]);

      if (contentsRes.success && contentsRes.data) {
        setItems(formatFolderContentsToItems(contentsRes.data));
      } else {
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

  const filteredItems = useMemo(() => {
    let result = items;
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
    return result;
  }, [items, searchQuery, filterType]);

  return (
    <div className="space-y-4">
      <FileBrowserHeader
        breadcrumbsList={breadcrumbsList}
        currentFolderId={currentFolderId}
        searchQuery={searchQuery}
        viewMode={viewMode}
        onSearchChange={setSearchQuery}
        onViewModeChange={setViewMode}
        onOpenCreateFolder={() => setIsCreateOpen(true)}
        onOpenUploadFile={() => {
          setIsFolderMode(false);
          setIsUploadOpen(true);
        }}
        onOpenUploadFolder={() => {
          setIsFolderMode(true);
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
          data={filteredItems}
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
        onCloseCreate={() => setIsCreateOpen(false)}
        onCloseUpload={() => setIsUploadOpen(false)}
        onCloseInfo={() => setSelectedItemForInfo(null)}
        onSuccessMutation={() => loadFolder(currentFolderId, false)}
      />
    </div>
  );
}