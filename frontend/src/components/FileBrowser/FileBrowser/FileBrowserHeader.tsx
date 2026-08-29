import { useState, useRef, useEffect } from "react";
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  FileUp,
  FolderUp,
  FolderPlus,
  ChevronDown,
  X,
} from "lucide-react";
import { Breadcrumbs } from "../Breadcrumbs";

interface FileBrowserHeaderProps {
  breadcrumbsList: { id: string; name: string }[];
  currentFolderId: string;
  searchQuery: string;
  viewMode: "list" | "grid";
  onSearchChange: (q: string) => void;
  onViewModeChange: (mode: "list" | "grid") => void;
  onOpenCreateFolder: () => void;
  onOpenUploadFile: () => void;
  onOpenUploadFolder: () => void;
  onNavigateBreadcrumb: (id: string) => void;
}

export function FileBrowserHeader({
  breadcrumbsList,
  currentFolderId,
  searchQuery,
  viewMode,
  onSearchChange,
  onViewModeChange,
  onOpenCreateFolder,
  onOpenUploadFile,
  onOpenUploadFolder,
  onNavigateBreadcrumb,
}: FileBrowserHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumbs & Tombol + Baru */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto custom-scrollbar">
          <Breadcrumbs
            items={breadcrumbsList}
            currentFolderId={currentFolderId}
            onNavigate={onNavigateBreadcrumb}
          />
        </div>

        <div className="flex items-center gap-2 relative shrink-0" ref={dropdownRef}>
          {/* Tombol Utama + Baru (Dropdown Google Drive Style) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/30 transition-all cursor-pointer active:scale-95 select-none"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Baru</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200/90 z-[60] animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenCreateFolder();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                >
                  <FolderPlus className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Folder Baru</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenUploadFile();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                >
                  <FileUp className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Upload Berkas</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenUploadFolder();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                >
                  <FolderUp className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Upload Folder</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bar Pencarian & Switch View Mode (List vs Grid) */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari berkas atau folder di sini..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Toggle (List vs Grid) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-white text-emerald-700 shadow-xs font-bold ring-1 ring-slate-200/60"
                : "text-slate-400 hover:text-slate-700"
            }`}
            title="Tampilan Daftar (List)"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-emerald-700 shadow-xs font-bold ring-1 ring-slate-200/60"
                : "text-slate-400 hover:text-slate-700"
            }`}
            title="Tampilan Kisi (Grid)"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
