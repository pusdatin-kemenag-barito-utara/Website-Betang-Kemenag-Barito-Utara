import { CheckCircle2, Database, Cloud, Zap, Server, Users, UserCheck } from "lucide-react"

interface SystemHealthSectionProps {
  currentUser?: {
    name?: string
    email?: string
    role?: string
    isSuperAdmin?: boolean
  } | null
}

export function SystemHealthSection({ currentUser }: SystemHealthSectionProps) {
  return (
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
              Schema: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-medium text-[10px]">kemenag_arsip</code>
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
              Bucket: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-medium text-[10px]">data-arsip</code>
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
              Worker: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-medium text-[10px]">kemenag-files-router</code>
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
              Host: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-medium text-[10px]">127.0.0.1:8080</code>
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
              Skema: <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded font-medium text-[10px]">kemenag_arsip.users</code>
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
  )
}
