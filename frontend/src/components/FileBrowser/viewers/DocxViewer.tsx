import { useState, useEffect, useRef } from "react"
import {
  FileText,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Printer,
} from "lucide-react"
import { openInDesktopOffice } from "@/lib/officeUri"

interface DocxViewerProps {
  fileUrl: string
  fileName: string
  fileId?: string
}

export function DocxViewer({ fileUrl, fileName, fileId }: DocxViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [pageCount, setPageCount] = useState(0)
  const docxContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setPageCount(0)

    async function loadDocx() {
      try {
        const { renderAsync } = await import("docx-preview")
        const res = await fetch(fileUrl, { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Gagal mengunduh dokumen (${res.status} ${res.statusText})`)
        }
        const buffer = await res.arrayBuffer()

        if (!active || !docxContainerRef.current) return

        // Bersihkan kontainer sebelumnya
        docxContainerRef.current.innerHTML = ""

        // Render dokumen dengan opsi tata letak penuh (menjaga format kertas asli: A4, F4/Folio, Letter, Landscape/Portrait)
        await renderAsync(buffer, docxContainerRef.current, undefined, {
          className: "docx-render",
          inWrapper: true,
          ignoreWidth: false, // Menjaga ukuran kertas asli berkas (A4, Folio/F4, Letter, dll)
          ignoreHeight: false, // Menjaga tinggi halaman asli
          ignoreFonts: false,
          breakPages: true, // Membagi halaman sesuai page-break asli Word
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          useBase64URL: false,
          renderHeaders: true, // Render kop surat & header naskah dinas
          renderFooters: true, // Render nomor halaman & catatan kaki
          renderFootnotes: true,
          renderEndnotes: true,
          debug: false,
        })

        if (!active) return

        // Hitung total halaman yang berhasil dirender
        if (docxContainerRef.current) {
          const pages = docxContainerRef.current.querySelectorAll(".docx-render > section, .docx-wrapper > section")
          setPageCount(pages.length || 1)
        }
      } catch (err: any) {
        if (!active) return
        console.error("Gagal merender dokumen DOCX:", err)
        setError(err.message || "Gagal memproses dan merender berkas dokumen Word.")
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDocx()

    return () => {
      active = false
    }
  }, [fileUrl])

  const handlePrint = () => {
    window.print()
  }

  const handleOpenWord = () => {
    openInDesktopOffice(
      fileUrl,
      fileName,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileId
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-text">
      {/* Word Ribbon Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-blue-900/90 border-b border-blue-800 text-xs shrink-0 select-none">
        {/* Left: Format badge & document info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-700/80 font-bold text-xs shrink-0 shadow-xs">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Microsoft Word</span>
          </div>
          <span className="text-xs text-blue-100/90 truncate max-w-[220px] hidden md:inline font-medium" title={fileName}>
            {fileName}
          </span>
          {pageCount > 0 && (
            <span className="text-[11px] text-blue-200/80 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60 hidden sm:inline">
              {pageCount} Halaman
            </span>
          )}
        </div>

        {/* Right: Actions (Buka di Word, Zoom, Print) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Tombol Utama: Buka di Microsoft Word Desktop */}
          <button
            type="button"
            onClick={handleOpenWord}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            title="Buka dan edit langsung di aplikasi Microsoft Word di komputer Anda"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka di Microsoft Word</span>
          </button>

          {/* Tombol Cetak / Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-950/70 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-700/60 transition-colors cursor-pointer"
            title="Cetak Dokumen"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-blue-950/70 border border-blue-700/60 rounded-xl p-0.5 text-xs text-blue-200">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
              className="p-1 hover:text-white cursor-pointer disabled:opacity-30"
              disabled={zoomLevel <= 60}
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono min-w-[38px] text-center font-semibold">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
              className="p-1 hover:text-white cursor-pointer disabled:opacity-30"
              disabled={zoomLevel >= 160}
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1 hover:text-white cursor-pointer border-l border-blue-700/60 ml-0.5"
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document View Canvas Container */}
      <div className="flex-1 overflow-auto bg-slate-200/90 dark:bg-slate-900/90 p-4 sm:p-8 flex justify-center relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs text-white gap-3 p-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-200">
              Mempersiapkan tata letak dokumen Word...
            </span>
            <span className="text-[11px] text-slate-400">
              Menyesuaikan ukuran kertas asli (A4 / F4 / Legal), margin, dan kop surat
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700 max-w-md my-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Gagal Menampilkan Dokumen</h3>
            <p className="mt-2 text-xs text-slate-400">{error}</p>
            <button
              type="button"
              onClick={handleOpenWord}
              className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka di Microsoft Word Desktop</span>
            </button>
          </div>
        )}

        {/* Paper Container dengan CSS Scoped untuk docx-preview */}
        <div
          ref={docxContainerRef}
          className={`docx-preview-root transition-transform origin-top ${loading ? "opacity-0" : "opacity-100"}`}
          style={{ transform: `scale(${zoomLevel / 100})` }}
        />
      </div>

      {/* Scoped CSS styling untuk docx-preview agar persis lembar kerja Word */}
      <style>{`
        .docx-preview-root {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .docx-wrapper > section.docx-render,
        .docx-wrapper > section {
          background: #ffffff !important;
          color: #1e293b !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          margin-bottom: 24px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 2px !important;
          box-sizing: border-box !important;
        }

        .docx-render table {
          border-collapse: collapse;
          width: 100%;
        }

        .docx-render td, .docx-render th {
          border: 1px solid #cbd5e1;
          padding: 4px 8px;
        }

        .docx-render p {
          margin-top: 0;
          margin-bottom: 0.5em;
          line-height: 1.45;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .docx-preview-root, .docx-preview-root * {
            visibility: visible;
          }
          .docx-preview-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
