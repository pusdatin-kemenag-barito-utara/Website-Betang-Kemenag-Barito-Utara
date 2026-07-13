"use client"

import { LogOut, Menu, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import appIcon from "@/app/icon.svg"

export function TopNavbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userName, setUserName] = useState("Memuat...")
  const [userRole, setUserRole] = useState("")

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
        } else {
          const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin Name"
          setUserName(fallbackName)
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
            <ChevronDown className="ml-1 h-4 w-4 text-slate-400" />
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
    </header>
  )
}
