// Middleware Astro: maintenance check, proteksi sesi, dan header CSP.
// Pengganti proxy.ts + next.config.ts headers dari aplikasi lama.
import type { APIContext, MiddlewareNext } from "astro";
import { fetchFromBackend } from "@/lib/server";

const PUSDATIN_URL =
  import.meta.env.PUBLIC_PUSDATIN_URL || "https://pusdatin.kemenag-baritoutara.com";
const APP_ID = "e-arsip-kemenag";

// Aset statis tidak perlu diperiksa.
const STATIC_PATTERN = /\.(svg|png|jpg|jpeg|gif|webp|ico|webmanifest|css|js)$/;

function buildCSP() {
  try {
    const rawPusdatin = PUSDATIN_URL.startsWith("http") ? PUSDATIN_URL : `https://${PUSDATIN_URL}`;
    const pusdatinHost = new URL(rawPusdatin).host;
    const csp = [
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com",
      `frame-src https://challenges.cloudflare.com https://${pusdatinHost} https://*.kemenag-baritoutara.com`,
      `connect-src 'self' https://challenges.cloudflare.com https://db.kemenag-baritoutara.com https://${pusdatinHost} https://*.kemenag-baritoutara.com http://localhost:8080 http://127.0.0.1:8080 http://backend:8080 https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://region1.google-analytics.com`,
      "worker-src blob:",
    ].join("; ");
    return `default-src 'self'; ${csp}; img-src 'self' data: blob: https: https://www.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'`;
  } catch {
    return "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com";
  }
}

// In-memory cache untuk status maintenance (TTL: 30 detik) agar tidak membebani network roundtrip.
let cachedMaintenance: { isMaintenance: boolean; expiresAt: number } | null = null;

async function checkMaintenance(): Promise<boolean> {
  const now = Date.now();
  if (cachedMaintenance && cachedMaintenance.expiresAt > now) {
    return cachedMaintenance.isMaintenance;
  }
  try {
    const res = await fetch(`${PUSDATIN_URL}/api/public/apps/${APP_ID}/status`, {
      headers: { "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data: any = await res.json();
      const isM = data.status === "maintenance";
      cachedMaintenance = { isMaintenance: isM, expiresAt: now + 30000 };
      return isM;
    }
  } catch {
    // Jika pusdatin lambat/timeout, jangan blokir aplikasi
  }
  return false;
}

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  try {
    const { pathname } = context.url;

    // Endpoint API (termasuk /api/health dan /api/v1/*) diteruskan langsung.
    if (pathname.startsWith("/api/")) {
      return next();
    }

    // Lewati pemeriksaan untuk aset statis.
    if (STATIC_PATTERN.test(pathname)) {
      return next();
    }

    // === MAINTENANCE CHECK (Cached) ===
    const isMaintenance = await checkMaintenance();
    if (isMaintenance && pathname !== "/maintenance") {
      return context.redirect("/maintenance");
    }
    if (!isMaintenance && pathname === "/maintenance") {
      return context.redirect("/");
    }

    // === SESSION CHECK ===
    const isPublicPath =
      pathname === "/login" || pathname === "/maintenance" || pathname === "/_image";

    const cookie = context.request.headers.get("cookie") || "";
    const hasAuthCookie = cookie.includes("earsip-auth=");

    if (!isPublicPath && !hasAuthCookie) {
      return context.redirect("/login");
    }

    if (pathname === "/login" && hasAuthCookie) {
      const ok = await hasValidSession(context.request);
      if (ok) {
        return context.redirect("/");
      }
    }

    const response = await next();
    try {
      response.headers.set("Content-Security-Policy", buildCSP());
      response.headers.set("X-Frame-Options", "SAMEORIGIN");
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      response.headers.set("Alt-Svc", 'h3=":443"; ma=86400, h3-29=":443"; ma=86400');
      response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), browsing-topics=()");
      response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    } catch {
      // Abaikan jika header sudah terkunci
    }

    return response;
  } catch (err) {
    console.error("[MIDDLEWARE CATCH]:", err);
    return next();
  }
}

/** Verifikasi sesi dengan memanggil /auth/me pada backend. */
async function hasValidSession(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("earsip-auth=")) {
    return false;
  }
  try {
    const res = await fetchFromBackend("/auth/me", {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return false;
    }
    const body: any = await res.json();
    return Boolean(body?.success && body?.data?.user?.email);
  } catch {
    return false;
  }
}