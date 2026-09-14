import { ShieldCheck, MousePointerClick, Printer, FileCheck2, Loader2 } from "lucide-react"
import type { AppSettings } from "@/lib/api"

interface DocumentSecuritySectionProps {
  settings: AppSettings
  updatingKey: string | null
  onUpdate: (patch: Partial<AppSettings>, keyLabel: string) => Promise<void>
}

export function DocumentSecuritySection({
  settings,
  updatingKey,
  onUpdate,
}: DocumentSecuritySectionProps) {
  return (
    <div className="w-full rounded-3xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
            Keamanan & Proteksi Dokumen
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kebijakan perlindungan berkas dan pencegahan penyalinan/pengunduhan tanpa izin.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" /> Proteksi Global
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Setting: Disable Right Click */}
        <div className="flex flex-col justify-between p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 transition-all hover:border-emerald-200 dark:hover:border-emerald-800/60 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  settings.disable_right_click
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {settings.disable_right_click ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <MousePointerClick className="h-5 w-5" />
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.disable_right_click}
                disabled={updatingKey === "disable_right_click"}
                onClick={() =>
                  onUpdate(
                    { disable_right_click: !settings.disable_right_click },
                    "Blokir Klik Kanan",
                  )
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                  settings.disable_right_click
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                {updatingKey === "disable_right_click" && (
                  <span className="absolute inset-0 z-10 flex items-center justify-center">
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  </span>
                )}
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.disable_right_click ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Blokir Klik Kanan Browser
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mencegah menu context browser pihak ketiga dan mewajibkan pengguna berinteraksi lewat menu resmi SI BETANG.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status</span>
            <span
              className={`font-semibold ${
                settings.disable_right_click
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {settings.disable_right_click ? "Aktif (Terlindungi)" : "Nonaktif"}
            </span>
          </div>
        </div>

        {/* Setting: Disable Print / Save Shortcut */}
        <div className="flex flex-col justify-between p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 transition-all hover:border-emerald-200 dark:hover:border-emerald-800/60 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  settings.disable_print_shortcut
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <Printer className="h-5 w-5" />
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.disable_print_shortcut}
                disabled={updatingKey === "disable_print_shortcut"}
                onClick={() =>
                  onUpdate(
                    { disable_print_shortcut: !settings.disable_print_shortcut },
                    "Proteksi Pintasan Cetak (Ctrl+P)",
                  )
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                  settings.disable_print_shortcut
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                {updatingKey === "disable_print_shortcut" && (
                  <span className="absolute inset-0 z-10 flex items-center justify-center">
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  </span>
                )}
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.disable_print_shortcut ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Proteksi Pintasan Cetak & Simpan
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mencegah pintasan cepat <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+P</kbd> dan <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+S</kbd> untuk melindungi naskah arsip internal.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status</span>
            <span
              className={`font-semibold ${
                settings.disable_print_shortcut
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {settings.disable_print_shortcut ? "Aktif (Diblokir)" : "Diizinkan"}
            </span>
          </div>
        </div>

        {/* Setting: Watermark Dokumen */}
        <div className="flex flex-col justify-between p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 transition-all hover:border-emerald-200 dark:hover:border-emerald-800/60 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  settings.enable_watermark
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <FileCheck2 className="h-5 w-5" />
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enable_watermark}
                disabled={updatingKey === "enable_watermark"}
                onClick={() =>
                  onUpdate(
                    { enable_watermark: !settings.enable_watermark },
                    "Watermark Dokumen Arsip",
                  )
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                  settings.enable_watermark
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                {updatingKey === "enable_watermark" && (
                  <span className="absolute inset-0 z-10 flex items-center justify-center">
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  </span>
                )}
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.enable_watermark ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Tanda Air Dokumen (Watermark)
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Menyematkan identitas cap digital resmi Kemenag Barito Utara pada lembar peninjauan dokumen dinas.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Teks Cap</span>
            <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">
              {settings.enable_watermark ? "KEMENAG BARITO UTARA" : "Nonaktif"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
