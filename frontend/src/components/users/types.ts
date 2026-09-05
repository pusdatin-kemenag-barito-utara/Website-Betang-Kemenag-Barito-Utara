export type { UserItem } from "@/lib/api";

export interface Bidang {
  id: string;
  name: string;
  count?: number;
  sort_order?: number;
  accessibleFolderIds?: string[];
  accessibleFolderNames?: string[];
}

export interface RootFolderOption {
  id: string;
  name: string;
}

export interface UserStats {
  total: number;
  superAdmins: number;
  adminBidang: number;
  totalBidang?: number;
  active: number;
}

export interface AddUserFormState {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role: string;
  bidang_id: string | null;
  is_active: boolean;
}

export interface EditUserFormState {
  full_name: string;
  role: string;
  bidang_id: string | null;
  is_active: boolean;
  password: string;
}
