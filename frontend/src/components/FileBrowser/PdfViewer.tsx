import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Loader2, AlertCircle } from "lucide-react";
import { PdfToolbar } from "./PdfViewer/PdfToolbar";
import { PdfPageItem } from "./PdfViewer/PdfPageItem";
import { PdfThumbnailSidebar } from "./PdfViewer/PdfThumbnailSidebar";

interface PdfViewerProps {
  url: string;
  fileName: string;
  onDownload?: () => void;
  onClose?: () => void;
}

export function PdfViewer({ url, fileName, onDownload, onClose }: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [page: number]: string }>({});

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Muat Dokumen PDF secara Cepat (Direct Streaming)
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

        // Coba load langsung via URL presigned R2, jika gagal (CORS) fallback ke proxy
        try {
          loadingTask = pdfjsLib.getDocument({
            url,
            cMapPacked: true,
            rangeChunkSize: 65536,
          });
          const doc = await loadingTask.promise;
          if (!active) return;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setIsLoading(false);
          return;
        } catch {
          // Fallback ke proxy endpoint jika direct url diblokir oleh browser
        }

        const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(url)}`;
        loadingTask = pdfjsLib.getDocument({
          url: proxyUrl,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!active) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);

        // Skala responsif otomatis
        try {
          const firstPage = await doc.getPage(1);
          const viewport = firstPage.getViewport({ scale: 1 });
          const containerWidth = scrollContainerRef.current?.clientWidth || 700;
          const targetWidth = Math.max(280, containerWidth - 48);
          const autoScale = Math.max(0.6, Math.min(1.4, targetWidth / viewport.width));
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

  // 2. Generate Thumbnail Lazily hanya saat thumbnail sidebar dibuka
  useEffect(() => {
    if (!pdfDoc || !showThumbnails) return;
    let isMounted = true;

    const generateThumbnails = async () => {
      const thumbs: { [page: number]: string } = {};
      for (let i = 1; i <= Math.min(numPages, 30); i++) {
        if (!isMounted) break;
        if (thumbnails[i]) continue;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
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
              thumbs[i] = thumbCanvas.toDataURL("image/jpeg", 0.6);
              setThumbnails((prev) => ({ ...prev, [i]: thumbs[i] }));
            }
          }
        } catch {
          // abaikan kegagalan thumbnail individual
        }
      }
    };

    generateThumbnails();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, showThumbnails, numPages]);

  // 3. Scroll Tracking untuk halaman aktif
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
        const dist = Math.abs(rect.top - containerTop);
        if (dist < minDistance) {
          minDistance = dist;
          const pageNum = parseInt(el.getAttribute("data-page-number") || "1", 10);
          closestPage = pageNum;
        }
      });

      setCurrentPage(closestPage);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages]);

  const scrollToPage = (pageNum: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const pageEl = container.querySelector(`[data-page-number="${pageNum}"]`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePrint = () => {
    window.open(url, "_blank");
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 overflow-hidden select-none">
      {/* Toolbar Atas */}
      <PdfToolbar
        fileName={fileName}
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        showThumbnails={showThumbnails}
        onToggleThumbnails={() => setShowThumbnails((prev) => !prev)}
        onPrevPage={() => {
          if (currentPage > 1) scrollToPage(currentPage - 1);
        }}
        onNextPage={() => {
          if (currentPage < numPages) scrollToPage(currentPage + 1);
        }}
        onPageInputChange={(p) => scrollToPage(p)}
        onZoomIn={() => setScale((prev) => Math.min(prev + 0.2, 2.5))}
        onZoomOut={() => setScale((prev) => Math.max(prev - 0.2, 0.5))}
        onFitWidth={() => {
          if (scrollContainerRef.current && pdfDoc) {
            pdfDoc.getPage(1).then((p: any) => {
              const vp = p.getViewport({ scale: 1 });
              const w = scrollContainerRef.current?.clientWidth || 700;
              setScale(Math.max(0.5, Math.min(2.0, (w - 48) / vp.width)));
            });
          }
        }}
        onRotate={() => setRotation((prev) => (prev + 90) % 360)}
        onPrint={handlePrint}
        onDownload={onDownload}
        onClose={onClose}
      />

      {/* Konten Utama PDF */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Thumbnail */}
        {showThumbnails && numPages > 0 && (
          <PdfThumbnailSidebar
            showThumbnails={showThumbnails}
            numPages={numPages}
            currentPage={currentPage}
            thumbnails={thumbnails}
            onSelectPage={scrollToPage}
          />
        )}

        {/* Area Render Halaman */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center gap-6 bg-slate-900 custom-scrollbar"
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center m-auto gap-3 text-slate-400 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <span className="text-xs font-semibold">Membuka Dokumen PDF...</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center m-auto gap-3 text-rose-400 bg-rose-950/40 border border-rose-800/60 p-6 rounded-2xl max-w-md text-center">
              <AlertCircle className="h-8 w-8 text-rose-400" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {!isLoading &&
            !error &&
            pdfDoc &&
            Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <PdfPageItem
                key={pageNum}
                doc={pdfDoc}
                pageNumber={pageNum}
                scale={scale}
                rotation={rotation}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
