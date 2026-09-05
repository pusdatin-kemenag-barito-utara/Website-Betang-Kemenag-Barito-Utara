export interface TrashItem {
  id: string;
  name: string;
  type: "folder" | "file";
  deletedAt: string;
  expiresAt: string;
  daysRemaining?: number;
  r2ObjectKey?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface TrashViewProps {
  initialData: TrashItem[];
}
