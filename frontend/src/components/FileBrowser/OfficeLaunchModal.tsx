import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  X,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  type OfficeAppType,
  getOfficeAppUri,
  triggerOfficeProtocol,
} from "@/lib/officeUri";

export interface OfficeLaunchEventDetail {
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  app: OfficeAppType;
  webdavUri?: string;
  hasAutoSave?: boolean;
}

export function OfficeLaunchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<OfficeLaunchEventDetail | null>(null);
  const [isRelaunching, setIsRelaunching] = useState(false);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<OfficeLaunchEventDetail>;
      if (customEvent.detail) {
        setData(customEvent.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener("betang:open-office-launch", handleEvent);
    return () => {
      window.removeEventListener("betang:open-office-launch", handleEvent);
    };
  }, []);

  if (!isOpen || !data) return null;

  const { fileUrl, fileName, app, webdavUri } = data;

  const appConfig = {
    excel: {
      name: "Microsoft Excel",
      color: "text-emerald-600",
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      btn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
      icon: FileSpreadsheet,
    },
    word: {
      name: "Microsoft Word",
      color: "text-blue-600",
      bg: "bg-blue-50 text-blue-600 border-blue-100",
      btn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
      icon: FileText,
    },
    powerpoint: {
      name: "Microsoft PowerPoint",
      color: "text-orange-600",
      bg: "bg-orange-50 text-orange-600 border-orange-100",
      btn: "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20",
      icon: Presentation,
    },
  }[app];

  const IconComponent = appConfig.icon;
  const officeUri = webdavUri || getOfficeAppUri(fileUrl, app, "edit");

  const handleRelaunch = () => {
    setIsRelaunching(true);
    triggerOfficeProtocol(officeUri);
    setTimeout(() => setIsRelaunching(false), 1000);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Clean Office App Icon */}
        <div
          className={`mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl border ${appConfig.bg} shadow-xs`}
        >
          <IconComponent className="h-6 w-6" />
        </div>

        {/* Title & File Name */}
        <h3 className="text-base font-bold text-slate-900 leading-tight">
          Membuka di {appConfig.name}
        </h3>
        <p
          className="mt-1 text-xs text-slate-500 font-medium truncate max-w-[260px] mx-auto"
          title={fileName}
        >
          {fileName}
        </p>

        {/* Single Minimalist Tip with Auto-Save Info */}
        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2.5 text-[11px] text-slate-600 text-left flex items-start gap-2">
          <span className="text-emerald-600 text-xs mt-0.5">⚡</span>
          <div className="leading-tight space-y-1">
            <p className="font-semibold text-slate-800">
              Mendukung Auto-Save (Ctrl + S Online)
            </p>
            <p className="text-[10px] text-slate-500">
              Bebas tekan <kbd className="px-1 py-0.5 rounded bg-white border border-slate-300 font-semibold text-[9px] text-slate-700">Ctrl + S</kbd> kapan saja saat mengetik. Sistem pintar menyerap simpanan berkala dan menyinkronkan ke server secara aman tanpa membebani memori.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={handleRelaunch}
            disabled={isRelaunching}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer ${appConfig.btn} ${isRelaunching ? "opacity-75" : ""}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRelaunching ? "animate-spin" : ""}`} />
            <span>{isRelaunching ? "Menghubungkan..." : "Luncurkan Ulang"}</span>
          </button>

          <div className="flex items-center justify-between pt-1 px-1 text-xs">
            <button
              type="button"
              onClick={handleDownload}
              className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh Berkas</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
