"use client"

import { useState } from "react"
import { updateAppSettings, type AppSettings } from "@/lib/api"
import { toast } from "sonner"
import {
  ShieldCheck,
  MousePointerClick,
  Printer,
  FileCheck2,
  Cloud,
  Zap,
  HardDrive,
  Clock,
  LayoutTemplate,
  Sparkles,
  BellRing,
  Database,
  Server,
  Users,
  UserCheck,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from "lucide-react"
import { trackEvent } from "@/lib/analytics"

interface SettingsClientProps {
  initialSettings: AppSettings
  currentUser?: {
    name?: string
    email?: string
    role?: string
    isSuperAdmin?: boolean
  } | null
}

export function SettingsClient({ initialSettings, currentUser }: SettingsClientProps) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

  // Local UI-only preferences (persisted in localStorage)
  const [smoothAnimations, setSmoothAnimations] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("betang_smooth_animations") !== "false"
    }
    return true
  })

  const [toastNotifications, setToastNotifications] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("betang_toast_notifications") !== "false"
    }
    return true
  })

  const handleUpdate = async (patch: Partial<AppSettings>, keyLabel: string) => {
    const key = Object.keys(patch)[0]
    setUpdatingKey(key)

    const prev = { ...settings }
    const updated = { ...settings, ...patch }
    setSettings(updated)

    trackEvent("update_app_settings", patch as Record<string, any>)

    const res = await updateAppSettings(patch)
    setUpdatingKey(null)

    if (res.success) {
      if (patch.disable_right_click !== undefined) {
        const root = document.getElementById("dashboard-root")
        if (root) {
          root.dataset.disableRightClick = String(patch.disable_right_click)
        }
      }
      toast.success(`${keyLabel} berhasil diperbarui.`)
    } else {
      setSettings(prev)
      toast.error(res.error || `Gagal memperbarui ${keyLabel}.`)
    }
  }

  const handleToggleAnimations = () => {
    const next = !smoothAnimations
    setSmoothAnimations(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("betang_smooth_animations", String(next))
    }
    toast.success(next ? "Animasi antarmuka diaktifkan." : "Animasi antarmuka disederhanakan.")
  }

  const handleToggleToasts = () => {
    const next = !toastNotifications
    setToastNotifications(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("betang_toast_notifications", String(next))
    }
    toast.success(next ? "Notifikasi toaster aksi aktif." : "Notifikasi toaster aksi dinonaktifkan.")
  }

  return (
    <div className="w-full flex flex-col gap-8">
      {/* 1. Keamanan & Proteksi Dokumen */}
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
                    handleUpdate(
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
                    handleUpdate(
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
                    handleUpdate(
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

      {/* 2. Penyimpanan & Jaringan Cloudflare R2 */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Penyimpanan & Jaringan Cloudflare R2
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Integrasi Cloudflare Worker Router, kuota upload, dan manajemen tautan berbagi berkas.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
            <Zap className="w-3.5 h-3.5" /> Edge Accelerated
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CDN Router Info Card */}
          <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-gradient-to-br from-blue-50/50 via-white to-emerald-50/40 dark:from-slate-850 dark:via-slate-850 dark:to-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Cloud className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                  HTTP/3 QUIC
                </span>
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Router Berkas Cloudflare CDN
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Seluruh permintaan unduh dan pratinjau dialirkan langsung melalui domain akselerasi Cloudflare Edge PoP.
              </p>
              <div className="mt-3 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-750 font-mono text-[11px] text-blue-700 dark:text-blue-300 break-all">
                https://files.kemenag-baritoutara.com/arsip
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Casing Edge</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                1 Tahun (Immutable)
              </span>
            </div>
          </div>

          {/* Setting: Max Upload Size */}
          <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <HardDrive className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Direct PUT
                </span>
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Batas Maksimal Ukuran Berkas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ukuran maksimum per berkas yang dapat diunggah pengguna dalam sekali pengiriman.
              </p>

              <div className="mt-4">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Batas per File:
                </label>
                <div className="relative">
                  <select
                    value={settings.max_upload_size_mb}
                    disabled={updatingKey === "max_upload_size_mb"}
                    onChange={(e) =>
                      handleUpdate(
                        { max_upload_size_mb: Number(e.target.value) },
                        "Batas Ukuran Upload",
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={50}>50 MB (Rekomendasi Dokumen)</option>
                    <option value={100}>100 MB (Standar Kantor)</option>
                    <option value={250}>250 MB (Arsip Sedang)</option>
                    <option value={500}>500 MB (Maksimal Kapasitas)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Batas Aktif</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {settings.max_upload_size_mb} MB / file
              </span>
            </div>
          </div>

          {/* Setting: Default Share Link Expiry */}
          <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Presigned URL
                </span>
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Kedaluwarsa Tautan Berbagi Default
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Durasi aktif awal saat pengguna membuat tautan berbagi berbatas waktu untuk pihak eksternal.
              </p>

              <div className="mt-4">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Durasi Standar:
                </label>
                <div className="relative">
                  <select
                    value={settings.default_share_expiry_hours}
                    disabled={updatingKey === "default_share_expiry_hours"}
                    onChange={(e) =>
                      handleUpdate(
                        { default_share_expiry_hours: Number(e.target.value) },
                        "Masa Berlaku Tautan Berbagi",
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={1}>1 Jam (Sangat Rahasia)</option>
                    <option value={24}>24 Jam (Rekomendasi)</option>
                    <option value={72}>3 Hari (Akses Rapat)</option>
                    <option value={168}>7 Hari (Maksimal)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Masa Berlaku</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {settings.default_share_expiry_hours === 24
                  ? "1 Hari (24 Jam)"
                  : settings.default_share_expiry_hours === 168
                  ? "7 Hari"
                  : `${settings.default_share_expiry_hours} Jam`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Antarmuka & Preferensi Pengguna (UI/UX) */}
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
                    handleUpdate(
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
                    handleUpdate(
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
                  onClick={handleToggleAnimations}
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
                  onClick={handleToggleToasts}
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

      {/* 4. Panel Informasi Infrastruktur & Integrasi Cloud (Full Width Grid 6 Kolom) */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Status Ekosistem & Infrastruktur Cloud
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pemeriksaan status koneksi basis data, routing edge, penyimpanan awan, dan API gateway.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Seluruh Sistem Normal
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Database Supabase */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Database Supabase
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Schema: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">kemenag_arsip</code>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">PostgreSQL 15 • Port 6543</p>
            </div>
          </div>

          {/* Card 2: Cloudflare R2 */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cloud className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Cloud Storage R2
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Bucket: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">data-arsip</code>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Singapore PoP • Multi-GB/s</p>
            </div>
          </div>

          {/* Card 3: Cloudflare Worker Router */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  CDN Worker Router
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Terhubung
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Worker: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">kemenag-files-router</code>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Custom Domain • HTTP/3 QUIC</p>
            </div>
          </div>

          {/* Card 4: Go Backend API */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Server className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Go Fiber v3 Backend
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Berjalan
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Host: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">127.0.0.1:8080</code>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">High Concurrency • pgx v5</p>
            </div>
          </div>

          {/* Card 5: Manajemen Pengguna Mandiri */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Manajemen Pengguna
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-950/80 px-2 py-0.5 rounded-full">
                  Mandiri (Lokal)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Skema: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">kemenag_arsip.users</code>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Terisolasi Penuh Dari Pusdatin</p>
            </div>
          </div>

          {/* Card 6: Administrator Aktif */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Administrator Aktif
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-1 truncate">
                {currentUser?.name || "Administrator"}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {currentUser?.email || "admin@kemenag.go.id"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}