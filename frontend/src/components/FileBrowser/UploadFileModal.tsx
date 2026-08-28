import { Upload, X, FileUp, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { useUploadManager } from "./UploadModal/useUploadManager";
import { UploadDropzone } from "./UploadModal/UploadDropzone";
import { UploadMinimizedWidget } from "./UploadModal/UploadMinimizedWidget";

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  userBidangId: string;
  initialFiles?: File[];
  isFolderMode?: boolean;
  onSuccess?: () => void;
}

export function UploadFileModal({
  isOpen,
  onClose,
  folderId,
  userBidangId,
  initialFiles,
  isFolderMode = false,
  onSuccess,
}: UploadFileModalProps) {
  const {
    uploadItems,
    isUploading,
    isMinimized,
    isCollapsed,
    setIsCollapsed,
    globalError,
    setGlobalError,
    addFiles,
    removeFile,
    handleUpload,
    handleCancel,
  } = useUploadManager({
    isOpen,
    folderId,
    userBidangId,
    initialFiles,
    onClose,
    onSuccess,
  });

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <UploadMinimizedWidget
        uploadItems={uploadItems}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onCancel={handleCancel}
      />
    );
  }

  const hasFiles = uploadItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl animate-in zoom-in-95 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload Dokumen (Batch)</h2>
              <p className="text-xs text-slate-500">Maksimal 50 file sekaligus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Konten Dropzone & Daftar Berkas */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          <UploadDropzone
            isFolderMode={isFolderMode}
            onFilesSelected={addFiles}
            onScanningState={setGlobalError}
          />

          {globalError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {hasFiles && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Berkas Terpilih ({uploadItems.length})
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Total:{" "}
                  {formatFileSize(uploadItems.reduce((acc, item) => acc + item.file.size, 0))}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {uploadItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs text-slate-500">
                        <FileUp className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(item.id)}
                      disabled={isUploading}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Aksi */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-100 p-4 sm:p-6 bg-slate-50/50">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleUpload}
            disabled={!hasFiles || isUploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/10 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengunggah...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Mulai Unggah ({uploadItems.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}