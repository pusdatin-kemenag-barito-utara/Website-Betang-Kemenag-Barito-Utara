/**
 * Core HTTP Request Client untuk backend Go Fiber.
 * Mengirim kredensial cookie secara otomatis via same-origin reverse proxy.
 */

// Bersihkan API_ORIGIN agar tidak menduplikasi /api/v1 jika env PUBLIC_API_URL bernilai "/api/v1" atau berakhiran "/api/v1"
export function getApiOrigin(): string {
  const rawOrigin = (
    (typeof window !== "undefined" && (window.__PUBLIC_ENV__?.PUBLIC_API_URL || window.__PUBLIC_ENV__?.NEXT_PUBLIC_API_URL)) ||
    import.meta.env.PUBLIC_API_URL ||
    import.meta.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return rawOrigin.replace(/\/api\/v1\/?$/, "");
}

export const API_ORIGIN = getApiOrigin();

export function buildApiUrl(path: string): string {
  const origin = getApiOrigin();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedPath = cleanPath.startsWith("/api/v1") ? cleanPath : `/api/v1${cleanPath}`;
  return `${origin}${normalizedPath}`;
}

export async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store",
      ...(options.headers || {}),
    },
  });

  // Response ZIP (unduhan binary) tidak berbentuk JSON.
  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/zip") || contentType.includes("application/octet-stream")) {
    if (!res.ok) {
      return { success: false, error: "Gagal mengunduh file." } as T;
    }
    const blob = await res.blob();
    return { success: true, blob, filename: res.headers.get("Content-Disposition") || "" } as T;
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  // 304 Not Modified dari ETag middleware berarti konten tidak berubah —
  // ini bukan error, tapi body kosong. Abaikan saja.
  if (res.status === 304) {
    return { success: true, data: null, notModified: true } as T;
  }

  if (!res.ok || !body?.success) {
    const msg =
      body?.error || (res.status === 401 ? "Sesi berakhir. Silakan masuk kembali." : "Terjadi kesalahan sistem.");
    const result: any = { success: false, error: msg };
    if (res.status === 401) {
      result.unauthorized = true;
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login" &&
        path !== "/auth/login"
      ) {
        // Jangan langsung redirect paksa jika:
        // 1. Sedang ada proses upload berkas aktif
        // 2. Request merupakan polling background (seperti syncLocks atau storage stats)
        const isBackgroundPoll =
          path.includes("/locks") ||
          path.includes("/stats") ||
          path.includes("/check");
        const isUploading = (window as any).__BETANG_IS_UPLOADING__ === true;

        if (!isBackgroundPoll && !isUploading) {
          try {
            localStorage.removeItem("is_logged_in");
            sessionStorage.clear();
          } catch {}
          window.location.replace("/login");
        } else if (isUploading) {
          console.warn("[BETANG AUTH]: 401 diabaikan dari auto-redirect karena proses upload sedang aktif.");
        }
      }
    }
    return result as T;
  }

  return body as T;
}

/**
 * Muat ulang halaman sebentar setelah mutasi selesai.
 */
export function reloadSoon(delay = 250) {
  setTimeout(() => window.location.reload(), delay);
}
