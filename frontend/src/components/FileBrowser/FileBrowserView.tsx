// View utama File Browser: breadcrumb, pencarian, filter, dan daftar file.
// Mendukung navigasi instan klien (Client-Side Navigation seperti Google Drive).
import { useState, useEffect, useCallback } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileTable } from "./FileTable";
import { FileDetailsPanel } from "./FileDetailsPanel";
import { CreateFolderModal } from "./CreateFolderModal";
import { UploadFileModal } from "./UploadFileModal";
import type { FileItem } from "@/lib/types";
import {
  trackSearch,
  trackFilterChange,
  trackInteraction,
  trackModal,
  trackEvent,
} from "@/lib/analytics";
import { getFolderContents, getBreadcrumbs } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import {
  Search,
  LayoutGrid,
  List,
  Info,
  X,
  FileText,
  Image as ImageIcon,
  Folder as FolderIcon,
  SlidersHorizontal,
  Filter,
  Plus,
  FileUp,
  FolderUp,
  Loader2,
  Star,
  FileArchive,
} from "lucide-react";
import { ModernSelect } from "@/components/ui/ModernSelect";

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
      const folderSize = f.total_size || 0;
      const dateVal = f.updated_at || f.created_at;
      return {
        id: f.id,
        name: f.name,
        type: "folder" as const,
        size: folderSize > 0 ? formatFileSize(folderSize) : "-",
        rawSizeBytes: folderSize,
        updatedAt: formatDate(dateVal),
        rawDate: dateVal,
        createdAt: formatDate(f.created_at),
        isRestricted: f.is_restricted || false,
        isStarred: f.is_starred || false,
        color: f.color || null,
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [externalFiles, setExternalFiles] = useState<File[]>([]);
  const [selectedInfoItem, setSelectedInfoItem] = useState<FileItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Filter pencarian lanjutan
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");

  // Menu "Baru +"
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isFolderUploadMode, setIsFolderUploadMode] = useState(false);

  // Navigasi Instan ke folder tujuan tanpa reload halaman
  const navigateFolder = useCallback(
    async (targetId: string, q = "", pushState = true) => {
      const cleanTargetId = targetId || "root";
      setIsLoadingFolder(true);
      setCurrentFolderId(cleanTargetId);

      if (pushState) {
        const url = `/folders/${cleanTargetId}${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        window.history.pushState({ folderId: cleanTargetId, q }, "", url);
      }

      try {
        const [contentsRes, breadcrumbsRes] = await Promise.all([
          getFolderContents(cleanTargetId, q),
          getBreadcrumbs(cleanTargetId),
        ]);

        if (contentsRes.success && contentsRes.data) {
          setItems(formatFolderContentsToItems(contentsRes.data));
        }
        if (breadcrumbsRes.success && breadcrumbsRes.data) {
          setBreadcrumbsList(breadcrumbsRes.data);
        }
      } catch (err) {
        console.error("Failed to load folder:", err);
        toast.error("Gagal memuat isi folder.");
      } finally {
        setIsLoadingFolder(false);
      }
    },
    [],
  );

  // Fungsi refresh in-place saat ada perubahan item
  const refreshCurrentFolder = useCallback(() => {
    navigateFolder(currentFolderId, searchQuery, false);
  }, [currentFolderId, searchQuery, navigateFolder]);

  // Listener navigasi Back / Forward browser
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/folders\/([^/]+)/);
      const targetId = match ? match[1] : "root";
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || "";
      setSearchQuery(q);
      navigateFolder(targetId, q, false);
    };

    const handleContentUpdated = () => {
      refreshCurrentFolder();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("folder-content-updated", handleContentUpdated);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("folder-content-updated", handleContentUpdated);
    };
  }, [navigateFolder, refreshCurrentFolder]);

  // Debounce pencarian global bila query berubah
  useEffect(() => {
    if (searchQuery === initialSearchQuery) return;
    const timer = setTimeout(() => {
      trackSearch(searchQuery, items.length, currentFolderId);
      const url = `/folders/${currentFolderId}${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`;
      window.history.replaceState({ folderId: currentFolderId, q: searchQuery }, "", url);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, currentFolderId, initialSearchQuery, items.length]);

  const handleFilesDrop = (files: File[]) => {
    setExternalFiles(files);
    setIsUploadOpen(true);
  };

  // Filter client-side
  const filteredItems = items.filter((item) => {
    if (filterType === "starred") return item.isStarred === true;
    if (filterType === "folder") return item.type === "folder";
    if (filterType === "image") return item.type === "file" && item.mimeType?.startsWith("image/");
    if (filterType === "pdf") return item.type === "file" && item.mimeType === "application/pdf";
    if (filterType === "zip") return item.type === "file" && (item.mimeType?.includes("zip") || item.name.endsWith(".zip"));
    if (filterType === "document") {
      return (
        item.type === "file" &&
        (item.name.endsWith(".doc") ||
          item.name.endsWith(".docx") ||
          item.name.endsWith(".xls") ||
          item.name.endsWith(".xlsx") ||
          item.name.endsWith(".ppt") ||
          item.name.endsWith(".pptx"))
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3 sm:gap-4 relative">
      {/* Top Header Card */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 min-w-0 relative z-20">
        {isLoadingFolder && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-2xl sm:rounded-t-3xl animate-pulse z-20" />
        )}

        <Breadcrumbs
          items={breadcrumbsList}
          currentFolderId={currentFolderId}
          onNavigate={(id) => navigateFolder(id, "")}
          onRefresh={refreshCurrentFolder}
        />

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Cari berkas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 sm:h-10 w-full sm:w-[240px] rounded-lg sm:rounded-xl border-0 bg-slate-50 dark:bg-slate-800 pl-9 pr-9 sm:pl-10 sm:pr-10 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-700 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                isFilterOpen || filterType !== "all" || filterDate !== "all"
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title="Filter Lanjutan"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-xl ring-1 ring-slate-100 dark:ring-slate-800 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-emerald-600" />
                    Filter Pencarian
                  </h4>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2 block">
                      Tipe File
                    </label>
                    <ModernSelect
                      value={filterType}
                      onChange={(value) => {
                        setFilterType(value);
                        trackFilterChange("file_type", value);
                      }}
                      triggerClassName="w-full rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 text-sm font-medium text-slate-700 py-2 px-3 hover:bg-slate-100"
                      options={[
                        { value: "all", label: "Semua Tipe" },
                        { value: "folder", label: "Hanya Folder" },
                        { value: "image", label: "Gambar (JPG, PNG)" },
                        { value: "pdf", label: "PDF Document" },
                        { value: "document", label: "Office (Word, Excel, PPT)" },
                        { value: "zip", label: "Arsip ZIP" },
                        { value: "starred", label: "⭐ Berbintang" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2 block">
                      Waktu Perubahan
                    </label>
                    <ModernSelect
                      value={filterDate}
                      onChange={(value) => {
                        setFilterDate(value);
                        trackFilterChange("date_range", value);
                      }}
                      triggerClassName="w-full rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 text-sm font-medium text-slate-700 py-2 px-3 hover:bg-slate-100"
                      options={[
                        { value: "all", label: "Kapan Saja" },
                        { value: "today", label: "Hari Ini" },
                        { value: "7days", label: "7 Hari Terakhir" },
                        { value: "30days", label: "30 Hari Terakhir" },
                      ]}
                    />
                  </div>

                  {(filterType !== "all" || filterDate !== "all") && (
                    <button
                      onClick={() => {
                        setFilterType("all");
                        setFilterDate("all");
                        trackEvent("reset_filters");
                      }}
                      className="w-full py-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors mt-2"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-3">
            {/* View Mode & Details Toggle */}
            <div className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 p-1 ring-1 ring-slate-200 dark:ring-slate-700">
              <button
                onClick={() => {
                  setViewMode("list");
                  trackInteraction("list_view", "button", "view_mode");
                }}
                className={`rounded-md sm:rounded-lg p-1.5 sm:p-2 transition-all ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Tampilan Tabel (List View)"
              >
                <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => {
                  setViewMode("grid");
                  trackInteraction("grid_view", "button", "view_mode");
                }}
                className={`rounded-md sm:rounded-lg p-1.5 sm:p-2 transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Tampilan Kisi (Grid View)"
              >
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <button
                onClick={() => {
                  setIsDetailsOpen(!isDetailsOpen);
                  if (!isDetailsOpen && !selectedInfoItem && filteredItems.length > 0) {
                    setSelectedInfoItem(filteredItems[0]);
                  }
                  trackInteraction("toggle_details", "button", "info_panel");
                }}
                className={`rounded-md sm:rounded-lg p-1.5 sm:p-2 transition-all ${
                  isDetailsOpen
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-300 dark:ring-emerald-800"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Rincian Item (ⓘ)"
              >
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNewMenuOpen(!isNewMenuOpen);
                }}
                className="flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-emerald-600 px-4 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 ring-1 ring-emerald-500 cursor-pointer"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                Baru
              </button>

              {/* Dropdown Menu Baru */}
              {isNewMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsNewMenuOpen(false);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 z-50 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        trackModal("create_folder_modal", "open");
                        setIsCreateOpen(true);
                        setIsNewMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                    >
                      <FolderIcon className="h-4 w-4 text-emerald-600" />
                      Folder baru
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        trackModal("upload_file_modal", "open", { mode: "file" });
                        setIsFolderUploadMode(false);
                        setIsUploadOpen(true);
                        setIsNewMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                    >
                      <FileUp className="h-4 w-4 text-emerald-600" />
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        trackModal("upload_file_modal", "open", { mode: "folder" });
                        setIsFolderUploadMode(true);
                        setIsUploadOpen(true);
                        setIsNewMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                    >
                      <FolderUp className="h-4 w-4 text-emerald-600" />
                      Upload folder
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filter Chips (Google Drive Style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
        {[
          { id: "all", label: "Semua", icon: null },
          { id: "starred", label: "⭐ Berbintang", icon: Star },
          { id: "folder", label: "Folder", icon: FolderIcon },
          { id: "pdf", label: "PDF", icon: FileText },
          { id: "image", label: "Gambar", icon: ImageIcon },
          { id: "document", label: "Word / Excel", icon: FileText },
          { id: "zip", label: "Arsip ZIP", icon: FileArchive },
        ].map((chip) => {
          const isActive = filterType === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => {
                setFilterType(isActive && chip.id !== "all" ? "all" : chip.id);
                trackFilterChange("quick_chip", chip.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
                isActive
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
              }`}
            >
              {chip.icon && <chip.icon className="w-3.5 h-3.5" />}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area: Table + Sliding Details Panel */}
      <div className="flex items-start gap-4 h-full relative min-w-0">
        <div className="flex-1 min-w-0 transition-all duration-300">
          <div className="relative">
            {isLoadingFolder && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 rounded-3xl flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-2xl shadow-lg ring-1 ring-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700">Memuat berkas...</span>
                </div>
              </div>
            )}
            <FileTable
              data={filteredItems}
              onNavigate={(id) => navigateFolder(id, "")}
              onFilesDrop={handleFilesDrop}
              onShowInfo={(item) => {
                setSelectedInfoItem(item);
                setIsDetailsOpen(true);
              }}
              onRefresh={refreshCurrentFolder}
              folderId={currentFolderId}
              searchQuery={searchQuery}
              viewMode={viewMode}
              filterType={filterType}
              filterDate={filterDate}
            />
          </div>
        </div>

        {/* Right Info & Details Panel */}
        {isDetailsOpen && (
          <FileDetailsPanel
            isOpen={isDetailsOpen}
            item={selectedInfoItem || (filteredItems.length > 0 ? filteredItems[0] : null)}
            onClose={() => setIsDetailsOpen(false)}
            onToggleStar={() => {
              refreshCurrentFolder();
            }}
          />
        )}
      </div>

      <CreateFolderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        parentId={currentFolderId}
        onSuccess={refreshCurrentFolder}
      />

      <UploadFileModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setExternalFiles([]);
          setIsFolderUploadMode(false);
        }}
        folderId={currentFolderId}
        userBidangId={userBidangId}
        initialFiles={externalFiles}
        isFolderMode={isFolderUploadMode}
        onSuccess={refreshCurrentFolder}
      />
    </div>
  );
}