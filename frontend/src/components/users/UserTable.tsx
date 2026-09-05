import { Users, ShieldCheck, Building2, Pencil, Trash2, FolderKey } from "lucide-react";
import type { UserItem } from "@/lib/api";

interface UserTableProps {
  users: UserItem[];
  currentUserId: string;
  onEdit: (user: UserItem) => void;
  onDelete: (user: UserItem) => void;
  onOpenFolderAccessForBidang?: (bidangId: string, bidangName: string) => void;
}

export function UserTable({
  users,
  currentUserId,
  onEdit,
  onDelete,
  onOpenFolderAccessForBidang,
}: UserTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/90 text-xs font-bold tracking-wider text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4">Pengguna</th>
              <th className="px-6 py-4">Peran (Role)</th>
              <th className="px-6 py-4">Seksi / Bidang</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-slate-300 stroke-1" />
                    <p className="text-sm font-semibold">Tidak ada pengguna yang sesuai</p>
                    <p className="text-xs text-slate-400">
                      Coba sesuaikan kata kunci pencarian atau filter Anda
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isCurrentUser = u.id === currentUserId;
                const isSuper =
                  u.role === "Super Admin" || u.role === "super_admin";

                return (
                  <tr
                    key={u.id}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Kolom Profil Pengguna */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50/80 border border-emerald-100/90 p-1.5 shadow-2xs">
                          <img
                            src="/kemenag.svg"
                            alt="Logo Kemenag"
                            className="h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {u.full_name}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>@{u.username}</span>
                            <span>•</span>
                            <span className="truncate">{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kolom Peran */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 ring-1 ring-inset ring-purple-200/70">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200/70">
                          <Building2 className="h-3.5 w-3.5" />
                          Admin Bidang
                        </span>
                      )}
                    </td>

                    {/* Kolom Seksi / Bidang */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      {u.bidang_name ? (
                        <span className="inline-flex items-center rounded-xl bg-slate-100/80 px-2.5 py-1 text-slate-700 font-bold">
                          {u.bidang_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          {isSuper ? "Akses Global (Semua Root)" : "Belum ditentukan"}
                        </span>
                      )}
                    </td>

                    {/* Kolom Status Akun */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Kolom Aksi */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Akses Folder Root (RBAC) */}
                        {!isSuper && u.bidang_id && onOpenFolderAccessForBidang && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenFolderAccessForBidang(u.bidang_id!, u.bidang_name!)
                            }
                            className="rounded-xl p-2.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200/70 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                            title={`Atur Hak Akses Folder Root (${u.bidang_name})`}
                          >
                            <FolderKey className="h-4.5 w-4.5" />
                          </button>
                        )}

                        {/* Tombol Edit Pengguna (Hanya Icon) */}
                        <button
                          type="button"
                          onClick={() => onEdit(u)}
                          className="rounded-xl p-2.5 text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-200/70 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                          title="Edit Pengguna"
                        >
                          <Pencil className="h-4.5 w-4.5" />
                        </button>

                        {/* Tombol Hapus Pengguna (Hanya Icon) */}
                        <button
                          type="button"
                          onClick={() => onDelete(u)}
                          disabled={isCurrentUser}
                          className={`rounded-xl p-2.5 transition-all ${
                            isCurrentUser
                              ? "text-slate-300 bg-slate-100 cursor-not-allowed"
                              : "text-rose-600 bg-rose-50 hover:bg-rose-100 ring-1 ring-rose-200/70 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                          }`}
                          title={
                            isCurrentUser
                              ? "Tidak dapat menghapus akun sendiri"
                              : "Hapus Pengguna"
                          }
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
