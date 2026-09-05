import { useState } from "react";
import { X, Share2, Copy, Check, ExternalLink, Clock, MessageSquare, Loader2, Zap } from "lucide-react";
import type { FileItem } from "@/lib/types";
import { createShareLink, getR2FileUrl } from "@/lib/api";
import { toast } from "sonner";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
}

export function ShareLinkModal({ isOpen, onClose, file }: ShareLinkModalProps) {
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedDirect, setCopiedDirect] = useState<boolean>(false);

  if (!isOpen || !file) return null;

  const directCdnUrl = getR2FileUrl(file.objectKey || file.id);

  const handleGenerate = async (hours = expiryHours) => {
    setIsLoading(true);
    setShareUrl("");
    try {
      const res = await createShareLink(file.id, hours);
      if (res.success && res.shareUrl) {
        setShareUrl(res.shareUrl);
        toast.success("Tautan berbagi berbatas waktu berhasil dibuat!");
      } else {
        toast.error(res.error || "Gagal membuat tautan");
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat membuat tautan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDirect = async () => {
    if (!directCdnUrl) return;
    try {
      await navigator.clipboard.writeText(directCdnUrl);
      setCopiedDirect(true);
      toast.success("Tautan Cepat CDN Cloudflare disalin!");
      setTimeout(() => setCopiedDirect(false), 2500);
    } catch {
      toast.error("Gagal menyalin tautan.");
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Tautan Disalin ke Clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Gagal menyalin tautan.");
    }
  };

  const handleWhatsApp = (urlToSend: string) => {
    if (!urlToSend) return;
    const text = encodeURIComponent(
      `Dokumen: *${file.name}*\nSilakan akses/unduh dokumen resmi melalui tautan SI BETANG Kemenag Barito Utara berikut:\n${urlToSend}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Bagikan Tautan Dokumen
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Direct Cloudflare CDN Option */}
          {directCdnUrl && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Tautan Cepat Cloudflare CDN
                </span>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                  HTTP/3 • Instan
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  readOnly
                  value={directCdnUrl}
                  className="bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 outline-none flex-1 truncate font-mono px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60"
                />
                <button
                  type="button"
                  onClick={handleCopyDirect}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedDirect ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Disalin
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Salin
                    </>
                  )}
                </button>
                <a
                  href={directCdnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                  title="Buka Dokumen"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Expiry Selection for Restricted Temporary Link */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Opsi Tautan Berbatas Waktu (Presigned):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "1 Jam", value: 1 },
                { label: "24 Jam", value: 24 },
                { label: "7 Hari", value: 168 },
              ].map((exp) => (
                <button
                  key={exp.value}
                  type="button"
                  onClick={() => {
                    setExpiryHours(exp.value);
                    if (shareUrl) handleGenerate(exp.value);
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                    expiryHours === exp.value
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate or URL Output */}
          {!shareUrl ? (
            <button
              onClick={() => handleGenerate()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Membuat Tautan Berbatas Waktu...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Buat Tautan Berbatas Waktu
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none flex-1 truncate font-mono px-1"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Disalin
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Salin
                    </>
                  )}
                </button>
              </div>

              {/* Social / WhatsApp Share */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleWhatsApp(shareUrl || directCdnUrl)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-xl border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Kirim ke WhatsApp
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Buka Tautan Langsung"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
