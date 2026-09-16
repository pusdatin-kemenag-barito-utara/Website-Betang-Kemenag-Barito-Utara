import { getR2FileUrl } from "@/lib/api";
import { toast } from "sonner";
import type { FileItem } from "@/lib/types";

/**
 * Menyiapkan berkas untuk di-drag atau di-upload ke aplikasi luar (seperti SRIKANDI, TTE Kemenag, email).
 * 
 * Cara kerja:
 * 1. Memicu unduhan otomatis agar berkas langsung mendarat di Gelembung Unduhan Chrome / Edge (kanan atas).
 *    Dari gelembung unduhan Chrome di kanan atas browser, berkas dapat langsung diseret (drag)
 *    masuk ke kotak dropzone SRIKANDI / TTE Kemenag sebagai File OS asli!
 * 2. Menyalin objek berkas ke Clipboard sistem jika didukung (sehingga bisa ditempel dengan Ctrl+V).
 * 3. Menampilkan petunjuk praktis bagi pengguna.
 */
export async function exportFileForExternalApp(item: FileItem) {
  if (item.type === "folder") {
    toast.info("Fitur kirim ke aplikasi luar hanya untuk berkas dokumen, bukan folder.");
    return;
  }

  const directUrl = getR2FileUrl(item.objectKey || item.id);
  if (!directUrl) {
    toast.error("Tautan berkas tidak tersedia.");
    return;
  }

  let copiedToClipboard = false;

  // 1. Unduh via Blob URL agar langsung mendarat di baki/gelembung unduhan Chrome tanpa membuka tab kosong
  try {
    const res = await fetch(directUrl);
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);

      // 2. Salin berkas ke clipboard (jika didukung)
      if (typeof window !== "undefined" && navigator.clipboard && typeof ClipboardItem !== "undefined") {
        try {
          const effectiveType = blob.type || item.mimeType || "application/octet-stream";
          const clipboardItem = new ClipboardItem({
            [effectiveType]: blob,
          });
          await navigator.clipboard.write([clipboardItem]);
          copiedToClipboard = true;
        } catch {
          // Clipboard blob dibatasi pada browser tertentu
        }
      }
    } else {
      // Fallback direct link jika fetch gagal
      const link = document.createElement("a");
      link.href = directUrl;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.warn("Pemicu unduhan langsung gagal, fallback ke direct URL:", err);
    const link = document.createElement("a");
    link.href = directUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 3. Tampilkan panduan langkah mudah
  toast.success(
    `Berkas "${item.name}" siap! ${
      copiedToClipboard ? "Tersalin ke Clipboard & " : ""
    }Muncul di ikon Unduhan Chrome (kanan atas ⬇️). Anda bisa langsung seret (drag) berkas dari sana ke kotak SRIKANDI / TTE Kemenag, atau seret ke Desktop Windows.`,
    { duration: 9000 }
  );
}
