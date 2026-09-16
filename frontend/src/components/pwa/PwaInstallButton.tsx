import { useState, useEffect } from "react";
import { Download, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Cek apakah browser sedang berjalan dalam mode aplikasi standalone
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert(
        "Untuk memasang SI BETANG di perangkat Anda, silakan buka menu peramban Anda (ikon titik tiga atau tombol bagikan) lalu pilih 'Pasang Aplikasi' atau 'Tambahkan ke Layar Utama'."
      );
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="flex w-full items-center justify-between gap-2.5 rounded-xl bg-slate-800/60 hover:bg-emerald-950/40 border border-slate-700/60 hover:border-emerald-500/40 p-2.5 text-left transition-all duration-150 group cursor-pointer shadow-xs"
      title="Pasang aplikasi SI BETANG untuk akses cepat dan offline"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
          {isInstalled ? <Check className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
        </div>
        <div className="truncate">
          <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
            {isInstalled ? "Aplikasi Terpasang" : "Pasang Aplikasi"}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {isInstalled ? "SI BETANG PWA" : "Akses Cepat & Mandiri"}
          </p>
        </div>
      </div>
      <Download className="h-3.5 w-3.5 text-emerald-400 shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
    </button>
  );
}
