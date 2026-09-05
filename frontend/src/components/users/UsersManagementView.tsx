import { useState, useMemo } from "react";
import { toast } from "sonner";
import type {
  UserItem,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/lib/api";
import { createUser, updateUser, deleteUser } from "@/lib/api";
import type { Bidang, RootFolderOption, AddUserFormState, EditUserFormState } from "./types";
import { UserStatsCards } from "./UserStatsCards";
import { UserToolbar } from "./UserToolbar";
import { UserTable } from "./UserTable";
import { AddUserModal } from "./AddUserModal";
import { EditUserModal } from "./EditUserModal";
import { DeleteUserModal } from "./DeleteUserModal";
import { FolderAccessModal } from "@/components/Bidang/FolderAccessModal";

interface UsersManagementViewProps {
  initialUsers: UserItem[];
  bidangList: Bidang[];
  allRootFolders?: RootFolderOption[];
  currentUserId: string;
}

export function UsersManagementView({
  initialUsers,
  bidangList,
  allRootFolders = [],
  currentUserId,
}: UsersManagementViewProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [bidangs, setBidangs] = useState<Bidang[]>(bidangList);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [bidangFilter, setBidangFilter] = useState("ALL");

  // Modal dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [folderAccessTarget, setFolderAccessTarget] = useState<{
    id: string;
    name: string;
    folderIds: string[];
  } | null>(null);

  // Form submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handler membuka pengaturan akses folder root untuk bidang tertentu
  const handleOpenFolderAccessForBidang = (bidangId: string, bidangName: string) => {
    const targetBidang = bidangs.find((b) => b.id === bidangId);
    setFolderAccessTarget({
      id: bidangId,
      name: bidangName,
      folderIds: targetBidang?.accessibleFolderIds || [],
    });
  };

  // Handler update hak akses folder berhasil disimpan
  const handleFolderAccessSuccess = (updatedIds: string[]) => {
    if (!folderAccessTarget) return;
    const updatedNames = allRootFolders
      .filter((f) => updatedIds.includes(f.id))
      .map((f) => f.name);

    setBidangs((prev) =>
      prev.map((b) =>
        b.id === folderAccessTarget.id
          ? {
              ...b,
              accessibleFolderIds: updatedIds,
              accessibleFolderNames: updatedNames,
            }
          : b
      )
    );
    setFolderAccessTarget(null);
  };

  // Handler penambahan bidang baru
  const handleBidangAdded = (newB: Bidang) => {
    setBidangs((prev) => [...prev, newB]);
  };

  // 📊 Hitung statistik ringkasan
  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter(
      (u) => u.role === "Super Admin" || u.role === "super_admin"
    ).length;
    const adminBidang = total - superAdmins;
    const active = users.filter((u) => u.is_active).length;
    return { total, superAdmins, adminBidang, active };
  }, [users]);

  // 🔍 Filter & Pencarian Pengguna
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.bidang_name && u.bidang_name.toLowerCase().includes(q));

      const matchRole =
        roleFilter === "ALL" ||
        (roleFilter === "Super Admin"
          ? u.role === "Super Admin" || u.role === "super_admin"
          : u.role !== "Super Admin" && u.role !== "super_admin");

      const matchBidang =
        bidangFilter === "ALL" ||
        (bidangFilter === "NONE" ? !u.bidang_id : u.bidang_id === bidangFilter);

      return matchSearch && matchRole && matchBidang;
    });
  }, [users, search, roleFilter, bidangFilter]);

  // ➕ Handler Tambah Pengguna
  const handleAddSubmit = async (formData: AddUserFormState) => {
    if (!formData.email || !formData.full_name || !formData.password) {
      toast.error("Mohon lengkapi seluruh kolom wajib.");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        ...formData,
        bidang_id: formData.role === "Super Admin" ? null : formData.bidang_id,
      };

      const res = await createUser(payload);
      if (res.success && res.data?.user) {
        toast.success(`Pengguna ${res.data.user.full_name} berhasil ditambahkan!`);
        setUsers((prev) => [res.data!.user, ...prev]);
        setIsAddOpen(false);
      } else {
        toast.error(res.error || "Gagal menambahkan pengguna.");
      }
    } catch {
      toast.error("Terjadi kendala jaringan saat menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✏️ Handler Edit Pengguna
  const handleEditSubmit = async (formData: EditUserFormState) => {
    if (!userToEdit) return;

    if (!formData.full_name.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }
    if (formData.role === "Admin Bidang" && !formData.bidang_id) {
      toast.error("Silakan tentukan seksi / bidang penugasan untuk Admin Bidang.");
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error("Kata sandi baru minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateUserPayload = {
        full_name: formData.full_name,
        role: formData.role,
        bidang_id: formData.role === "Super Admin" ? null : formData.bidang_id,
        is_active: formData.is_active,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await updateUser(userToEdit.id, payload);
      if (res.success && res.data?.user) {
        toast.success(`Data pengguna ${res.data.user.full_name} berhasil diperbarui!`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userToEdit.id ? res.data!.user : u))
        );
        setUserToEdit(null);
      } else {
        toast.error(res.error || "Gagal memperbarui pengguna.");
      }
    } catch {
      toast.error("Terjadi kendala jaringan saat menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🗑️ Handler Hapus Pengguna
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUserId) {
      toast.error("Anda tidak dapat menghapus akun yang sedang Anda gunakan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await deleteUser(userToDelete.id);
      if (res.success) {
        toast.success(`Pengguna ${userToDelete.full_name} berhasil dihapus.`);
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else {
        toast.error(res.error || "Gagal menghapus pengguna.");
      }
    } catch {
      toast.error("Terjadi kendala saat menghapus pengguna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 📊 Kartu Statistik */}
      <UserStatsCards stats={stats} />

      {/* 📋 Toolbar & Tabel Pengguna */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">
        <UserToolbar
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          bidangFilter={bidangFilter}
          onBidangFilterChange={setBidangFilter}
          bidangList={bidangs}
          onOpenAddModal={() => setIsAddOpen(true)}
        />

        <UserTable
          users={filteredUsers}
          currentUserId={currentUserId}
          onEdit={setUserToEdit}
          onDelete={setUserToDelete}
          onOpenFolderAccessForBidang={handleOpenFolderAccessForBidang}
        />
      </div>

      {/* ➕ Modal Tambah Pengguna */}
      <AddUserModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddSubmit}
        bidangList={bidangs}
        allRootFolders={allRootFolders}
        isSubmitting={isSubmitting}
        onOpenFolderAccessForBidang={handleOpenFolderAccessForBidang}
        onBidangAdded={handleBidangAdded}
      />

      {/* ✏️ Modal Edit Pengguna */}
      <EditUserModal
        user={userToEdit}
        onClose={() => setUserToEdit(null)}
        onSubmit={handleEditSubmit}
        bidangList={bidangs}
        allRootFolders={allRootFolders}
        isSubmitting={isSubmitting}
        onOpenFolderAccessForBidang={handleOpenFolderAccessForBidang}
        onBidangAdded={handleBidangAdded}
        isSelf={userToEdit?.id === currentUserId}
      />

      {/* 🗑️ Modal Hapus Pengguna */}
      <DeleteUserModal
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isSubmitting={isSubmitting}
      />

      {/* 🔑 Modal Pengaturan Akses Folder Root (RBAC) Khusus Bidang */}
      {folderAccessTarget && (
        <FolderAccessModal
          isOpen={!!folderAccessTarget}
          onClose={() => setFolderAccessTarget(null)}
          bidangId={folderAccessTarget.id}
          bidangName={folderAccessTarget.name}
          currentFolderIds={folderAccessTarget.folderIds}
          allRootFolders={allRootFolders}
          onSuccess={handleFolderAccessSuccess}
        />
      )}
    </div>
  );
}
