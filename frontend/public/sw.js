// ==============================================================================
// SI BETANG Enterprise PWA Service Worker (v1.1.0)
// ==============================================================================

const CACHE_NAME = "si-betang-pwa-v1.1.0";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  "/offline",
  "/login",
  "/kemenag.svg",
  "/logo.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

// 1. Install & Resilient Precache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.all(
          PRECACHE_ASSETS.map((url) =>
            fetch(url, { cache: "no-cache" })
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch((err) => {
                console.warn("[SW] Gagal precache aset:", url, err);
              }),
          ),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate & Clean Outdated Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Message listener (for SKIP_WAITING / instant reload)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 4. Fetch Strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Jangan cache permintaan selain GET atau permintaan API/auth/eksternal
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("challenges.cloudflare.com")
  ) {
    return;
  }

  // Strategi Navigasi Halaman: Network-First dengan Fallback Halaman Offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        const offlineResponse = await cache.match(OFFLINE_URL);
        return (
          offlineResponse ||
          new Response(
            "<!DOCTYPE html><html><body><h1>Koneksi Terputus</h1><p>Anda sedang berada dalam mode offline.</p></body></html>",
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            },
          )
        );
      }),
    );
    return;
  }

  // Aset Statis (Gambar, Font, Skrip Bundle Astro): Cache-First dengan Revalidasi di Latar
  if (
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.startsWith("/_astro/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cached);
      }),
    );
  }
});
