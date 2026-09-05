/**
 * Core HTTP Request Client untuk backend Go Fiber.
 * Mengirim kredensial cookie secara otomatis via same-origin reverse proxy.
 */

export const API_ORIGIN = (import.meta.env.PUBLIC_API_URL || "").replace(/\/+$/, "");

export async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
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
        try {
          localStorage.removeItem("is_logged_in");
          sessionStorage.clear();
        } catch {}
        window.location.replace("/login");
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
