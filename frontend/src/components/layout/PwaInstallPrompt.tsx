import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Jangan tampilkan jika aplikasi sudah berjalan dalam mode PWA standalone
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Cek apakah sebelumnya pernah ditutup sesi ini
      const dismissed = sessionStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  if (!showPrompt || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm w-[calc(100vw-32px)] sm:w-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900/95 p-3.5 text-white shadow-2xl ring-1 ring-emerald-500/30 backdrop-blur-xl border border-slate-800">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/40">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-100">Pasang Aplikasi SI BETANG</h4>
          <p className="text-[11px] text-slate-400 truncate">Akses cepat & bekerja saat offline</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
