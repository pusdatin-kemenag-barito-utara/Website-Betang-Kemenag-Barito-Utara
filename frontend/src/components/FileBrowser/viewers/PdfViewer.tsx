import type { RefObject } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
} from "lucide-react"
import { PdfPageItem } from "./PdfPageItem"

interface PdfViewerProps {
  fileUrl: string
  fileName: string
  viewMode: "iframe" | "canvas"
  pdfDoc: any
  activePage: number
  numPages: number
  scale: number
  rotation: number
  canvasLoading: boolean
  iframeLoading: boolean
  scrollContainerRef: RefObject<HTMLDivElement | null>
  onIframeLoad: () => void
  onIframeError: () => void
  onScrollToPage: (page: number) => void
  onScaleChange: (updater: (s: number) => number) => void
  onRotationChange: (updater: (r: number) => number) => void
  onPageInView: (page: number) => void
}

export function PdfViewer({
  fileUrl,
  fileName,
  viewMode,
  pdfDoc,
  activePage,
  numPages,
  scale,
  rotation,
  canvasLoading,
  iframeLoading,
  scrollContainerRef,
  onIframeLoad,
  onIframeError,
  onScrollToPage,
  onScaleChange,
  onRotationChange,
  onPageInView,
}: PdfViewerProps) {
  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
      {/* Floating Canvas Control Toolbar (Ketika viewMode === 'canvas') */}
      {viewMode === "canvas" && (
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/95 text-white border-b border-zinc-800 select-none shrink-0 text-xs gap-2">
          {/* Pagination Controls with Smooth Scroll */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onScrollToPage(activePage - 1)}
              disabled={activePage <= 1 || canvasLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors cursor-pointer"
              title="Gulir ke Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-zinc-300 text-[11px] whitespace-nowrap">
              {canvasLoading ? "Memuat..." : `Hal ${activePage} / ${numPages || 1}`}
            </span>
            <button
              type="button"
              onClick={() => onScrollToPage(activePage + 1)}
              disabled={activePage >= numPages || canvasLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors cursor-pointer"
              title="Gulir ke Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom & Rotation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onScaleChange((s) => Math.max(0.5, Number((s - 0.2).toFixed(1))))}
              disabled={scale <= 0.5 || canvasLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors cursor-pointer"
              title="Perkecil (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-medium text-zinc-400 min-w-[36px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onScaleChange((s) => Math.min(2.5, Number((s + 0.2).toFixed(1))))}
              disabled={scale >= 2.5 || canvasLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors cursor-pointer"
              title="Perbesar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onRotationChange((r) => (r + 90) % 360)}
              disabled={canvasLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              title="Putar Dokumen"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Viewer Content */}
      <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
        {viewMode === "iframe" ? (
          <>
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900 text-white gap-3 pointer-events-none transition-opacity duration-300">
                <Loader2 className="w-8 h-8 text-[#007144] animate-spin" />
                <span className="text-xs font-semibold text-zinc-300">
                  Menyiapkan penampil dokumen PDF...
                </span>
              </div>
            )}
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1`}
              onLoad={onIframeLoad}
              onError={onIframeError}
              className="w-full h-full border-0 flex-1 bg-zinc-800"
              title={fileName}
            />
          </>
        ) : (
          <div
            ref={scrollContainerRef}
            className="w-full flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 bg-zinc-950 flex flex-col items-center scroll-smooth"
          >
            {canvasLoading ? (
              <div className="flex flex-col items-center justify-center text-white gap-3 py-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-xs font-semibold text-zinc-300">
                  Memuat lembar dokumen PDF...
                </span>
              </div>
            ) : numPages > 0 ? (
              <div className="w-full flex flex-col items-center py-2">
                {Array.from({ length: numPages }, (_, index) => (
                  <PdfPageItem
                    key={`page-${index + 1}`}
                    pdfDoc={pdfDoc}
                    pageNumber={index + 1}
                    scale={scale}
                    rotation={rotation}
                    onInView={onPageInView}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
