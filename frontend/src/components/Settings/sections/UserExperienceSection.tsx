import { LayoutTemplate, Sparkles, BellRing } from "lucide-react"
import type { AppSettings } from "@/lib/api"

interface UserExperienceSectionProps {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>, keyLabel: string) => Promise<void>
  smoothAnimations: boolean
  onToggleAnimations: () => void
  toastNotifications: boolean
  onToggleToasts: () => void
}

export function UserExperienceSection({
  settings,
  onUpdate,
  smoothAnimations,
  onToggleAnimations,
  toastNotifications,
  onToggleToasts,
}: UserExperienceSectionProps) {
  return (
    <div className="w-full rounded-3xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
            Antarmuka & Pengalaman Pengguna (UI/UX)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kustomisasi penampil PDF bawaan, animasi transisi, dan toaster pemberitahuan.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
          <LayoutTemplate className="w-3.5 h-3.5" /> Tampilan Fleksibel
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Setting: Default PDF Viewer Mode */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                Dual Engine
              </span>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Penampil Dokumen PDF Default
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pilih mode awal saat membuka modal pratinjau dokumen: Penampil Native Browser atau Lembar Bergulir (Canvas).
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdate(
                    { default_pdf_viewer_mode: "iframe" },
                    "Mode Penampil Native",
                  )
                }
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  settings.default_pdf_viewer_mode === "iframe"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Mode Standar
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdate(
                    { default_pdf_viewer_mode: "canvas" },
                    "Mode Lembar Dokumen",
                  )
                }
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  settings.default_pdf_viewer_mode === "canvas"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Mode Lembar
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Pilihan Aktif</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {settings.default_pdf_viewer_mode === "canvas"
                ? "Mode Lembar (Canvas)"
                : "Mode Standar (Native)"}
            </span>
          </div>
        </div>

        {/* UI Preference: Smooth Animations */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                  smoothAnimations
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={smoothAnimations}
                onClick={onToggleAnimations}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  smoothAnimations ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    smoothAnimations ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Animasi & Transisi Halus
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mengaktifkan animasi transisi halus, efek glassmorphism, dan micro-interactions pada navigasi folder.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status UI</span>
            <span
              className={`font-semibold ${
                smoothAnimations
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {smoothAnimations ? "Aktif (Modern)" : "Minimalis"}
            </span>
          </div>
        </div>

        {/* UI Preference: Toast CRUD Notifications */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                  toastNotifications
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <BellRing className="h-5 w-5" />
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={toastNotifications}
                onClick={onToggleToasts}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  toastNotifications ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    toastNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Pemberitahuan Toaster Operasi
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Menampilkan pesan toaster mengambang modern setiap kali membuat folder, mengunggah, memindahkan, atau menghapus berkas.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status UI</span>
            <span
              className={`font-semibold ${
                toastNotifications
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {toastNotifications ? "Aktif (Lengkap)" : "Hening"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
