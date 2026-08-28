import type { FileItem } from "@/lib/types";

export interface FileTableProps {
  data: FileItem[];
  onNavigate?: (id: string) => void;
  onFilesDrop?: (files: File[]) => void;
  onShowInfo?: (item: FileItem) => void;
  onRefresh?: () => void;
  folderId?: string;
  searchQuery?: string;
  viewMode?: "list" | "grid";
  filterType?: string;
  filterDate?: string;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: FileItem | null;
}
