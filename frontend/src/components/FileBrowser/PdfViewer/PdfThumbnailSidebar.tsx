import { Loader2 } from "lucide-react";

interface PdfThumbnailSidebarProps {
  showThumbnails: boolean;
  numPages: number;
  currentPage: number;
  thumbnails: { [page: number]: string };
  onSelectPage: (page: number) => void;
  onCloseMobile?: () => void;
}

export function PdfThumbnailSidebar({
  showThumbnails,
  numPages,
  currentPage,
  thumbnails,
  onSelectPage,
  onCloseMobile,
}: PdfThumbnailSidebarProps) {
  if (!showThumbnails) return null;

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30 lg:z-auto
        w-28 sm:w-32 lg:w-36 shrink-0 bg-slate-900/95 lg:bg-slate-900 border-r border-slate-800
        flex flex-col transition-all duration-300 backdrop-blur-md lg:backdrop-blur-none
        mt-12 sm:mt-14 lg:mt-0 shadow-2xl lg:shadow-none
      `}
    >
      <div className="px-2.5 py-2 border-b border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Hal ({numPages})
        </span>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
          >
            Tutup
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const isSelected = currentPage === pageNum;
          const thumbUrl = thumbnails[pageNum];

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onSelectPage(pageNum)}
              className={`w-full group flex flex-col items-center p-1.5 rounded-lg border transition-all text-left cursor-pointer ${
                isSelected
                  ? "bg-emerald-950/50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/40"
                  : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              <div className="relative w-full aspect-[1/1.3] bg-white rounded overflow-hidden shadow-xs flex items-center justify-center">
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Halaman ${pageNum}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-1 text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mb-0.5 text-slate-500" />
                    <span className="text-[9px]">{pageNum}</span>
                  </div>
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-semibold ${
                  isSelected ? "text-emerald-400 font-bold" : "text-slate-400 group-hover:text-slate-200"
                }`}
              >
                Hal {pageNum}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
