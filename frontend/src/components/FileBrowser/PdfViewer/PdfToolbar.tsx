import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sidebar,
  Download,
  Printer,
  X,
} from "lucide-react";

interface PdfToolbarProps {
  fileName: string;
  currentPage: number;
  numPages: number;
  scale: number;
  showThumbnails: boolean;
  onToggleThumbnails: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageInputChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onRotate: () => void;
  onPrint: () => void;
  onDownload?: () => void;
  onClose?: () => void;
}

export function PdfToolbar({
  fileName,
  currentPage,
  numPages,
  scale,
  showThumbnails,
  onToggleThumbnails,
  onPrevPage,
  onNextPage,
  onPageInputChange,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onRotate,
  onPrint,
  onDownload,
  onClose,
}: PdfToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white z-20 gap-2 shrink-0">
      {/* Kiri: Nama File & Toggle Thumbnail */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleThumbnails}
          className={`p-1.5 sm:p-2 rounded-xl transition-all ${
            showThumbnails
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/50"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="Toggle Thumbnail (Daftar Halaman)"
        >
          <Sidebar className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </button>

        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-bold truncate max-w-[160px] sm:max-w-[280px] lg:max-w-[400px] text-slate-100">
            {fileName}
          </span>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            PDF Document • {numPages} Halaman
          </span>
        </div>
      </div>

      {/* Tengah: Kontrol Halaman & Zoom */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
        {/* Navigasi Halaman */}
        <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60 shadow-inner">
          <button
            onClick={onPrevPage}
            disabled={currentPage <= 1}
            className="p-1 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <div className="flex items-center px-1.5 text-[11px] sm:text-xs font-semibold text-slate-300 gap-1">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  onPageInputChange(val);
                }
              }}
              className="w-8 sm:w-10 text-center bg-slate-900/90 text-white rounded border border-slate-700 py-0.5 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-slate-500">/</span>
            <span>{numPages || "-"}</span>
          </div>
          <button
            onClick={onNextPage}
            disabled={currentPage >= numPages}
            className="p-1 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Kontrol Zoom */}
        <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60 shadow-inner">
          <button
            onClick={onZoomOut}
            className="p-1 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all"
            title="Perkecil (-)"
          >
            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={onFitWidth}
            className="px-1.5 py-0.5 text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700/80 rounded transition-all"
            title="Paskan ke Layar"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="p-1 sm:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all"
            title="Perbesar (+)"
          >
            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        <button
          onClick={onRotate}
          className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-all hidden sm:inline-flex"
          title="Putar 90 Derajat"
        >
          <RotateCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      {/* Kanan: Aksi Print, Download & Tutup */}
      <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
        <button
          onClick={onPrint}
          className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-all hidden sm:inline-flex"
          title="Cetak Dokumen"
        >
          <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 ring-1 ring-emerald-400/50 transition-all"
            title="Unduh PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Unduh</span>
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all"
            title="Tutup Pratinjau (Esc)"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
