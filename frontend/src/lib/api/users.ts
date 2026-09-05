import { request } from "./client";

export interface UserItem {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  bidang_id: string | null;
  bidang_name?: string | null;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPayload {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role: string;
  bidang_id?: string | null;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  full_name?: string;
  role?: string;
  bidang_id?: string | null;
  is_active?: boolean;
  password?: string;
}

/** Mengambil seluruh daftar pengguna dari server (Super Admin). */
export async function getUsersList(): Promise<{ success: boolean; data?: { users: UserItem[] }; error?: string }> {
  return request("/users");
}

/** Membuat pengguna baru (Super Admin). */
export async function createUser(payload: CreateUserPayload): Promise<{ success: boolean; data?: { user: UserItem }; error?: string }> {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Memperbarui profil/sandi pengguna (Super Admin). */
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<{ success: boolean; data?: { user: UserItem }; error?: string }> {
  return request(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** Menghapus pengguna (Super Admin). */
export async function deleteUser(id: string): Promise<{ success: boolean; data?: { message: string }; error?: string }> {
  return request(`/users/${id}`, {
    method: "DELETE",
  });
}
