// Helper sisi server (Astro SSR): memanggil backend Go dengan cookie sesi
// dari request dengan in-memory cache untuk performa navigasi instan.

function getBackendUrls(): string[] {
  const custom =
    import.meta.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    import.meta.env.BACKEND_URL ||
    process.env.BACKEND_URL;
  const urls: string[] = [];
  if (custom) urls.push(custom.replace(/\/+$/, ""));
  urls.push("http://backend:8080");
  urls.push("http://127.0.0.1:8080");
  urls.push("http://localhost:8080");
  return Array.from(new Set(urls));
}

let activeBackendOrigin = "";

export async function fetchFromBackend(path: string, options: RequestInit = {}): Promise<Response> {
  const candidateUrls = activeBackendOrigin
    ? [activeBackendOrigin, ...getBackendUrls().filter((u) => u !== activeBackendOrigin)]
    : getBackendUrls();

  let lastError: any = null;
  for (const origin of candidateUrls) {
    try {
      const res = await fetch(`${origin}/api/v1${path}`, {
        ...options,
        signal: options.signal || AbortSignal.timeout(3500),
      });
      activeBackendOrigin = origin;
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Backend Go tidak dapat dihubungi");
}

export interface ApiResponse {
  ok: boolean;
  status: number;
  body: any;
}

// In-memory cache per cookie untuk respon cepat (TTL 20 detik)
const userSessionCache = new Map<string, { user: any; expiresAt: number }>();
const serverCache = new Map<string, { response: ApiResponse; expiresAt: number }>();

/** GET ke endpoint API backend dengan cookie sesi pengguna. */
export async function apiGet(path: string, cookie: string, useCache = false): Promise<ApiResponse> {
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
  } catch {
    return { ok: false, status: 0, body: null };
  }

  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  const result: ApiResponse = { ok: res.ok, status: res.status, body }

  if (useCache && res.ok) {
    serverCache.set(cacheKey, {
      response: result,
      expiresAt: now + 20000, // 20 detik
    })
  }

  return result
}

export interface AuthCheck {
  ok: boolean
  user: {
    id: string
    name: string
    email: string
    role: string
    status: string
    isSuperAdmin: boolean
  } | null
}

/** Memeriksa sesi via GET /auth/me dengan in-memory cache (20s TTL) agar navigasi halaman instan. */
export async function requireUser(cookie: string): Promise<AuthCheck> {
  if (!cookie || !cookie.includes("earsip-auth=")) {
    return { ok: false, user: null }
  }

  const now = Date.now()
  const cached = userSessionCache.get(cookie)
  if (cached && cached.expiresAt > now) {
    return { ok: true, user: cached.user }
  }

  const res = await apiGet("/auth/me", cookie, false)
  if (!res.ok || !res.body?.data?.user) {
    userSessionCache.delete(cookie)
    return { ok: false, user: null }
  }

  const user = res.body.data.user
  userSessionCache.set(cookie, {
    user,
    expiresAt: now + 20000, // 20 detik
  })

  return { ok: true, user }
}