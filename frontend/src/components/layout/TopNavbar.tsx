import { LogOut, Menu, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentUser, logoutAction } from "@/lib/api";
import { trackEvent, setAnalyticsUser } from "@/lib/analytics";

interface TopNavbarProps {
  onMenuClick?: () => void;
  initialUser?: {
    name?: string;
    role?: string;
    email?: string;
  };
}

export function TopNavbar({ onMenuClick, initialUser }: TopNavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userName, setUserName] = useState(
    initialUser?.name || "ADMIN KABUPATEN"
  );
  const [userRole, setUserRole] = useState(
    initialUser?.role === "super_admin" || initialUser?.role === "Super Admin"
      ? "Super Admin"
      : initialUser?.role === "operator"
      ? "Operator"
      : initialUser?.role || "Pengguna"
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUser) {
      if (initialUser.name) setUserName(initialUser.name);
      if (initialUser.role) {
        setUserRole(
          initialUser.role === "super_admin" || initialUser.role === "Super Admin"
            ? "Super Admin"
            : initialUser.role === "operator"
            ? "Operator"
            : initialUser.role
        );
      }
    }

    async function getUser() {
      try {
        const res = await getCurrentUser();
        if (res.success && res.data?.user) {
          const user = res.data.user;
          const name = user.name || user.email?.split("@")[0] || "Admin Name";
          setUserName(name);

          const role = user.role;
          const roleLabel =
            role === "super_admin" ? "Super Admin" : role === "operator" ? "Operator" : role || "Pengguna";
          setUserRole(roleLabel);

          // Sinkronisasi status user ke Google Analytics & GTM
          setAnalyticsUser(user.id, roleLabel, user.email);
        } else if (res.unauthorized) {
          window.location.replace("/login");
        }
      } catch {
        // Abaikan; fallback nama default.
      }
    }

    getUser();
  }, [initialUser]);

  // Tutup dropdown bila klik di luar area.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    trackEvent("logout", {
      user_name: userName,
      user_role: userRole,
    });
    await logoutAction();
  };

  const handleToggleMobile = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center">
        {/* Tombol menu untuk mobile */}
        <button onClick={handleToggleMobile} className="mr-4 text-slate-500 hover:text-slate-700 md:hidden">
          <Menu className="h-6 w-6" />
        </button>
        <div className="hidden md:block">
          <span className="text-sm font-medium text-slate-500">Panel Kendali Admin</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Dropdown Profil User */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-full border border-slate-100 bg-white py-1.5 pl-1.5 pr-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 overflow-hidden p-1.5 border border-emerald-100">
              <img src="/kemenag.svg" alt="Profile Icon" className="h-full w-full object-contain" />
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
  );
}