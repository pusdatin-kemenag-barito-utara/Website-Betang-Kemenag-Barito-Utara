import { useState } from "react";
import { FileText, ArrowRight, Eye } from "lucide-react";
import { FilePreviewModal } from "@/components/FileBrowser/FilePreviewModal";
import { getR2FileUrl } from "@/lib/api";

export interface RecentUploadFile {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
  r2_object_key?: string;
}

export interface RecentUploadsTableProps {
  isSuperAdmin: boolean;
  userBidang: string;
  recentUploads: RecentUploadFile[];
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getExtBadgeStyle(ext: string) {
  switch (ext) {
    case "DOC":
    case "DOCX":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "XLS":
    case "XLSX":
    case "CSV":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PPT":
    case "PPTX":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "PDF":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "PNG":
    case "JPG":
    case "JPEG":
    case "WEBP":
    case "SVG":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "ZIP":
    case "RAR":
    case "7Z":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function RecentUploadsTable({
  isSuperAdmin,
  userBidang,
  recentUploads = [],
}: RecentUploadsTableProps) {
  const [previewFile, setPreviewFile] = useState<RecentUploadFile | null>(null);

  const handleOpenPreview = (file: RecentUploadFile) => {
    setPreviewFile(file);
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {isSuperAdmin ? "Dokumen Terbaru" : `Dokumen Terbaru ${userBidang || "Seksi"}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aktivitas unggahan berkas terakhir di sistem E-Arsip
            </p>
          </div>
          <a
            href="/folders/root"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <span>Buka File Browser</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {recentUploads.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Belum ada dokumen yang diunggah</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3">Nama Dokumen</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Ukuran</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Waktu Unggah</th>
                  <th scope="col" className="px-6 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUploads.map((file) => {
                  const ext = (file.name.split(".").pop() || "FILE").toUpperCase();
                  const badgeStyle = getExtBadgeStyle(ext);
                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenPreview(file)}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${badgeStyle}`}
                          >
                            {ext}
                          </span>
                          <span
                            className="font-medium text-slate-800 group-hover:text-emerald-700 text-xs sm:text-sm truncate transition-colors"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {formatBytes(file.size_bytes)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {formatDate(file.created_at)}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(file);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer shadow-2xs"
                          title="Pratinjau Dokumen"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Buka</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          fileId={previewFile.id}
          fileName={previewFile.name}
          mimeType={previewFile.mime_type || "application/octet-stream"}
          fileUrl={getR2FileUrl(previewFile.r2_object_key || previewFile.id)}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}

export default RecentUploadsTable;
