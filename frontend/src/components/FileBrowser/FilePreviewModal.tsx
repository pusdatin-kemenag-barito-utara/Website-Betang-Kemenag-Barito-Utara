import { useState, useEffect } from "react";
import { X, Download, AlertCircle, Loader2, ImageOff } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { PdfViewer } from "./PdfViewer";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
  mimeType: string;
  isLoading: boolean;
  error: string | null;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  mimeType,
  isLoading,
  error,
}: FilePreviewModalProps) {
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    setImgLoadFailed(false);
  }, [fileUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!fileUrl) return;
    trackEvent("preview_download_click", {
      file_name: fileName,
      mime_type: mimeType,
    });
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[92vh] max-h-[960px] w-full max-w-[96vw] lg:max-w-6xl xl:max-w-7xl flex-col animate-in zoom-in-95 bg-white shadow-2xl ring-1 ring-slate-200/90 rounded-2xl sm:rounded-3xl overflow-hidden"
      >
        {/* Header - Hanya untuk gambar atau berkas umum (Khusus PDF memiliki Unified Toolbar mandiri) */}
        {!isPdf && (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
            <div className="min-w-0 flex-1 pr-4">
              <h2 className="truncate text-lg font-bold text-slate-800">{fileName}</h2>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{mimeType}</p>
            </div>

            <div className="flex items-center gap-2">
              {fileUrl && !imgLoadFailed && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white p-2 text-slate-400 shadow-sm ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Area Konten */}
        <div className="relative flex-1 overflow-hidden bg-slate-100 flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm font-bold text-slate-600 animate-pulse">Memuat dokumen aman...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center max-w-md text-center p-8 rounded-2xl bg-white shadow-sm m-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Gagal Membuka File</h3>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
            </div>
          )}

          {!isLoading && !error && fileUrl && (
            <div className="h-full w-full overflow-hidden flex items-center justify-center">
              {isImage ? (
                imgLoadFailed ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-sm m-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
                      <ImageOff className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Berkas Fisik Belum Tersedia di Storage R2</h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md">
                      Data ini merupakan riwayat lama yang file fisiknya belum dimigrasikan ke bucket Cloudflare R2 <code>data-arsip</code>.
                      Silakan unggah ulang berkas baru melalui tombol <strong>Baru +</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="h-full w-full p-4 flex items-center justify-center bg-slate-900/5">
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-h-full max-w-full object-contain rounded-xl shadow-lg ring-1 ring-black/5"
                      onError={() => setImgLoadFailed(true)}
                    />
                  </div>
                )
              ) : isPdf ? (
                <PdfViewer
                  url={fileUrl}
                  fileName={fileName}
                  onDownload={handleDownload}
                  onClose={onClose}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-sm m-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 mb-4">
                    <Download className="h-10 w-10" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Pratinjau Tidak Tersedia</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-xs">
                    Browser tidak mendukung pratinjau langsung untuk tipe berkas ini. Silakan unduh dokumen untuk melihat isinya.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Unduh Berkas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}