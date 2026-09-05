import { useEffect, useState } from "react";
import { FolderIcon, LayoutDashboard, Trash2, Settings, X, Star, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StorageQuotaWidget } from "./StorageQuotaWidget";
import { getCurrentUser } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

const mainNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "File Browser", href: "/folders/root", icon: FolderIcon },
  { name: "Berbintang", href: "/starred", icon: Star },
];

const archiveManagement = [
  { name: "Manajemen Pengguna", href: "/users", icon: Users, requireSuperAdmin: true },
  { name: "Pengaturan Sistem", href: "/settings", icon: Settings, requireSuperAdmin: true },
  { name: "Recycle Bin", href: "/trash", icon: Trash2 },
];

interface SidebarProps {
  onClose?: () => void;
  currentPath?: string;
  isSuperAdmin?: boolean;
}

export function Sidebar({ onClose, currentPath, isSuperAdmin: propIsSuperAdmin }: SidebarProps) {
  const [pathname, setPathname] = useState(
    currentPath || (typeof window !== "undefined" ? window.location.pathname : "")
  );
  const [isSuperAdmin, setIsSuperAdmin] = useState(propIsSuperAdmin ?? false);

  useEffect(() => {
    if (propIsSuperAdmin !== undefined) {
      setIsSuperAdmin(propIsSuperAdmin);
    }
  }, [propIsSuperAdmin]);

  useEffect(() => {
    if (currentPath) {
      setPathname(currentPath);
    } else if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, [currentPath]);

  // Dengarkan event navigasi popstate & astro:page-load
  useEffect(() => {
    const handleNav = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener("popstate", handleNav);
    document.addEventListener("astro:page-load", handleNav);

    // Fallback verifikasi role jika belum tersedia
    if (propIsSuperAdmin === undefined) {
      getCurrentUser().then((res) => {
        if (res.success && res.data?.user) {
          const role = res.data.user.role;
          if (role === "super_admin" || role === "Super Admin") {
            setIsSuperAdmin(true);
          }
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("popstate", handleNav);
      document.removeEventListener("astro:page-load", handleNav);
    };
  }, [propIsSuperAdmin]);

  const handleNavClick = (name: string, href: string) => {
    setPathname(href);
    trackEvent("navigate_menu", {
      menu_name: name,
      target_path: href,
    });
    if (onClose) onClose();
  };

  const renderNavItems = (items: typeof mainNavigation | typeof archiveManagement) => {
    return items.map((item) => {
      if ("requireSuperAdmin" in item && item.requireSuperAdmin && !isSuperAdmin) {
        return null;
      }

      const isActive =
        pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

      return (
        <a
          key={item.name}
          href={item.href}
          data-astro-prefetch="hover"
          onClick={() => handleNavClick(item.name, item.href)}
          className={cn(
            "group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-emerald-500/10 text-emerald-400"
              : "text-slate-400 hover:bg-slate-800 hover:text-white",
          )}
        >
          <item.icon
            className={cn(
              "mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200",
              isActive
                ? "text-emerald-400"
                : "text-slate-500 group-hover:text-white group-hover:scale-110",
            )}
            aria-hidden="true"
          />
          {item.name}
        </a>
      );
    });
  };

  return (
    <div className="flex h-full w-72 flex-col bg-slate-900 text-slate-300 shadow-xl">
      {/* Header Sidebar */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1">
            <img
              src="/kemenag.svg"
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white flex items-center">
              SI BET
              <img src="/logo.png" alt="A" className="mx-[1.5px] -mt-[2px] h-[14px] w-[14px] object-contain" />
              NG
            </h2>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">
              Kemenag Barito Utara
            </p>
          </div>
        </div>
        {/* Tombol Tutup (hanya terlihat di mobile) */}
        {onClose && (
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Menu Navigasi */}
      <nav className="flex-1 space-y-6 px-4 py-6 overflow-y-auto">
        <div className="space-y-1.5">
          <div className="mb-4 px-2">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Menu Utama
            </p>
          </div>
          {renderNavItems(mainNavigation)}
        </div>

        <div className="space-y-1.5">
          <div className="mb-4 px-2">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Manajemen Arsip
            </p>
          </div>
          {renderNavItems(archiveManagement)}
        </div>
      </nav>

      {/* Footer Sidebar */}
      <div className="p-6 pb-4">
        <StorageQuotaWidget />
      </div>
      <div className="border-t border-slate-800 p-6 pt-4">
        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
          <p className="text-xs font-semibold text-white">Butuh Bantuan?</p>
          <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
            Hubungi administrator sistem jika Anda mengalami kendala teknis.
          </p>
        </div>
      </div>
    </div>
  );
}