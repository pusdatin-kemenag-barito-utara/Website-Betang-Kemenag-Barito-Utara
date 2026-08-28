// ==============================================================================
// SI BETANG Enterprise PWA Service Worker
// ==============================================================================

const CACHE_NAME = "si-betang-pwa-v1.0.0";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/login",
  "/kemenag.svg",
  "/logo.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/og-image.png",
  "/manifest.webmanifest",
];

// 1. Install & Precache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate & Clean Old Caches
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

// 3. Fetch Strategy: Network First with Offline Fallback & Cache Fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Jangan cache API atau permintaan non-GET
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Permintaan navigasi halaman HTML
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        const offlineResponse = await cache.match(OFFLINE_URL);
        return offlineResponse || new Response("Anda sedang offline", { status: 503 });
      }),
    );
    return;
  }

  // Aset statis & Gambar (Cache First / Stale-While-Revalidate)
  if (
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.startsWith("/_astro/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => cached);
      }),
    );
  }
});
