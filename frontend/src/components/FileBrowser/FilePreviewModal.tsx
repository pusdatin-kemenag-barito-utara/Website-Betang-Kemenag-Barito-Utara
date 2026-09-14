import { useEffect, useState, useRef, useCallback } from "react"
import {
  X,
  ExternalLink,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { PdfViewer } from "./viewers/PdfViewer"
import { ImageViewer } from "./viewers/ImageViewer"
import { TextViewer } from "./viewers/TextViewer"
import { UnsupportedViewer } from "./viewers/UnsupportedViewer"

export interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string | null
  fileName: string
  mimeType: string
  isLoading?: boolean
  error?: string | null
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  mimeType,
  isLoading = false,
  error = null,
}: FilePreviewModalProps) {
  const [viewMode, setViewMode] = useState<"iframe" | "canvas">("iframe")
  const [iframeLoading, setIframeLoading] = useState(true)

  // Canvas (PDF.js) multi-page continuous scroll states
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [activePage, setActivePage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [canvasLoading, setCanvasLoading] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const isPdf =
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf") ||
    Boolean(fileUrl?.toLowerCase().includes(".pdf"))

  const isImage = mimeType.startsWith("image/")

  const isText =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "application/xml" ||
    /\.(txt|log|csv|tsv|json|md|yaml|yml|xml|html|js|ts|css|sql|sh|env)$/i.test(fileName) ||
    Boolean(fileUrl && /\.(txt|log|csv|tsv|json|md|yaml|yml|xml|html|js|ts|css|sql|sh|env)(\?|$)/i.test(fileUrl))

  // Text viewer states
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Detect device on open (Paritas PPID Kemenag)
  useEffect(() => {
    if (!isOpen) return

    let shouldUseCanvas = false
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || ""
      const isAppleMac = /Macintosh|Mac OS X|MacBook/i.test(ua)
      const isMobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      shouldUseCanvas = isAppleMac || isMobile
    }

    setViewMode(shouldUseCanvas ? "canvas" : "iframe")
    setIframeLoading(true)
    setActivePage(1)
    setScale(1.0)
    setRotation(0)
  }, [isOpen, fileUrl])

  // Safety timeout agar loading overlay iframe tidak menggantung jika browser tidak memicu event onLoad
  useEffect(() => {
    if (!isOpen || !iframeLoading) return
    const timer = setTimeout(() => {
      setIframeLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [isOpen, iframeLoading])

  // Load document via PDF.js when viewMode is 'canvas'
  useEffect(() => {
    if (!isOpen || !fileUrl || !isPdf || viewMode !== "canvas") return
    let active = true
    setCanvasLoading(true)

    ;(async () => {
      try {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc =
          window.location.origin + "/pdf.worker.min.mjs"

        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          cMapUrl: window.location.origin + "/cmaps/",
          cMapPacked: true,
        })

        const loadedDoc = await loadingTask.promise
        if (!active) return
        setPdfDoc(loadedDoc)
        setNumPages(loadedDoc.numPages)
        setActivePage(1)
      } catch (err) {
        console.warn("Gagal memuat via PDF.js canvas, otomatis beralih ke native iframe:", err)
        if (active) {
          setViewMode("iframe")
        }
      } finally {
        if (active) setCanvasLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [isOpen, fileUrl, isPdf, viewMode])

  // Fetch text file content when previewing text-based files
  useEffect(() => {
    if (!isOpen || !fileUrl || !isText) {
      setTextContent(null)
      setTextError(null)
      setIsCopied(false)
      return
    }

    let active = true
    setTextLoading(true)
    setTextError(null)
    setIsCopied(false)

    fetch(fileUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Gagal mengambil berkas teks (${res.status} ${res.statusText})`)
        }
        return res.text()
      })
      .then((text) => {
        if (!active) return
        setTextContent(text)
      })
      .catch((err) => {
        if (!active) return
        console.error("Gagal membaca berkas teks:", err)
        setTextError(err instanceof Error ? err.message : "Gagal membaca berkas teks dari server.")
      })
      .finally(() => {
        if (active) setTextLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, fileUrl, isText])

  const handleCopyText = async () => {
    if (!textContent) return
    try {
      await navigator.clipboard.writeText(textContent)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Gagal menyalin teks:", err)
    }
  }

  const handlePageInView = useCallback((page: number) => {
    setActivePage(page)
  }, [])

  const scrollToPage = (page: number) => {
    const target = Math.max(1, Math.min(numPages, page))
    const el = document.getElementById(`pdf-page-${target}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const handleDownload = () => {
    if (!fileUrl) return
    trackEvent("preview_download_click", {
      file_name: fileName,
      mime_type: mimeType,
    })
    const a = document.createElement("a")
    a.href = fileUrl
    a.download = fileName
    a.target = "_blank"
    a.rel = "noreferrer"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border-0 md:border md:border-slate-200 dark:md:border-slate-800 rounded-none md:rounded-2xl w-full h-full md:w-[95vw] md:max-w-[1400px] md:h-[93vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none shrink-0 gap-2">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-xs md:text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate max-w-[200px] sm:max-w-md md:max-w-xl">
              {fileName || "Pratinjau Dokumen"}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate uppercase tracking-wider">
              {mimeType}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mode Switcher (PDF) */}
            {isPdf && fileUrl && !error && (
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "iframe" ? "canvas" : "iframe")}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title={
                  viewMode === "iframe"
                    ? "Ganti ke mode lembar dokumen (Canvas)"
                    : "Ganti ke mode penampil standar (Native)"
                }
              >
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden md:inline">
                  {viewMode === "iframe" ? "Mode Lembar" : "Mode Standar"}
                </span>
              </button>
            )}

            {/* Tombol Salin Teks */}
            {isText && textContent !== null && (
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="Salin seluruh isi berkas"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="hidden sm:inline">Salin Teks</span>
                  </>
                )}
              </button>
            )}

            {/* Buka di Tab Baru */}
            {fileUrl && !error && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="Buka dokumen di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">Buka di Tab Baru</span>
              </a>
            )}

            {/* Tombol Tutup X Merah */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors cursor-pointer shadow-xs"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 bg-zinc-900 relative w-full h-full overflow-hidden flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900 text-white gap-3 p-8">
              <Loader2 className="w-8 h-8 text-[#007144] animate-spin" />
              <span className="text-xs font-semibold text-zinc-300">
                Menyiapkan pratinjau berkas...
              </span>
            </div>
          )}

          {(error || (!isLoading && !fileUrl)) && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="flex flex-col items-center max-w-md text-center p-8 rounded-3xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xl m-4 border border-slate-200 dark:border-slate-700">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 mb-4">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Pratinjau Tidak Tersedia</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {error ||
                    "Tautan pratinjau berkas tidak dapat diakses saat ini. Silakan unduh dokumen untuk melihat isinya."}
                </p>
                {fileUrl && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Unduh Dokumen</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {!isLoading && !error && fileUrl && (
            <>
              {isPdf ? (
                <PdfViewer
                  fileUrl={fileUrl}
                  fileName={fileName}
                  viewMode={viewMode}
                  pdfDoc={pdfDoc}
                  activePage={activePage}
                  numPages={numPages}
                  scale={scale}
                  rotation={rotation}
                  canvasLoading={canvasLoading}
                  iframeLoading={iframeLoading}
                  scrollContainerRef={scrollContainerRef}
                  onIframeLoad={() => setIframeLoading(false)}
                  onIframeError={() => {
                    setIframeLoading(false)
                    setViewMode("canvas")
                  }}
                  onScrollToPage={scrollToPage}
                  onScaleChange={setScale}
                  onRotationChange={setRotation}
                  onPageInView={handlePageInView}
                />
              ) : isImage ? (
                <ImageViewer fileUrl={fileUrl} fileName={fileName} />
              ) : isText ? (
                <TextViewer
                  textContent={textContent}
                  textLoading={textLoading}
                  textError={textError}
                />
              ) : (
                <UnsupportedViewer onDownload={handleDownload} />
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 md:px-6 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
            Dokumen resmi E-Arsip SI BETANG Kemenag Barito Utara
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}