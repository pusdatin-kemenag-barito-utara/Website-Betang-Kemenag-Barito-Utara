import { Cloud, Zap, HardDrive, Clock } from "lucide-react"
import type { AppSettings } from "@/lib/api"
import { ModernSelect } from "@/components/ui/ModernSelect"

const MAX_UPLOAD_OPTIONS = [
  { value: 50, label: "50 MB (Rekomendasi Dokumen)" },
  { value: 100, label: "100 MB (Standar Kantor)" },
  { value: 250, label: "250 MB (Arsip Sedang)" },
  { value: 500, label: "500 MB (Maksimal Kapasitas)" },
];

const SHARE_EXPIRY_OPTIONS = [
  { value: 1, label: "1 Jam (Sangat Rahasia)" },
  { value: 24, label: "24 Jam (Rekomendasi)" },
  { value: 72, label: "3 Hari (Akses Rapat)" },
  { value: 168, label: "7 Hari (Maksimal)" },
];

interface CloudStorageSectionProps {
  settings: AppSettings
  updatingKey: string | null
  onUpdate: (patch: Partial<AppSettings>, keyLabel: string) => Promise<void>
}

export function CloudStorageSection({
  settings,
  updatingKey,
  onUpdate,
}: CloudStorageSectionProps) {
  return (
    <div className="w-full rounded-3xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 relative z-20">
      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-6 py-4 flex items-center justify-between rounded-t-3xl">
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
            <div className="mt-3 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-750 font-medium text-[11px] text-blue-700 dark:text-blue-300 break-all">
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
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 flex flex-col justify-between relative">
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
              <ModernSelect
                value={settings.max_upload_size_mb}
                disabled={updatingKey === "max_upload_size_mb"}
                onChange={(val) =>
                  onUpdate(
                    { max_upload_size_mb: Number(val) },
                    "Batas Ukuran Upload",
                  )
                }
                options={MAX_UPLOAD_OPTIONS}
                className="w-full"
                triggerClassName="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs"
                dropdownClassName="w-full"
                title="Pilih batas ukuran upload per file"
              />
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
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 flex flex-col justify-between relative">
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
              <ModernSelect
                value={settings.default_share_expiry_hours}
                disabled={updatingKey === "default_share_expiry_hours"}
                onChange={(val) =>
                  onUpdate(
                    { default_share_expiry_hours: Number(val) },
                    "Masa Berlaku Tautan Berbagi",
                  )
                }
                options={SHARE_EXPIRY_OPTIONS}
                className="w-full"
                triggerClassName="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs"
                dropdownClassName="w-full"
                title="Pilih masa berlaku tautan berbagi"
              />
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
  )
}
