import { PageBanner } from "@/components/ui/PageBanner"
import { LayoutDashboard, FileText, HardDrive, Clock, CalendarDays } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getSplitBytes(bytes: number) {
  const formatted = formatBytes(bytes)
  const parts = formatted.split(' ')
  return { value: parts[0], unit: parts[1] || '' }
}

function getIconForMimeType(mimeType: string | null) {
  if (!mimeType) return <FileText className="h-5 w-5 text-slate-500" />
  if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-rose-500" />
  if (mimeType.includes("image")) return <FileText className="h-5 w-5 text-emerald-500" /> // Using FileText for image as generic fallback since ImageIcon is not imported
  return <FileText className="h-5 w-5 text-slate-500" />
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: metadata } = await supabase
    .rpc('get_pusdatin_user', { email_address: user.email })

  const isSuperAdmin = metadata?.role === 'super_admin'

  const queryFiles = supabase
    .from('files')
    .select('id, size_bytes, created_at, name, mime_type', { count: 'exact' })
    .is('deleted_at', null)

  // TODO: Implement bidang_id mapping if needed. For now, operators see all their allowed files (or we can filter by owner)
  if (!isSuperAdmin) {
    // Currently, without bidang_id, we might not filter or filter by user_id
    // queryFiles = queryFiles.eq('user_id', user.id) // Example if we want to restrict
  }

  const { data: allFiles, count: totalFiles } = await queryFiles

  const totalStorage = allFiles?.reduce((acc, file) => acc + (file.size_bytes || 0), 0) || 0
  const storageFormatted = getSplitBytes(totalStorage)
  
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  const recentFilesCount = allFiles?.filter(f => new Date(f.created_at) > oneDayAgo).length || 0

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const thisMonthFilesCount = allFiles?.filter(f => new Date(f.created_at) > startOfMonth).length || 0

  // Recent 5 uploads
  const recentUploads = [...(allFiles || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageBanner
        title="Dashboard Statistik"
        description="Ringkasan penggunaan sistem E-Arsip Kementerian Agama Kabupaten Barito Utara"
        icon={<LayoutDashboard className="h-8 w-8 text-white" />}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 w-full">
        <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-8 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-emerald-100 flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mt-4 -mr-4 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-emerald-50 opacity-50 transition-transform group-hover:scale-150" />
          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase truncate">Total Dokumen</p>
              <h3 className="mt-1 sm:mt-2 text-xl sm:text-4xl font-black text-slate-900 truncate">{totalFiles || 0}</h3>
            </div>
            <div className="flex-shrink-0 flex h-8 w-8 sm:h-16 sm:w-16 items-center justify-center rounded-lg sm:rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner">
              <FileText className="h-4 w-4 sm:h-8 sm:w-8" />
            </div>
          </div>
          <div className="relative mt-3 sm:mt-6 flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-medium text-emerald-600 min-w-0">
            <span className="truncate block w-full">Data {isSuperAdmin ? "Seluruh Kemenag" : "Bidang Anda"}</span>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-8 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-blue-100 flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mt-4 -mr-4 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-blue-50 opacity-50 transition-transform group-hover:scale-150" />
          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase truncate">Total Storage</p>
              <h3 className="mt-1 sm:mt-2 text-xl sm:text-4xl font-black text-slate-900 truncate">
                {storageFormatted.value} <span className="text-[10px] sm:text-xl text-slate-400">{storageFormatted.unit}</span>
              </h3>
            </div>
            <div className="flex-shrink-0 flex h-8 w-8 sm:h-16 sm:w-16 items-center justify-center rounded-lg sm:rounded-2xl bg-blue-100 text-blue-600 shadow-inner">
              <HardDrive className="h-4 w-4 sm:h-8 sm:w-8" />
            </div>
          </div>
          <div className="relative mt-3 sm:mt-6 flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-medium text-slate-500 min-w-0">
            <span className="truncate block w-full">Kapasitas Terpakai</span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-8 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-orange-100 flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mt-4 -mr-4 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-orange-50 opacity-50 transition-transform group-hover:scale-150" />
          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase truncate">Baru Diunggah</p>
              <h3 className="mt-1 sm:mt-2 text-xl sm:text-4xl font-black text-slate-900 truncate">{recentFilesCount}</h3>
            </div>
            <div className="flex-shrink-0 flex h-8 w-8 sm:h-16 sm:w-16 items-center justify-center rounded-lg sm:rounded-2xl bg-orange-100 text-orange-600 shadow-inner">
              <Clock className="h-4 w-4 sm:h-8 sm:w-8" />
            </div>
          </div>
          <div className="relative mt-3 sm:mt-6 flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-medium text-slate-500 min-w-0">
            <span className="truncate block w-full">Dalam 24 jam terakhir</span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-8 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-lg hover:ring-purple-100 flex flex-col justify-between">
          <div className="absolute right-0 top-0 -mt-4 -mr-4 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-purple-50 opacity-50 transition-transform group-hover:scale-150" />
          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase truncate">Bulan Ini</p>
              <h3 className="mt-1 sm:mt-2 text-xl sm:text-4xl font-black text-slate-900 truncate">{thisMonthFilesCount}</h3>
            </div>
            <div className="flex-shrink-0 flex h-8 w-8 sm:h-16 sm:w-16 items-center justify-center rounded-lg sm:rounded-2xl bg-purple-100 text-purple-600 shadow-inner">
              <CalendarDays className="h-4 w-4 sm:h-8 sm:w-8" />
            </div>
          </div>
          <div className="relative mt-3 sm:mt-6 flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-medium text-slate-500 min-w-0">
            <span className="truncate block w-full">Dokumen diunggah bulan ini</span>
          </div>
        </div>
      </div>

      {/* Recent Uploads Table Placeholder */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 md:px-8 py-6 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Dokumen Terbaru</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Aktivitas unggahan terakhir di sistem E-Arsip</p>
          </div>
        </div>
        
        {recentUploads.length === 0 ? (
          <div className="p-8">
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <FileText className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">Belum ada dokumen</p>
              <p className="mt-1 text-xs text-slate-400">Dokumen yang baru diunggah akan muncul di sini</p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="hidden md:flex w-full bg-slate-50/90 border-b border-slate-100">
              <div className="w-1/2 px-4 md:px-8 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Nama Dokumen</div>
              <div className="w-1/4 px-4 md:px-8 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Ukuran</div>
              <div className="w-1/4 px-4 md:px-8 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase text-right">Waktu Unggah</div>
            </div>
            <div className="flex flex-col divide-y divide-slate-50">
              {recentUploads.map((file) => (
                <div key={file.id} className="flex flex-col md:flex-row md:items-center hover:bg-slate-50/50 transition-colors py-3 md:py-0">
                  <div className="w-full md:w-1/2 px-4 md:px-8 py-1 md:py-3 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {getIconForMimeType(file.mime_type)}
                    </div>
                    <span className="font-semibold text-slate-700 text-sm truncate">{file.name}</span>
                  </div>
                  <div className="w-full md:w-1/4 px-4 md:px-8 py-1 md:py-3 text-sm text-slate-500">
                    <span className="md:hidden text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Ukuran:</span>
                    {formatBytes(file.size_bytes)}
                  </div>
                  <div className="w-full md:w-1/4 px-4 md:px-8 py-1 md:py-3 text-sm text-slate-500 md:text-right">
                    <span className="md:hidden text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Waktu:</span>
                    {new Date(file.created_at).toLocaleDateString("id-ID", { 
                      day: "numeric", 
                      month: "short", 
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
