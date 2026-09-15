import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import { OfficeLaunchModal } from "@/components/FileBrowser/OfficeLaunchModal";

export function ToasterIsland() {
  useEffect(() => {
    try {
      const flash = sessionStorage.getItem("login_success_flash");
      if (flash) {
        sessionStorage.removeItem("login_success_flash");
        const userName = sessionStorage.getItem("login_user_name") || "Administrator";
        sessionStorage.removeItem("login_user_name");

        setTimeout(() => {
          toast.success(`Selamat datang kembali, ${userName}!`, {
            duration: 3500,
          });
        }, 200);
      }
    } catch {
      // Abaikan
    }
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        expand={false}
        duration={3500}
        toastOptions={{
          style: {
            borderRadius: "14px",
            fontWeight: 600,
            fontSize: "13px",
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          },
        }}
      />
      <OfficeLaunchModal />
    </>
  );
}

