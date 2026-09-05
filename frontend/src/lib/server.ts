// Helper sisi server (Astro SSR): memanggil backend Go dengan cookie sesi
// dari request dengan in-memory cache untuk performa navigasi instan.

function getBackendUrls(): string[] {
  const custom =
    import.meta.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    import.meta.env.BACKEND_URL ||
    process.env.BACKEND_URL;
  const urls: string[] = ["http://127.0.0.1:8080", "http://localhost:8080"];
  if (custom) urls.unshift(custom.replace(/\/+$/, ""));
  return Array.from(new Set(urls));
}

let activeBackendOrigin = "http://127.0.0.1:8080";

export async function fetchFromBackend(path: string, options: RequestInit = {}): Promise<Response> {
  const candidateUrls = activeBackendOrigin
    ? [activeBackendOrigin, ...getBackendUrls().filter((u) => u !== activeBackendOrigin)]
    : getBackendUrls();

  let lastError: any = null;
  for (const origin of candidateUrls) {
    try {
      const res = await fetch(`${origin}/api/v1${path}`, {
        ...options,
        signal: options.signal || AbortSignal.timeout(5000),
      });
      activeBackendOrigin = origin;
      return res;
    } catch (err) {
      lastError = err;
    }
  }

  // Jika di mode dev dan gagal pertama kali, tunggu sebentar (misal Air sedang rebuild) lalu coba lagi sekali
  if (import.meta.env.DEV) {
    await new Promise((r) => setTimeout(r, 450));
    for (const origin of getBackendUrls()) {
      try {
        const res = await fetch(`${origin}/api/v1${path}`, {
          ...options,
          signal: options.signal || AbortSignal.timeout(5000),
        });
        activeBackendOrigin = origin;
        return res;
      } catch (err) {
        lastError = err;
      }
    }
  }

  activeBackendOrigin = "http://127.0.0.1:8080";
  throw lastError || new Error("Backend Go tidak dapat dihubungi");
}

/**
 * Meneruskan header Set-Cookie dari respon backend Go ke header respon Astro SSR.
 * Krusial agar saat backend memperbarui token Supabase (refresh token), browser pengguna
 * langsung mendapatkan cookie sesi baru tanpa terputus/ter-logout tiba-tiba.
 */
export function forwardSetCookies(upstreamRes: Response, targetHeaders?: Headers) {
  if (!targetHeaders) return;
  try {
    if (typeof (upstreamRes.headers as any).getSetCookie === "function") {
      const cookies: string[] = (upstreamRes.headers as any).getSetCookie();
      if (cookies && cookies.length > 0) {
        for (const cookieStr of cookies) {
          targetHeaders.append("set-cookie", cookieStr);
        }
        return;
      }
    }
    const sc = upstreamRes.headers.get("set-cookie");
    if (sc) {
      targetHeaders.append("set-cookie", sc);
    }
  } catch (err) {
    console.warn("[SSR COOKIE FORWARD ERROR]:", err);
  }
}

export interface ApiResponse {
  ok: boolean;
  status: number;
  body: any;
}

// In-memory cache per cookie untuk respon instan (TTL 30 detik), dipersistenkan di globalThis
// agar tidak terhapus saat HMR atau reload modul di environment Vite dev.
interface GlobalServerCache {
  __betangUserSessionCache?: Map<string, { user: any; expiresAt: number }>;
  __betangServerCache?: Map<string, { response: ApiResponse; expiresAt: number }>;
}

const g = globalThis as unknown as GlobalServerCache;
if (!g.__betangUserSessionCache) {
  g.__betangUserSessionCache = new Map();
}
if (!g.__betangServerCache) {
  g.__betangServerCache = new Map();
}

const userSessionCache = g.__betangUserSessionCache;
const serverCache = g.__betangServerCache;

/** GET ke endpoint API backend dengan cookie sesi pengguna dan penerusan Set-Cookie opsional. */
export async function apiGet(
  path: string,
  cookie: string,
  useCache = false,
  responseHeaders?: Headers,
): Promise<ApiResponse> {
  const cacheKey = `${path}:${cookie}`;
  const now = Date.now();

  if (useCache) {
    const cached = serverCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.response;
    }
  }

  let res: Response;
  try {
    res = await fetchFromBackend(path, {
      headers: { cookie: cookie || "" },
      cache: "no-store",
    });
  } catch (err) {
    console.warn(`[SSR API GET ERROR] ${path}:`, err);
    return { ok: false, status: 0, body: null };
  }

  // Teruskan Set-Cookie jika backend me-refresh sesi
  if (responseHeaders) {
    forwardSetCookies(res, responseHeaders);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const result: ApiResponse = { ok: res.ok, status: res.status, body };

  if (useCache && res.ok) {
    serverCache.set(cacheKey, {
      response: result,
      expiresAt: now + 30000, // 30 detik
    });
  }

  return result;
}

export interface AuthCheck {
  ok: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    bidangId?: string | null;
    bidangName?: string | null;
    status: string;
    isSuperAdmin: boolean;
  } | null;
}

/** Memeriksa sesi via GET /auth/me dengan in-memory cache (30s TTL) dan sinkronisasi header Set-Cookie. */
export async function requireUser(cookie: string, responseHeaders?: Headers): Promise<AuthCheck> {
  if (!cookie || !cookie.includes("earsip-auth=")) {
    return { ok: false, user: null };
  }

  const now = Date.now();
  const cached = userSessionCache.get(cookie);
  if (cached && cached.expiresAt > now) {
    return { ok: true, user: cached.user };
  }

  const res = await apiGet("/auth/me", cookie, false, responseHeaders);
  if (!res.ok || !res.body?.data?.user) {
    userSessionCache.delete(cookie);
    return { ok: false, user: null };
  }

  const user = res.body.data.user;
  userSessionCache.set(cookie, {
    user,
    expiresAt: now + 30000, // 30 detik
  });

  return { ok: true, user };
}