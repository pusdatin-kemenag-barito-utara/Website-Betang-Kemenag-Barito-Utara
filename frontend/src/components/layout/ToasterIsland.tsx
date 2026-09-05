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
    <Toaster
      position="bottom-right"
      closeButton
      expand={false}
      duration={3000}
    />
  );
}
