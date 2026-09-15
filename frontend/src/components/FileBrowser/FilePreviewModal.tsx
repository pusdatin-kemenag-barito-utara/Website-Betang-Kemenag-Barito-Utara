import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  X,
  ExternalLink,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { getFileDetail, getR2FileUrl } from "@/lib/api";
import { PdfViewer } from "./viewers/PdfViewer";
import { ImageViewer } from "./viewers/ImageViewer";
import { TextViewer } from "./viewers/TextViewer";
import { SpreadsheetViewer } from "./viewers/SpreadsheetViewer";
import { DocxViewer } from "./viewers/DocxViewer";
import { PptxViewer } from "./viewers/PptxViewer";
import { UnsupportedViewer } from "./viewers/UnsupportedViewer";
import { getOfficeFileType, openInDesktopOffice } from "@/lib/officeUri";

export interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId?: string;
  fileUrl: string | null;
  fileName: string;
  mimeType: string;
  isLoading?: boolean;
  error?: string | null;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileId,
  fileUrl,
  fileName,
  mimeType,
  isLoading = false,
  error = null,
}: FilePreviewModalProps) {
  const [viewMode, setViewMode] = useState<"iframe" | "canvas">("iframe");
  const [iframeLoading, setIframeLoading] = useState(true);

  // State untuk melacak update r2_object_key terbaru dari server dan cache-busting dinamis
  const [latestR2Key, setLatestR2Key] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);

  // Canvas (PDF.js) multi-page continuous scroll states
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [activePage, setActivePage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [canvasLoading, setCanvasLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Ambil metadata berkas terkini dari server untuk memastikan r2_object_key selalu versi paling baru
  const checkFreshFileDetail = useCallback(async () => {
    if (!fileId) return;
    try {
      const res = await getFileDetail(fileId);
      if (res.success && res.data?.r2_object_key) {
        setLatestR2Key(res.data.r2_object_key);
      }
    } catch {
      // silent fallback ke URL prop
    }
  }, [fileId]);

  useEffect(() => {
    if (!isOpen) return;
    setRefreshKey(Date.now());
    checkFreshFileDetail();
  }, [isOpen, fileId, checkFreshFileDetail]);

  // Bangun URL berkas efektif dengan query timestamp dinamis untuk mencegah caching CDN & browser
  const effectiveFileUrl = useMemo(() => {
    let base = fileUrl;
    if (latestR2Key) {
      base = getR2FileUrl(latestR2Key);
    }
    if (!base) return null;
    const cleanBase = base.replace(/([?&])t=\d+/, "");
    const sep = cleanBase.includes("?") ? "&" : "?";
    return `${cleanBase}${sep}t=${refreshKey}`;
  }, [fileUrl, latestR2Key, refreshKey]);

  // Auto-refresh saat jendela peramban kembali fokus (misal user baru selesai Ctrl+S di Word/Excel)
  useEffect(() => {
    if (!isOpen) return;
    const onFocus = () => {
      checkFreshFileDetail();
      setRefreshKey(Date.now());
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isOpen, checkFreshFileDetail]);

  // Auto-refresh saat menerima event pembaruan isi folder
  useEffect(() => {
    if (!isOpen) return;
    const onContentUpdated = () => {
      checkFreshFileDetail();
      setRefreshKey(Date.now());
    };
    window.addEventListener("folder-content-updated", onContentUpdated);
    return () => window.removeEventListener("folder-content-updated", onContentUpdated);
  }, [isOpen, checkFreshFileDetail]);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await checkFreshFileDetail();
    setRefreshKey(Date.now());
    setTimeout(() => setIsManualRefreshing(false), 600);
  };

  const isPdf =
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf") ||
    Boolean((effectiveFileUrl || fileUrl)?.toLowerCase().includes(".pdf"));

  const isImage = mimeType.startsWith("image/");

  const isSpreadsheet =
    /\.(xlsx|xls|xlsm|ods|csv|tsv)$/i.test(fileName) ||
    mimeType?.toLowerCase().includes("spreadsheet") ||
    mimeType?.toLowerCase().includes("excel") ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    Boolean((effectiveFileUrl || fileUrl) && /\.(xlsx|xls|xlsm|ods|csv|tsv)(\?|$)/i.test(effectiveFileUrl || fileUrl || ""));

  const isDocx =
    /\.(docx|doc|dotx)$/i.test(fileName) ||
    mimeType?.toLowerCase().includes("wordprocessingml") ||
    mimeType?.toLowerCase().includes("msword") ||
    Boolean((effectiveFileUrl || fileUrl) && /\.(docx|doc|dotx)(\?|$)/i.test(effectiveFileUrl || fileUrl || ""));

  const isPptx =
    /\.(pptx|ppt|ppsx|potx)$/i.test(fileName) ||
    mimeType?.toLowerCase().includes("presentationml") ||
    mimeType?.toLowerCase().includes("ms-powerpoint") ||
    Boolean((effectiveFileUrl || fileUrl) && /\.(pptx|ppt|ppsx|potx)(\?|$)/i.test(effectiveFileUrl || fileUrl || ""));

  const officeApp = getOfficeFileType(fileName, mimeType);

  const isText =
    !isSpreadsheet &&
    !isDocx &&
    !isPptx &&
    (mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/javascript" ||
      mimeType === "application/xml" ||
      /\.(txt|log|json|md|yaml|yml|xml|html|js|ts|css|sql|sh|env)$/i.test(
        fileName,
      ) ||
      Boolean(
        (effectiveFileUrl || fileUrl) &&
        /\.(txt|log|json|md|yaml|yml|xml|html|js|ts|css|sql|sh|env)(\?|$)/i.test(
          effectiveFileUrl || fileUrl || "",
        ),
      ));

  // Text viewer states
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Detect device on open (Paritas PPID Kemenag)
  useEffect(() => {
    if (!isOpen) return;

    let shouldUseCanvas = false;
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isAppleMac = /Macintosh|Mac OS X|MacBook/i.test(ua);
      const isMobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          ua,
        );
      shouldUseCanvas = isAppleMac || isMobile;
    }

    setViewMode(shouldUseCanvas ? "canvas" : "iframe");
    setIframeLoading(true);
    setActivePage(1);
    setScale(1.0);
    setRotation(0);
  }, [isOpen, effectiveFileUrl]);

  // Safety timeout agar loading overlay iframe tidak menggantung jika browser tidak memicu event onLoad
  useEffect(() => {
    if (!isOpen || !iframeLoading) return;
    const timer = setTimeout(() => {
      setIframeLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isOpen, iframeLoading]);

  // Load document via PDF.js when viewMode is 'canvas'
  useEffect(() => {
    if (!isOpen || !effectiveFileUrl || !isPdf || viewMode !== "canvas") return;
    let active = true;
    setCanvasLoading(true);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc =
          window.location.origin + "/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({
          url: effectiveFileUrl,
          cMapUrl: window.location.origin + "/cmaps/",
          cMapPacked: true,
        });

        const loadedDoc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setActivePage(1);
      } catch (err) {
        console.warn(
          "Gagal memuat via PDF.js canvas, otomatis beralih ke native iframe:",
          err,
        );
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
  }, [isOpen, effectiveFileUrl, isPdf, viewMode]);

  // Fetch text file content when previewing text-based files
  useEffect(() => {
    if (!isOpen || !effectiveFileUrl || !isText) {
      setTextContent(null);
      setTextError(null);
      setIsCopied(false);
      return;
    }

    let active = true;
    setTextLoading(true);
    setTextError(null);
    setIsCopied(false);

    fetch(effectiveFileUrl, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            `Gagal mengambil berkas teks (${res.status} ${res.statusText})`,
          );
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
        setTextError(
          err instanceof Error
            ? err.message
            : "Gagal membaca berkas teks dari server.",
        );
      })
      .finally(() => {
        if (active) setTextLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, effectiveFileUrl, isText]);

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
    const targetUrl = effectiveFileUrl || fileUrl;
    if (!targetUrl) return;
    trackEvent("preview_download_click", {
      file_name: fileName,
      mime_type: mimeType,
    });
    const a = document.createElement("a");
    a.href = targetUrl;
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
            {isPdf && (effectiveFileUrl || fileUrl) && !error && (
              <button
                type="button"
                onClick={() =>
                  setViewMode(viewMode === "iframe" ? "canvas" : "iframe")
                }
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
                    <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">
                      Tersalin
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="hidden sm:inline">Salin Teks</span>
                  </>
                )}
              </button>
            )}

            {/* Tombol Segarkan Pratinjau (Ambil Versi Terbaru) */}
            {(effectiveFileUrl || fileUrl) && !error && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isManualRefreshing}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="Muat ulang untuk menampilkan perubahan versi terbaru tanpa refresh halaman"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${
                    isManualRefreshing ? "animate-spin text-emerald-600" : ""
                  }`}
                />
                <span className="hidden md:inline">Segarkan</span>
              </button>
            )}

            {/* Tombol Buka di Aplikasi Microsoft Office Desktop (Word / Excel / PowerPoint) */}
            {(effectiveFileUrl || fileUrl) && !error && officeApp && (
              <button
                type="button"
                onClick={() =>
                  openInDesktopOffice(effectiveFileUrl || fileUrl!, fileName, mimeType, fileId)
                }
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  officeApp === "word"
                    ? "bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                    : officeApp === "excel"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                      : "bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
                }`}
                title={`Buka langsung di aplikasi Microsoft ${
                  officeApp === "word"
                    ? "Word"
                    : officeApp === "excel"
                      ? "Excel"
                      : "PowerPoint"
                } di komputer Anda`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>
                  Buka di{" "}
                  {officeApp === "word"
                    ? "Word"
                    : officeApp === "excel"
                      ? "Excel"
                      : "PowerPoint"}
                </span>
              </button>
            )}

            {/* Tombol Unduh */}
            {(effectiveFileUrl || fileUrl) && !error && (
              <button
                type="button"
                onClick={handleDownload}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Unduh Berkas Asli"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Unduh</span>
              </button>
            )}

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Pratinjau (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-slate-100 dark:bg-slate-950">
          {isLoading && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Memuat pratinjau berkas...
                </p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="flex flex-col items-center max-w-md text-center p-8 rounded-3xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xl m-4 border border-slate-200 dark:border-slate-700">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 mb-4">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Pratinjau Tidak Tersedia
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {error ||
                    "Tautan pratinjau berkas tidak dapat diakses saat ini. Silakan unduh dokumen untuk melihat isinya."}
                </p>
                {(effectiveFileUrl || fileUrl) && (
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

          {!isLoading && !error && (effectiveFileUrl || fileUrl) && (
            <>
              {isPdf ? (
                <PdfViewer
                  fileUrl={effectiveFileUrl || fileUrl!}
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
                    setIframeLoading(false);
                    setViewMode("canvas");
                  }}
                  onScrollToPage={scrollToPage}
                  onScaleChange={setScale}
                  onRotationChange={setRotation}
                  onPageInView={handlePageInView}
                />
              ) : isImage ? (
                <ImageViewer fileUrl={effectiveFileUrl || fileUrl!} fileName={fileName} />
              ) : isSpreadsheet ? (
                <SpreadsheetViewer
                  fileUrl={effectiveFileUrl || fileUrl!}
                  fileName={fileName}
                  fileId={fileId}
                />
              ) : isDocx ? (
                <DocxViewer
                  fileUrl={effectiveFileUrl || fileUrl!}
                  fileName={fileName}
                  fileId={fileId}
                />
              ) : isPptx ? (
                <PptxViewer
                  fileUrl={effectiveFileUrl || fileUrl!}
                  fileName={fileName}
                  fileId={fileId}
                  onDownload={handleDownload}
                />
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
  );
}
