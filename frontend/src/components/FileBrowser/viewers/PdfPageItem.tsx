import { useEffect, useState, useRef } from "react"
import { Loader2 } from "lucide-react"

interface PdfPageItemProps {
  pdfDoc: any
  pageNumber: number
  scale: number
  rotation: number
  onInView: (page: number) => void
}

/**
 * Individual Page Item for Continuous Vertical Scrolling.
 * Uses IntersectionObserver to lazily render pages as the user scrolls down.
 */
export function PdfPageItem({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  onInView,
}: PdfPageItemProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [rendered, setRendered] = useState(false)
  const [isVisible, setIsVisible] = useState(pageNumber <= 2)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 320,
    height: 450,
  })
  const renderTaskRef = useRef<any>(null)

  // Observe when this page comes into view during scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true)
            onInView(pageNumber)
          }
        }
      },
      { rootMargin: "400px 0px" }, // Preload 400px before scrolling into viewport
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [pageNumber, onInView])

  // Render page onto canvas
  useEffect(() => {
    if (!pdfDoc || !isVisible) return
    let active = true

    ;(async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNumber)
        if (!active) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const containerWidth =
          canvas.parentElement?.parentElement?.clientWidth || window.innerWidth
        const unscaledViewport = page.getViewport({ scale: 1, rotation })

        // On large screens, cap the base width at 860px for a comfortable reading layout
        const targetWidth = Math.min(containerWidth - 32, 860)
        const fitScale = Math.max(0.4, targetWidth / unscaledViewport.width)
        const effectiveScale = fitScale * scale

        const viewport = page.getViewport({ scale: effectiveScale, rotation })
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

        canvas.width = Math.floor(viewport.width * pixelRatio)
        canvas.height = Math.floor(viewport.height * pixelRatio)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        setDimensions({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        })

        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform,
        })
        renderTaskRef.current = renderTask
        await renderTask.promise
        if (active) setRendered(true)
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNumber}:`, err)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [pdfDoc, pageNumber, scale, rotation, isVisible])

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      ref={containerRef}
      className="relative my-2.5 mx-auto bg-white shadow-2xl rounded-lg overflow-hidden flex items-center justify-center transition-all shrink-0 ring-1 ring-black/5"
      style={{ minHeight: dimensions.height, width: dimensions.width }}
    >
      <canvas ref={canvasRef} className="block max-w-full" />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 text-zinc-300 text-xs font-semibold">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
          <span>Memuat Halaman {pageNumber}...</span>
        </div>
      )}
      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium pointer-events-none select-none backdrop-blur-xs">
        {pageNumber}
      </div>
    </div>
  )
}
