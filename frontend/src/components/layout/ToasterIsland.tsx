import { Toaster, toast } from "sonner";
import { useEffect } from "react";

export function ToasterIsland() {
  useEffect(() => {
    try {
      const flash = sessionStorage.getItem("login_success_flash");
      if (flash) {
        sessionStorage.removeItem("login_success_flash");
        const userName = sessionStorage.getItem("login_user_name") || "Administrator";
        sessionStorage.removeItem("login_user_name");

        setTimeout(() => {
          toast.success("Login Berhasil!", {
            description: `Selamat datang kembali di Sistem E-Arsip SI BETANG, ${userName}.`,
            duration: 4000,
          });
        }, 200);
      }
    } catch {
      // Abaikan
    }
  }, []);

  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      expand={true}
      toastOptions={{
        style: {
          borderRadius: "16px",
          padding: "14px 18px",
          boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.06)",
          fontSize: "13px",
          fontWeight: 600,
        },
      }}
    />
  );
}
