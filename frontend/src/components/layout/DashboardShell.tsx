// Cangkang dashboard: kelola menu mobile, blocker klik kanan, dan Toaster.
// Pengganti DashboardLayoutClient lama (Next.js) pada arsitektur Astro.
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

export function DashboardShell({
  children,
  disableRightClick = true,
}: {
  children: React.ReactNode;
  disableRightClick?: boolean;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Context Menu Blocker (paritas aplikasi lama)
  useEffect(() => {
    if (!disableRightClick) return;

    const handleContextMenu = (e: MouseEvent) => {
      // Jangan blokir klik kanan pada input/textarea.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [disableRightClick]);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Sidebar Mobile (overlay) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 transform transition-transform duration-300 ease-in-out">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { borderRadius: "12px", fontWeight: 600 },
        }}
      />

      {/* Area Konten Utama */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {/* Tanpa max-w-7xl agar full width */}
          <div className="mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}