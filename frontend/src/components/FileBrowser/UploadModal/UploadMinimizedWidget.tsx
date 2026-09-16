import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  AlertCircle,
  Clock,
  Plus,
} from "lucide-react";
import type { UploadItem } from "./useUploadManager";

interface UploadMinimizedWidgetProps {
  uploadItems: UploadItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCancel: (e?: React.MouseEvent) => void;
  onAddMoreFiles?: () => void;
}

export function UploadMinimizedWidget({
  uploadItems,
  isCollapsed,
  onToggleCollapse,
  onCancel,
  onAddMoreFiles,
}: UploadMinimizedWidgetProps) {
  const totalItems = uploadItems.length;
  const completedItems = uploadItems.filter(
    (i) => i.status === "success" || i.status === "error"
  ).length;
  const successItems = uploadItems.filter((i) => i.status === "success").length;
  const errorItems = uploadItems.filter((i) => i.status === "error").length;
  const pendingItems = uploadItems.filter((i) => i.status === "pending");
  const uploadingItems = uploadItems.filter((i) => i.status === "uploading");

  const isAllFinished = totalItems > 0 && completedItems === totalItems;
  const isAllSuccess = totalItems > 0 && successItems === totalItems;

  // Auto-Dismiss Timer Logic: 4 detik jeda waktu saat seluruh upload selesai
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAllFinished) {
      // Inisialisasi hitung mundur 4 detik jika belum aktif
      if (countdown === null) {
        setCountdown(4);
      }
    } else {
      // Jika ada item baru masuk ke antrean, batalkan auto-dismiss
      setCountdown(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isAllFinished, totalItems]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      // Waktu jeda habis, otomatis hilangkan widget
      onCancel();
      return;
    }

    if (!isHovered) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown, isHovered, onCancel]);

  const overallProgress =
    totalItems === 0
      ? 0
      : Math.round(
          (uploadItems.reduce((acc, item) => acc + item.progress, 0) / (totalItems * 100)) * 100
        );

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-[380px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-5 bg-white shadow-2xl rounded-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col transition-all">
        {/* Header Widget */}
        <div
          className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none relative"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="shrink-0">
              {isAllSuccess ? (
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              ) : isAllFinished && errorItems > 0 ? (
                <div className="h-6 w-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold truncate">
                  {isAllSuccess
                    ? `${successItems} Berkas Selesai`
                    : isAllFinished
                    ? `${successItems} berhasil, ${errorItems} gagal`
                    : `Mengunggah (${completedItems}/${totalItems})`}
                </h3>

                {/* Badge Antrean Aktif */}
                {pendingItems.length > 0 && !isAllFinished && (
                  <span className="shrink-0 text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {pendingItems.length} antrean
                  </span>
                )}
              </div>

              {/* Status Teks / Countdown Otomatis */}
              {countdown !== null && countdown > 0 ? (
                <p className="text-[11px] text-emerald-300 font-medium truncate mt-0.5">
                  {isHovered ? "Ditahan (geser mouse untuk menutup)" : `Menutup otomatis dalam ${countdown}s...`}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {uploadingItems.length > 0
                    ? `Proses: ${uploadingItems[0].file.name}`
                    : `${overallProgress}% dari total proses`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Tombol Tambah Berkas Cepat ke Antrean */}
            {onAddMoreFiles && !isAllFinished && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMoreFiles();
                }}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium"
                title="Tambah berkas ke antrean upload"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={isCollapsed ? "Buka detail" : "Sembunyikan detail"}
            >
              {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(e);
              }}
              className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
              title="Tutup / Batalkan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Animasi Garis Auto-Dismiss jika seluruh upload selesai */}
          {countdown !== null && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
                style={{
                  width: `${(countdown / 4) * 100}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Progress Bar saat Collapsed & Masih Berjalan */}
        {isCollapsed && !isAllFinished && (
          <div className="h-1.5 w-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}

        {/* Daftar Rinci Berkas (Saat Terbuka / Expanded) */}
        {!isCollapsed && (
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar bg-slate-50/50 divide-y divide-slate-100">
            {uploadItems.map((item) => {
              // Hitung urutan dalam antrean untuk item pending
              let pendingIndex = -1;
              if (item.status === "pending") {
                pendingIndex = pendingItems.findIndex((p) => p.id === item.id) + 1;
              }

              return (
                <div
                  key={item.id}
                  className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                    item.status === "uploading"
                      ? "bg-blue-50/50"
                      : item.status === "pending"
                      ? "bg-slate-50/80"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {item.status === "pending" && (
                        <div
                          className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center"
                          title="Dalam antrean"
                        >
                          <Clock className="h-4 w-4" />
                        </div>
                      )}
                      {item.status === "uploading" && (
                        <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                      {item.status === "success" && (
                        <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="h-7 w-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {item.file.name}
                        </p>
                        {item.status === "pending" && (
                          <span className="shrink-0 text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Antrean #{pendingIndex}
                          </span>
                        )}
                      </div>

                      {/* Path folder atau subfolder jika ada */}
                      {item.directorySegments && item.directorySegments.length > 0 && (
                        <p
                          className="text-[10px] text-amber-700 font-medium truncate mt-0.5"
                          title={`Subfolder: ${item.directorySegments.join("/")}`}
                        >
                          📁 {item.directorySegments.join("/")}
                        </p>
                      )}

                      {/* Status atau Progres */}
                      {item.status === "error" ? (
                        <p className="text-[11px] font-medium text-rose-500 truncate mt-0.5" title={item.error}>
                          {item.error || "Gagal mengunggah"}
                        </p>
                      ) : item.status === "pending" ? (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Menunggu giliran antrean...
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 flex-1 bg-slate-200/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                item.status === "success" ? "bg-emerald-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span
                            className={`text-[10px] font-bold w-7 text-right ${
                              item.status === "success" ? "text-emerald-600" : "text-blue-600"
                            }`}
                          >
                            {item.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
