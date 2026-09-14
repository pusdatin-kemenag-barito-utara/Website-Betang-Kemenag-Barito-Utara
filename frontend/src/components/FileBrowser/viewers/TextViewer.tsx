import { FileText, Loader2, AlertCircle } from "lucide-react"

interface TextViewerProps {
  textContent: string | null
  textLoading: boolean
  textError: string | null
}

export function TextViewer({ textContent, textLoading, textError }: TextViewerProps) {
  if (textLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-white gap-3 py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-xs font-semibold text-slate-300">
          Membaca isi berkas teks...
        </span>
      </div>
    )
  }

  if (textError) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Gagal Membaca Berkas Teks</h3>
        <p className="mt-2 text-xs text-slate-400 max-w-md">{textError}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-text">
      {/* Mini info bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-300">Dokumen Teks / Plain Text</span>
        </div>
        <span>
          {textContent !== null
            ? `${textContent.split("\n").length} baris • ${new Intl.NumberFormat().format(textContent.length)} karakter`
            : ""}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar bg-slate-950">
        <pre className="font-mono text-xs md:text-[13px] leading-relaxed text-slate-200 whitespace-pre-wrap break-all select-text font-normal">
          <code>{textContent ?? ""}</code>
        </pre>
      </div>
    </div>
  )
}
