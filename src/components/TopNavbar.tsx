"use client"

import { LogOut, Menu, Edit, Key, Eye, EyeOff } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import Image from "next/image"
import appIcon from "@/app/icon.svg"

export function TopNavbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [userName, setUserName] = useState("Memuat...")
  const [userRole, setUserRole] = useState("")
  const [editName, setEditName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const client = createClient()
    async function getUser() {
      const { data: { user } } = await client.auth.getUser()
      if (user) {
        const { data: meta } = await client.rpc('get_pusdatin_user', { email_address: user.email })
        
        if (meta?.name) {
          setUserName(meta.name)
          setEditName(meta.name)
        } else {
          const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin Name"
          setUserName(fallbackName)
          setEditName(fallbackName)
        }

        if (meta?.role) {
          setUserRole(meta.role === 'super_admin' ? 'Super Admin' : meta.role === 'operator' ? 'Operator' : meta.role)
        } else {
          setUserRole("Pengguna")
        }
      }
    }
    getUser()
  }, [])

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center">
        {/* Tombol menu untuk mobile */}
        <button 
          onClick={onMenuClick}
          className="mr-4 text-slate-500 hover:text-slate-700 md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="hidden md:block">
          {/* Breadcrumb atau Info tambahan bisa ditaruh di sini nantinya */}
          <span className="text-sm font-medium text-slate-500">Panel Kendali Admin</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-full border border-slate-100 bg-white py-1.5 pl-1.5 pr-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 overflow-hidden p-1.5 border border-emerald-100">
              <Image src={appIcon} alt="Profile Icon" className="h-full w-full object-contain" />
            </div>
            <div className="hidden flex-col items-start sm:flex">
              <span className="text-[13px] font-bold leading-none text-[#1e3a8a]">{userName}</span>
              <span className="text-[11px] text-slate-400 mt-1 font-medium">{userRole}</span>
            </div>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-black bg-white p-2 shadow-xl focus:outline-none"
              >
                <div className="px-3 py-2 sm:hidden border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-[#1e3a8a]">{userName}</p>
                  <p className="text-[10px] text-slate-500">{userRole}</p>
                </div>
                <button
                  onClick={() => {
                    setEditName(userName)
                    setIsEditProfileOpen(true)
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-emerald-600"
                >
                  <Edit className="h-4 w-4" />
                  Edit Profil
                </button>
                <button
                  onClick={() => {
                    setNewPassword("")
                    setShowPassword(false)
                    setIsChangePasswordOpen(true)
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-emerald-600"
                >
                  <Key className="h-4 w-4" />
                  Ubah Password
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-[#1e3a8a] mb-4">Edit Profil</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Masukkan nama baru"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setIsEditProfileOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={async () => {
                      const { error } = await supabase.auth.updateUser({
                        data: { full_name: editName }
                      })
                      if (!error) {
                        setUserName(editName)
                        setIsEditProfileOpen(false)
                        toast.success("Nama berhasil diubah.")
                      } else {
                        toast.error("Gagal mengubah nama: " + error.message)
                      }
                    }}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-[#1e3a8a] mb-4">Ubah Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="Masukkan password baru"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Minimal 6 karakter.</p>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => {
                      setIsChangePasswordOpen(false)
                      setNewPassword("")
                      setShowPassword(false)
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={async () => {
                      if (newPassword.length < 6) {
                        toast.error("Password harus minimal 6 karakter")
                        return
                      }
                      setIsSubmitting(true)
                      const { error } = await supabase.auth.updateUser({
                        password: newPassword
                      })
                      setIsSubmitting(false)
                      if (!error) {
                        setIsChangePasswordOpen(false)
                        setNewPassword("")
                        setShowPassword(false)
                        toast.success("Password berhasil diubah")
                      } else {
                        toast.error("Gagal mengubah password: " + error.message)
                      }
                    }}
                    disabled={isSubmitting}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  )
}
