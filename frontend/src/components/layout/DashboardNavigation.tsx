import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";

interface DashboardNavigationProps {
  currentPath?: string;
  isSuperAdmin?: boolean;
}

export function DashboardNavigation({ currentPath, isSuperAdmin }: DashboardNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    window.addEventListener("close-mobile-sidebar", handleClose);
    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("close-mobile-sidebar", handleClose);
    };
  }, []);

  return (
    <>
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:w-72 md:flex-col h-full flex-shrink-0">
        <Sidebar currentPath={currentPath} isSuperAdmin={isSuperAdmin} />
      </div>

      {/* Sidebar Mobile (overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 transform transition-transform duration-300 ease-in-out">
            <Sidebar
              currentPath={currentPath}
              isSuperAdmin={isSuperAdmin}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
