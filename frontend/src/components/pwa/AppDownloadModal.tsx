import { useState } from "react";
import {
  X,
  Download,
  Smartphone,
  CheckCircle2,
  Share2,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerPwaInstall?: () => void;
  canPromptPwa?: boolean;
}

export function AppDownloadModal({
  isOpen,
  onClose,
  onTriggerPwaInstall,
  canPromptPwa = false,
}: AppDownloadModalProps) {
  const [activeTab, setActiveTab] = useState<"apk" | "pwa" | "playstore">("apk");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header Modal */}
        <div className="relative px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-md border border-slate-100 dark:border-slate-700">
              <img
                src="/kemenag.svg"
                alt="Logo Kemenag"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Pasang Aplikasi SI BETANG
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Kementerian Agama Kabupaten Barito Utara
              </p>
            </div>
          </div>

          {/* Tab Navigasi */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("apk")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "apk"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android (.APK)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pwa")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pwa"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PWA / Web App</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("playstore")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "playstore"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Play Store</span>
            </button>
          </div>
        </div>

        {/* Konten Tab */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* TAB 1: ANDROID APK */}
          {activeTab === "apk" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  <p className="font-bold">Aplikasi Resmi Kemenag Barito Utara</p>
                  <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                    File APK ini dibangun dengan standar resmi <strong>Google Trusted Web Activity (TWA)</strong>. Ukuran sangat ringan (~2.5 MB) dan <strong>otomatis tersinkronisasi</strong> dengan server setiap kali ada pembaruan naskah/fitur.
                  </p>
                </div>
              </div>

              {/* Tombol Unduh APK */}
              <a
                href="/download/sibetang-kemenag.apk"
                download="sibetang-kemenag.apk"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg cursor-pointer group"
              >
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                <span>Unduh File APK Android (2.5 MB)</span>
              </a>

              {/* Langkah Instalasi */}
              <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                  Panduan Cara Pasang di HP Android:
                </p>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      1
                    </span>
                    <p>Klik tombol unduh di atas untuk mengunduh berkas <code>sibetang-kemenag.apk</code>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      2
                    </span>
                    <p>Setelah selesai, buka file dari notifikasi unduhan atau folder <em>Download</em> di ponsel.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      3
                    </span>
                    <p>Pilih <strong>Pasang / Install</strong>. Jika muncul peringatan keamanan, aktifkan opsi <em>"Izinkan pemasangan dari sumber ini"</em>.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PWA / WEB APP */}
          {activeTab === "pwa" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Progressive Web App (PWA) memungkinkan Anda memasang SI BETANG langsung dari peramban (Chrome, Edge, atau Safari) tanpa perlu mengunduh file berkas instalasi. Cocok untuk <strong>iPhone (iOS)</strong>, <strong>Mac</strong>, dan <strong>Komputer Windows</strong>.
              </p>

              {canPromptPwa && (
                <button
                  type="button"
                  onClick={() => {
                    onTriggerPwaInstall?.();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang Sekarang di Peramban Ini</span>
                </button>
              )}

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pengguna iPhone / iPad (Safari):
                </p>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah navigasi Safari.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE PLAY STORE */}
          {activeTab === "playstore" && (
            <div className="flex flex-col items-center text-center gap-4 py-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Paket Google Play Store (.AAB)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Aplikasi telah dikonfigurasi untuk rilis Google Play Store dengan ID paket <code>id.go.kemenag.baritoutara.sibetang</code>.
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 text-xs text-amber-800 dark:text-amber-300 text-left">
                <p className="font-bold">Status Publikasi:</p>
                <p className="mt-0.5">
                  File bundle <code>sibetang.aab</code> siap diunggah ke Google Play Console resmi Kantor Kementerian Agama Kabupaten Barito Utara.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
          <span>Sinkronisasi Real-Time</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
