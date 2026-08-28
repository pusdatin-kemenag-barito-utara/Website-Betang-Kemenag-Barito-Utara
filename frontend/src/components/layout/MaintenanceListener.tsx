// Pendengar mode maintenance: polling tiap 15 detik + saat tab kembali fokus.
// Pengganti providers/maintenance-listener.tsx lama.
import { useEffect } from "react";

const PUSDATIN_URL =
  import.meta.env.PUBLIC_PUSDATIN_URL || "https://pusdatin.kemenag-baritoutara.com";
const APP_ID = "e-arsip-kemenag";
const CHECK_INTERVAL = 15_000;

export function MaintenanceListener() {
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`${PUSDATIN_URL}/api/public/apps/${APP_ID}/status?_t=${Date.now()}`);
        if (!res.ok) return;
        const data: any = await res.json();
        const isMaintenance = data.status === "maintenance";

        if (isMaintenance && !window.location.pathname.startsWith("/maintenance")) {
          window.location.href = "/maintenance";
        } else if (!isMaintenance && window.location.pathname.startsWith("/maintenance")) {
          window.location.href = "/";
        }
      } catch {
        // Abaikan; cek berikutnya akan dijalankan lagi.
      }
    }

    const interval = setInterval(checkStatus, CHECK_INTERVAL);
    window.addEventListener("focus", checkStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkStatus);
    };
  }, []);

  return null;
}