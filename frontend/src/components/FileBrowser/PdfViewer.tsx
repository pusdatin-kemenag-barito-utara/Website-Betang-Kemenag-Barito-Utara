import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sidebar,
  Loader2,
  AlertCircle,
  Download,
  Printer,
  Maximize,
  X,
} from "lucide-react";

interface PdfViewerProps {
  url: string;
  fileName: string;
  onDownload?: () => void;
  onClose?: () => void;
}

// Sub-komponen per lembar halaman PDF
function PdfPageItem({
  doc,
  pageNumber,
  scale,
  rotation,
}: {
  doc: any;
  pageNumber: number;
  scale: number;
  rotation: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      if (!doc || !canvasRef.current) return;
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // abaikan
          }
        }

        const page = await doc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const viewport = page.getViewport({ scale, rotation });
        const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        const task = page.render(renderContext as any);
        renderTaskRef.current = task;
        await task.promise;
        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Kesalahan render halaman ${pageNumber}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // abaikan
        }
      }
    };
  }, [doc, pageNumber, scale, rotation]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      className="pdf-page-container relative flex flex-col items-center my-3 sm:my-4 transition-all max-w-full"
    >
      <div className="relative shadow-2xl rounded-none overflow-hidden bg-white ring-1 ring-black/10 max-w-full">
        <canvas ref={canvasRef} className="block max-w-none" />
        {!isRendered && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 min-h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}
      </div>
      <div className="mt-2 px-2.5 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] font-semibold text-slate-400 shadow-sm">
        Halaman {pageNumber}
      </div>
    </div>
  );
}

export function PdfViewer({ url, fileName, onDownload, onClose }: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [page: number]: string }>({});

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Muat PDF ke Memori & Hitung Skala Responsif
  useEffect(() => {
    let active = true;
    let loadingTask: any = null;

    setIsLoading(true);
    setError(null);
    setThumbnails({});

    const initPdf = async () => {
      try {
        if (typeof window !== "undefined") {
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        }

        const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
          throw new Error(`Gagal mengunduh dokumen dari server (Status: ${res.status})`);
        }

        const buffer = await res.arrayBuffer();
        if (!active) return;

        const typedArray = new Uint8Array(buffer);

        loadingTask = pdfjsLib.getDocument({
          data: typedArray,
          cMapPacked: true,
        } as any);

        const doc = await loadingTask.promise;
        if (!active) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);

        // Hitung skala otomatis agar pas dengan lebar layar perangkat (Responsive Fit-Width)
        try {
          const firstPage = await doc.getPage(1);
          const viewport = firstPage.getViewport({ scale: 1 });
          const containerWidth = scrollContainerRef.current?.clientWidth || window.innerWidth;
          const isMobile = window.innerWidth < 768;
          const padding = isMobile ? 24 : 64;
          const targetWidth = Math.max(280, containerWidth - padding);
          const autoScale = Math.max(0.45, Math.min(1.8, targetWidth / viewport.width));
          setScale(parseFloat(autoScale.toFixed(2)));
        } catch {
          setScale(1.0);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error("Kesalahan inisialisasi PDF:", err);
        if (active) {
          setError(err?.message || "Gagal memuat dokumen PDF. Pastikan file valid.");
          setIsLoading(false);
        }
      }
    };

    initPdf();

    return () => {
      active = false;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch {
          // abaikan
        }
      }
    };
  }, [url]);

  // 2. Generate Thumbnail Sisi Kiri
  useEffect(() => {
    if (!pdfDoc) return;

    let isMounted = true;

    const generateThumbnails = async () => {
      const thumbs: { [page: number]: string } = {};

      for (let i = 1; i <= Math.min(numPages, 40); i++) {
        if (!isMounted) break;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.25 });
          const thumbCanvas = document.createElement("canvas");
          const thumbCtx = thumbCanvas.getContext("2d");

          if (thumbCtx) {
            thumbCanvas.width = viewport.width;
            thumbCanvas.height = viewport.height;

            await page.render({
              canvasContext: thumbCtx,
              viewport: viewport,
              canvas: thumbCanvas,
            } as any).promise;

            if (isMounted) {
              thumbs[i] = thumbCanvas.toDataURL("image/jpeg", 0.7);
              setThumbnails((prev) => ({ ...prev, [i]: thumbs[i] }));
            }
          }
        } catch (e) {
          console.error(`Gagal render thumbnail halaman ${i}:`, e);
        }
      }
    };

    generateThumbnails();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, numPages]);

  // 3. Deteksi Halaman Aktif saat Pengguna Menggulir (Scroll Tracking)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      const pageElements = container.querySelectorAll(".pdf-page-container");
      const containerTop = container.getBoundingClientRect().top;

      let closestPage = 1;
      let minDistance = Infinity;

      pageElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerTop);
        if (distance < minDistance) {
          minDistance = distance;
          const pageNum = parseInt(el.getAttribute("data-page-number") || "1", 10);
          closestPage = pageNum;
        }
      });

      setCurrentPage(closestPage);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages, isLoading]);

  // Navigasi & Aksi
  const scrollToPage = (pageNum: number) => {
    const el = document.getElementById(`pdf-page-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(pageNum);
      // Di mobile, otomatis tutup thumbnail drawer saat halaman dipilih
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setShowThumbnails(false);
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      scrollToPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.15, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.15, 0.45));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFitWidth = () => {
    if (!scrollContainerRef.current || !pdfDoc) return;
    pdfDoc.getPage(1).then((page: any) => {
      const viewport = page.getViewport({ scale: 1, rotation });
      const containerWidth = scrollContainerRef.current?.clientWidth || window.innerWidth;
      const isMobile = window.innerWidth < 768;
      const padding = isMobile ? 24 : 64;
      const targetWidth = Math.max(280, containerWidth - padding);
      const newScale = Math.max(0.45, Math.min(2.2, targetWidth / viewport.width));
      setScale(parseFloat(newScale.toFixed(2)));
    });
  };

  const handlePrint = () => {
    const printWindow = window.open(`/api/proxy-pdf?url=${encodeURIComponent(url)}`, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-900/10 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">Menyiapkan Dokumen PDF...</p>
          <p className="text-xs text-slate-500 mt-1">Menyesuaikan tampilan layar perangkat</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 sm:p-8 text-center bg-slate-50">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4 shadow-sm ring-1 ring-rose-100">
          <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Gagal Membuka Pratinjau PDF</h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md">{error}</p>
        <div className="mt-5 flex items-center gap-3">
          {onDownload && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" /> Unduh PDF
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-300 transition-all cursor-pointer"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-900 select-none relative">
      {/* Top Header Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-3 sm:px-5 text-slate-200 z-30 gap-2">
        {/* Sisi Kiri: Toggle Sidebar & Judul File */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${
              showThumbnails
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            title="Daftar Halaman (Sidebar)"
          >
            <Sidebar className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-wider uppercase">
              PDF
            </span>
            <span
              className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-[120px] sm:max-w-[200px] md:max-w-sm lg:max-w-md"
              title={fileName}
            >
              {fileName}
            </span>
          </div>
        </div>

        {/* Tengah: Unified Control Pill (Page Navigation, Zoom, Fit-Width) */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-sm">
          {/* Navigasi Lompat Halaman */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center px-1.5 text-xs font-semibold text-slate-200">
              <span className="text-emerald-400 font-bold">{currentPage}</span>
              <span className="mx-1 text-slate-600">/</span>
              <span className="text-slate-400">{numPages}</span>
            </div>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-4 w-px bg-slate-800 mx-1" />

          {/* Kontrol Zoom */}
          <div className="hidden sm:flex items-center">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.45}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
              title="Perkecil (-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-xs font-semibold text-slate-300 w-11 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 2.5}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
              title="Perbesar (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-4 w-px bg-slate-800 mx-1" />

          {/* Pas Lebar */}
          <button
            type="button"
            onClick={handleFitWidth}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sesuaikan Lebar Halaman"
          >
            <Maximize className="h-3.5 w-3.5 text-slate-400" />
            <span>Pas Lebar</span>
          </button>
        </div>

        {/* Sisi Kanan: Rotasi, Print, Download, dan Tutup */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRotate}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Putar 90°"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Cetak Dokumen"
          >
            <Printer className="h-4 w-4" />
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
              title="Unduh PDF"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Download</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Mobile Drawer Overlay + Continuous Scrollable Canvas Column */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrop Overlay di Mobile saat Sidebar Terbuka */}
        {showThumbnails && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
            onClick={() => setShowThumbnails(false)}
          />
        )}

        {/* Sidebar: Mobile Offcanvas Drawer / Desktop Inline Strip */}
        {showThumbnails && (
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:static lg:w-56 lg:z-auto shrink-0 border-r border-slate-800 bg-slate-950 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3 shadow-2xl lg:shadow-none animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Urutan Halaman ({numPages})
              </p>
              <button
                type="button"
                onClick={() => setShowThumbnails(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-800 lg:hidden cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => scrollToPage(pageNumber)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer group text-left ${
                    currentPage === pageNumber
                      ? "bg-emerald-950/70 ring-2 ring-emerald-500 shadow-md"
                      : "bg-slate-900/60 hover:bg-slate-850 ring-1 ring-slate-800/60"
                  }`}
                >
                  <div className="w-full aspect-[1/1.414] bg-white rounded-none overflow-hidden shadow-inner flex items-center justify-center relative">
                    {thumbnails[pageNumber] ? (
                      <img
                        src={thumbnails[pageNumber]}
                        alt={`Halaman ${pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        <span className="text-[9px] text-slate-400">Hal {pageNumber}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between w-full px-1">
                    <span
                      className={`text-[11px] font-bold ${
                        currentPage === pageNumber ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      Halaman {pageNumber}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Center Viewer: Continuous Vertical Scrollable Column */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 flex flex-col items-center bg-slate-900/95 custom-scrollbar scroll-smooth"
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
            <PdfPageItem
              key={pageNumber}
              doc={pdfDoc}
              pageNumber={pageNumber}
              scale={scale}
              rotation={rotation}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
