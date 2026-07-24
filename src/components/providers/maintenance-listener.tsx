"use client";

import { useEffect } from "react";

export function MaintenanceListener() {
  useEffect(() => {
    let active = true;

    const checkStatus = async () => {
      try {
        const pusdatinUrl =
          process.env.NEXT_PUBLIC_PUSDATIN_URL ||
          "https://pusdatin.kemenag-baritoutara.go.id";
        const appId = "e-arsip-kemenag";

        const res = await fetch(`${pusdatinUrl}/api/public/apps/${appId}/status`, {
          cache: "no-store",
        });

        if (res.ok && active) {
          const data = await res.json();
          if (data.status === "maintenance") {
            if (window.location.pathname !== "/maintenance") {
              window.location.replace("/maintenance");
            }
          }
        }
      } catch {
        // Ignore network errors during polling
      }
    };

    // Check periodically every 15 seconds
    const interval = setInterval(checkStatus, 15000);

    // Also check immediately when window gains focus
    const onFocus = () => {
      checkStatus();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
