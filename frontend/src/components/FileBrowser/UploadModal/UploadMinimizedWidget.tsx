import { CheckCircle2, Loader2, ChevronUp, ChevronDown, X, FileUp, AlertCircle } from "lucide-react";
import type { UploadItem } from "./useUploadManager";

interface UploadMinimizedWidgetProps {
  uploadItems: UploadItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCancel: (e?: React.MouseEvent) => void;
}

export function UploadMinimizedWidget({
  uploadItems,
  isCollapsed,
  onToggleCollapse,
  onCancel,
}: UploadMinimizedWidgetProps) {
  const allSuccess =
    uploadItems.length > 0 && uploadItems.every((i) => i.status === "success" || i.status === "error");
  const totalItems = uploadItems.length;
  const completedItems = uploadItems.filter((i) => i.status === "success" || i.status === "error").length;
  const overallProgress =
    totalItems === 0
      ? 0
      : Math.round(
          (uploadItems.reduce((acc, item) => acc + item.progress, 0) / (totalItems * 100)) * 100,
        );

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      <div className="w-[360px] animate-in slide-in-from-bottom-5 bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col">
        {/* Header */}
        <div
          className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-3">
            {allSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
            )}
            <h3 className="text-sm font-semibold">
              {allSuccess
                ? `${completedItems} upload selesai`
                : `Mengunggah ${completedItems} dari ${totalItems} item`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
            >
              {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button onClick={onCancel} className="p-1.5 hover:bg-slate-700 rounded-md transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar saat Collapsed */}
        {isCollapsed && !allSuccess && (
          <div className="h-1 w-full bg-slate-200">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}

        {/* Detail Berkas */}
        {!isCollapsed && (
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-50">
            {uploadItems.map((item) => (
              <div
                key={item.id}
                className="p-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-white"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {item.status === "pending" && <FileUp className="h-5 w-5 text-slate-400" />}
                    {item.status === "uploading" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                    {item.status === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    {item.status === "error" && <AlertCircle className="h-5 w-5 text-rose-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{item.file.name}</p>
                    {item.status === "error" ? (
                      <p className="text-xs font-medium text-rose-500 truncate" title={item.error}>
                        {item.error}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold w-6">{item.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
