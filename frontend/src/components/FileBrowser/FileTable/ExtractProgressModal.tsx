import {
  FolderArchive,
  CheckCircle2,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  AlertCircle,
  Sparkles,
  Folder,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import type { ExtractProgressState } from "./useFileTableModals";

interface ExtractProgressModalProps {
  state: ExtractProgressState;
  onToggleCollapse: () => void;
  onClose: () => void;
}

export function ExtractProgressModal({
  state,
  onToggleCollapse,
  onClose,
}: ExtractProgressModalProps) {
  if (!state.isOpen) return null;

  const isComplete = state.status === "success";
  const isFailed = state.status === "error";
  const isWorking = state.status === "downloading" || state.status === "unpacking" || state.status === "saving";

  const fileExt = (state.archiveName?.split(".").pop() || "ZIP").toUpperCase();
  const displayArchiveSize = state.archiveSize
    ? typeof state.archiveSize === "number"
      ? formatFileSize(state.archiveSize)
      : state.archiveSize
    : "";

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none select-none">
      <div className="w-[380px] sm:w-[440px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5 duration-200 bg-white shadow-2xl rounded-2xl border border-slate-200/90 overflow-hidden pointer-events-auto flex flex-col ring-1 ring-black/5">
        {/* Header Widget */}
        <div
          className={`px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${
            isComplete
              ? "bg-emerald-600 text-white"
              : isFailed
                ? "bg-rose-600 text-white"
                : "bg-slate-900 text-white"
          }`}
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isComplete
                  ? "bg-white/20 text-white"
                  : isFailed
                    ? "bg-white/20 text-white"
                    : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : isFailed ? (
                <AlertCircle className="h-5 w-5 text-white" />
              ) : (
                <FolderArchive className="h-5 w-5 text-amber-400" />
              )}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold truncate">
                  {isComplete
                    ? "Ekstraksi Selesai"
                    : isFailed
                      ? "Ekstraksi Gagal"
                      : "Mengekstrak Arsip"}
                </span>
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
                  {fileExt}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 truncate" title={state.archiveName}>
                {state.archiveName || "Berkas Arsip"}
                {displayArchiveSize ? ` (${displayArchiveSize})` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title={state.isCollapsed ? "Tampilkan Detail" : "Kecilkan"}
            >
              {state.isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar Header Utama */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              {isWorking && <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin shrink-0" />}
              {isComplete && <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
              <span className="font-semibold text-slate-700 truncate" title={state.stageText}>
                {state.stageText || "Memproses..."}
              </span>
            </div>
            <span
              className={`text-xs font-bold shrink-0 ${
                isComplete ? "text-emerald-600" : isFailed ? "text-rose-600" : "text-amber-600"
              }`}
            >
              {state.progressPercent}%
            </span>
          </div>

          {/* Track & Bar */}
          <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete
                  ? "bg-emerald-500"
                  : isFailed
                    ? "bg-rose-500"
                    : "bg-gradient-to-r from-amber-500 to-emerald-500 animate-pulse"
              }`}
              style={{ width: `${Math.max(4, Math.min(100, state.progressPercent))}%` }}
            />
          </div>

          {/* Indikator Hitungan */}
          {state.totalFiles > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Berkas Terproses:</span>
              <span className="font-semibold text-slate-600">
                {state.completedFiles} dari {state.totalFiles} berkas
              </span>
            </div>
          )}
        </div>

        {/* Pesan Error jika terjadi kegagalan */}
        {isFailed && state.errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-100 flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <p className="font-medium leading-relaxed">{state.errorMessage}</p>
          </div>
        )}

        {/* Daftar Berkas Hasil Ekstraksi (Dapat dilipat) */}
        {!state.isCollapsed && state.files && state.files.length > 0 && (
          <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-100 bg-white">
            {state.files.map((file, idx) => (
              <div
                key={file.id || idx}
                className="px-4 py-2 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-slate-700 truncate" title={file.relativePath || file.name}>
                      {file.name}
                    </span>
                    {file.folderPath && (
                      <span
                        className="text-[10px] text-amber-700 font-medium truncate flex items-center gap-1 mt-0.5"
                        title={`Folder: ${file.folderPath}`}
                      >
                        <Folder className="h-3 w-3 shrink-0 text-amber-500" />
                        <span className="truncate">{file.folderPath}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {file.status === "pending" && (
                    <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                      Menunggu
                    </span>
                  )}
                  {file.status === "uploading" && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Menyimpan...</span>
                    </div>
                  )}
                  {file.status === "success" && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Berhasil</span>
                    </div>
                  )}
                  {file.status === "error" && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      <span>Gagal</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Aksi jika sudah selesai */}
        {isComplete && (
          <div className="p-3 bg-emerald-50/50 border-t border-emerald-100/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">
              Semua berkas siap digunakan
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
