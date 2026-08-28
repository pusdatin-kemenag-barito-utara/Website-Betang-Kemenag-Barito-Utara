export interface TrashItem {
  id: string;
  name: string;
  type: "folder" | "file";
  deletedAt: string;
  expiresAt: string;
}

export interface TrashViewProps {
  initialData: TrashItem[];
}
