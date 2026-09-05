import { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  ExternalLink,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  AlertCircle,
  ImageOff,
  Copy,
  Check,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
  mimeType: string;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Individual Page Item for Continuous Vertical Scrolling.
 * Uses IntersectionObserver to lazily render pages as the user scrolls down.
 */
function PdfPageItem({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  onInView,
}: {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  rotation: number;
  onInView: (page: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 320,
    height: 450,
  });
  const renderTaskRef = useRef<any>(null);

  // Observe when this page comes into view during scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            onInView(pageNumber);
          }
        }
      },
      { rootMargin: "400px 0px" }, // Preload 400px before scrolling into viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onInView]);

  // Render page onto canvas
  useEffect(() => {
    if (!pdfDoc || !isVisible) return;
    let active = true;

    (async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const containerWidth =
          canvas.parentElement?.parentElement?.clientWidth || window.innerWidth;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });

        // On large screens, cap the base width at 860px for a comfortable reading layout
        const targetWidth = Math.min(containerWidth - 32, 860);
        const fitScale = Math.max(0.4, targetWidth / unscaledViewport.width);
        const effectiveScale = fitScale * scale;

        const viewport = page.getViewport({ scale: effectiveScale, rotation });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        setDimensions({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        });

        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (active) setRendered(true);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber, scale, rotation, isVisible]);

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
      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono pointer-events-none select-none backdrop-blur-xs">
        {pageNumber}
      </div>
    </div>
  );
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
  const [viewMode, setViewMode] = useState<"iframe" | "canvas">("iframe");
  const [iframeLoading, setIframeLoading] = useState(true);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  // Canvas (PDF.js) multi-page continuous scroll states
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [activePage, setActivePage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [canvasLoading, setCanvasLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isPdf =
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf") ||
    Boolean(fileUrl?.toLowerCase().includes(".pdf"));

  const isImage = mimeType.startsWith("image/");

  const isText =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "application/xml" ||
    /\.(txt|log|csv|tsv|json|md|yaml|yml|xml|html|js|ts|css|sql|sh|env)$/i.test(fileName) ||
    Boolean(fileUrl && /\.(txt|log|csv|tsv|json|md|yaml|yml|xml|html|js|ts|css|sql|sh|env)(\?|$)/i.test(fileUrl));

  // Text viewer states
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Detect device on open (Paritas PPID Kemenag):
  // - Mac / Simulator / Mobile: gunakan mode Lembar (Canvas)
  // - Windows / Desktop PC biasa: gunakan native iframe Chrome viewer
  useEffect(() => {
    if (!isOpen) return;

    let shouldUseCanvas = false;
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isAppleMac = /Macintosh|Mac OS X|MacBook/i.test(ua);

      const isMobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

      shouldUseCanvas = isAppleMac || isMobile;
    }

    setViewMode(shouldUseCanvas ? "canvas" : "iframe");
    setIframeLoading(true);
    setImgLoadFailed(false);
    setActivePage(1);
    setScale(1.0);
    setRotation(0);
  }, [isOpen, fileUrl]);

  // Safety timeout agar loading overlay iframe tidak menggantung selamanya bila browser tidak memicu event onLoad
  useEffect(() => {
    if (!isOpen || !iframeLoading) return;
    const timer = setTimeout(() => {
      setIframeLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isOpen, iframeLoading]);

  // Load document via PDF.js when viewMode is 'canvas'
  useEffect(() => {
    if (!isOpen || !fileUrl || !isPdf || viewMode !== "canvas") return;
    let active = true;
    setCanvasLoading(true);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc =
          window.location.origin + "/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          cMapUrl: window.location.origin + "/cmaps/",
          cMapPacked: true,
        });

        const loadedDoc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setActivePage(1);
      } catch (err) {
        console.warn("Gagal memuat via PDF.js canvas, otomatis beralih ke native iframe:", err);
        if (active) {
          setViewMode("iframe");
        }
      } finally {
        if (active) setCanvasLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, fileUrl, isPdf, viewMode]);

  // Fetch text file content when previewing text-based files
  useEffect(() => {
    if (!isOpen || !fileUrl || !isText) {
      setTextContent(null);
      setTextError(null);
      setIsCopied(false);
      return;
    }

    let active = true;
    setTextLoading(true);
    setTextError(null);
    setIsCopied(false);

    fetch(fileUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Gagal mengambil berkas teks (${res.status} ${res.statusText})`);
        }
        return res.text();
      })
      .then((text) => {
        if (!active) return;
        setTextContent(text);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Gagal membaca berkas teks:", err);
        setTextError(err instanceof Error ? err.message : "Gagal membaca berkas teks dari server.");
      })
      .finally(() => {
        if (active) setTextLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, fileUrl, isText]);

  const handleCopyText = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin teks:", err);
    }
  };

  const handlePageInView = useCallback((page: number) => {
    setActivePage(page);
  }, []);

  const scrollToPage = (page: number) => {
    const target = Math.max(1, Math.min(numPages, page));
    const el = document.getElementById(`pdf-page-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    trackEvent("preview_download_click", {
      file_name: fileName,
      mime_type: mimeType,
    });
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Modal Container: Fullscreen on mobile, rounded framed on desktop */}
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
            {/* Mode Switcher (Hanya untuk PDF) */}
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

            {/* Tombol Salin Teks (Hanya untuk Berkas Teks) */}
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

            {/* Tombol Tutup X Merah (Khas PPID) */}
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

        {/* Floating Canvas Control Toolbar (Ketika viewMode === 'canvas') */}
        {isPdf && viewMode === "canvas" && (
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/95 text-white border-b border-zinc-800 select-none shrink-0 text-xs gap-2">
            {/* Pagination Controls with Smooth Scroll */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollToPage(activePage - 1)}
                disabled={activePage <= 1 || canvasLoading}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors"
                title="Gulir ke Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-zinc-300 text-[11px] whitespace-nowrap">
                {canvasLoading ? "Memuat..." : `Hal ${activePage} / ${numPages || 1}`}
              </span>
              <button
                type="button"
                onClick={() => scrollToPage(activePage + 1)}
                disabled={activePage >= numPages || canvasLoading}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors"
                title="Gulir ke Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom & Rotation Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.2).toFixed(1))))}
                disabled={scale <= 0.5 || canvasLoading}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-zinc-400 min-w-[36px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.2).toFixed(1))))}
                disabled={scale >= 2.5 || canvasLoading}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 transition-colors"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                disabled={canvasLoading}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                title="Putar Dokumen"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
                viewMode === "iframe" ? (
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
                      onLoad={() => setIframeLoading(false)}
                      onError={() => {
                        setIframeLoading(false);
                        setViewMode("canvas");
                      }}
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
                            onInView={handlePageInView}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              ) : isImage ? (
                imgLoadFailed ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
                      <ImageOff className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-100">Gambar Tidak Dapat Dimuat</h3>
                    <p className="mt-2 text-xs text-slate-400 max-w-md">
                      Format gambar tidak didukung atau berkas belum dapat diakses dari server.
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 overflow-auto">
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-h-full max-w-full object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                      onError={() => setImgLoadFailed(true)}
                    />
                  </div>
                )
              ) : isText ? (
                textLoading ? (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-white gap-3 py-20">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <span className="text-xs font-semibold text-slate-300">
                      Membaca isi berkas teks...
                    </span>
                  </div>
                ) : textError ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-100">Gagal Membaca Berkas Teks</h3>
                    <p className="mt-2 text-xs text-slate-400 max-w-md">{textError}</p>
                  </div>
                ) : (
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
              ) : (
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
                    onClick={handleDownload}
                    className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Unduh Berkas</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer (Khas PPID) */}
        <div className="px-4 md:px-6 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
            Dokumen resmi E-Arsip SI BETANG Kemenag Barito Utara
          </p>

          {/* Tombol Tutup Merah */}
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
  );
}