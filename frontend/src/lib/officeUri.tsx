import { toast } from "sonner";
import { getOfficeWebDavLink } from "@/lib/api";

export type OfficeAppType = "word" | "excel" | "powerpoint";

/**
 * Mendeteksi apakah berkas merupakan dokumen Microsoft Office
 */
export function getOfficeFileType(fileName: string, mimeType?: string): OfficeAppType | null {
  const lowerName = fileName.toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  // Word (.docx, .doc, .dotx)
  if (
    /\.(docx|doc|dotx)$/i.test(lowerName) ||
    lowerMime.includes("wordprocessingml") ||
    lowerMime.includes("msword")
  ) {
    return "word";
  }

  // Excel (.xlsx, .xls, .xlsm, .csv)
  if (
    /\.(xlsx|xls|xlsm|ods|csv)$/i.test(lowerName) ||
    lowerMime.includes("spreadsheetml") ||
    lowerMime.includes("ms-excel")
  ) {
    return "excel";
  }

  // PowerPoint (.pptx, .ppt, .ppsx)
  if (
    /\.(pptx|ppt|ppsx|potx)$/i.test(lowerName) ||
    lowerMime.includes("presentationml") ||
    lowerMime.includes("ms-powerpoint")
  ) {
    return "powerpoint";
  }

  return null;
}

/**
 * Menghasilkan URI Protocol resmi Microsoft Office (ms-word:, ms-excel:, ms-powerpoint:)
 * Format standar Windows/macOS: {protocol}:ofe|u|{absolute_url} (Open For Edit)
 */
export function getOfficeAppUri(
  fileUrl: string,
  app: OfficeAppType,
  mode: "edit" | "view" = "edit"
): string {
  if (!fileUrl) return "";

  // Pastikan URL berwujud absolut (wajib http:// atau https:// untuk Office Protocol Handler)
  let fullUrl = fileUrl;
  if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    fullUrl = `${origin}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  }

  const prefix = mode === "edit" ? "ofe" : "ofv";
  // Cegah double percent-encoding (%20 -> %2520) yang membuat Office bingung membaca path berkas
  const cleanUrl = encodeURI(decodeURI(fullUrl));

  switch (app) {
    case "word":
      return `ms-word:${prefix}|u|${cleanUrl}`;
    case "excel":
      return `ms-excel:${prefix}|u|${cleanUrl}`;
    case "powerpoint":
      return `ms-powerpoint:${prefix}|u|${cleanUrl}`;
    default:
      return fullUrl;
  }
}

/**
 * Memicu eksekusi Protocol URI pada peramban secara aman
 */
export function triggerOfficeProtocol(uri: string): void {
  if (typeof window === "undefined" || !uri) return;

  const a = document.createElement("a");
  a.href = uri;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
  }, 1000);
}

/**
 * Memicu peramban untuk membuka berkas langsung di aplikasi desktop Microsoft Office
 * Menampilkan panduan modal interaktif SI BETANG dan notifikasi khusus.
 * Jika fileId tersedia, menggunakan protokol WebDAV resmi sehingga editan tersimpan otomatis (Ctrl + S).
 */
export async function openInDesktopOffice(
  fileUrl: string,
  fileName: string,
  mimeType?: string,
  fileId?: string
): Promise<boolean> {
  const app = getOfficeFileType(fileName, mimeType);
  if (!app) {
    toast.error("Format berkas bukan dokumen Microsoft Office");
    return false;
  }

  const appName =
    app === "word" ? "Word" : app === "excel" ? "Excel" : "PowerPoint";

  let targetUri = "";

  // 1. Coba dapatkan WebDAV Link resmi dari backend jika fileId tersedia (Mendukung Auto-Save Ctrl+S)
  if (fileId) {
    try {
      const davRes = await getOfficeWebDavLink(fileId);
      if (davRes.success && davRes.webdavPath) {
        let origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";

        // Saat development di localhost, sambungkan langsung ke backend Go port 8080
        // agar Microsoft Office Desktop langsung berkomunikasi dengan WebDAV server tanpa terhalang middleware dev Vite
        if (
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1")
        ) {
          origin = "http://127.0.0.1:8080";
        }

        const fullWebdavUrl = `${origin}${davRes.webdavPath}`;
        targetUri = getOfficeAppUri(fullWebdavUrl, app, "edit");
      }
    } catch (err) {
      console.warn("Gagal membuat WebDAV link, beralih ke direct URL:", err);
    }
  }

  if (!targetUri) {
    targetUri = getOfficeAppUri(fileUrl, app, "edit");
  }

  try {
    // 2. Picu event global untuk membuka Modal Peluncur Interaktif SI BETANG
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("betang:open-office-launch", {
          detail: {
            fileUrl,
            fileName,
            mimeType,
            app,
            webdavUri: targetUri,
            hasAutoSave: Boolean(fileId),
          },
        })
      );
    }

    // 3. Picu URI Protocol ke aplikasi desktop
    triggerOfficeProtocol(targetUri);

    // 3. Tampilkan notifikasi custom dengan desain khas Microsoft Office
    const colorClasses =
      app === "word"
        ? {
            badge: "bg-blue-600 text-white",
            bg: "bg-blue-50 border-blue-200 text-blue-950",
            dot: "bg-blue-500",
            border: "border-blue-300",
          }
        : app === "excel"
        ? {
            badge: "bg-emerald-600 text-white",
            bg: "bg-emerald-50 border-emerald-200 text-emerald-950",
            dot: "bg-emerald-500",
            border: "border-emerald-300",
          }
        : {
            badge: "bg-orange-600 text-white",
            bg: "bg-orange-50 border-orange-200 text-orange-950",
            dot: "bg-orange-500",
            border: "border-orange-300",
          };

    toast.custom(
      () => (
        <div
          className={`flex items-center gap-3 p-3 rounded-2xl shadow-xl border ${colorClasses.bg} backdrop-blur-md min-w-[260px] max-w-[340px] animate-in slide-in-from-top-2 select-none`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-black text-xs shadow-xs ${colorClasses.badge}`}
          >
            {app === "word" ? "W" : app === "excel" ? "X" : "P"}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="text-xs font-bold leading-tight">
              Membuka di Microsoft {appName}
            </div>
            <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
              {fileName}
            </p>
          </div>
        </div>
      ),
      {
        id: `office-launch-${app}`,
        duration: 3500,
      }
    );

    return true;
  } catch (err) {
    console.error("Gagal membuka Office Protocol URI:", err);
    toast.error(`Gagal membuka di Microsoft ${appName}`);
    return false;
  }
}
