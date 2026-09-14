import { Download } from "lucide-react"

interface UnsupportedViewerProps {
  onDownload: () => void
}

export function UnsupportedViewer({ onDownload }: UnsupportedViewerProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-700 text-slate-400 mb-4">
        <Download className="h-10 w-10" />
      </div>
      <h3 className="text-base font-bold text-slate-100">Pratinjau Tidak Tersedia</h3>
      <p className="mt-2 text-xs text-slate-400 max-w-xs">
        Browser tidak mendukung pratinjau langsung untuk format berkas ini. Silakan unduh dokumen untuk melihat isinya.
      </p>
      <button
        type="button"
        onClick={onDownload}
        className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition-colors cursor-pointer"
      >
        <Download className="h-4 w-4" />
        <span>Unduh Berkas</span>
      </button>
    </div>
  )
}
