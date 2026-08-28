// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Konfigurasi Astro: SSR (output server) dengan adapter Node.
// PWA dinonaktifkan saat development agar tidak mengganggu hot-reload.
export default defineConfig({
  site: "https://arsip.kemenag-baritoutara.com",
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [
    react(),
  ],
  vite: {
    envDir: "../",
    envPrefix: ["PUBLIC_", "NEXT_PUBLIC_"],
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "sonner",
        "framer-motion",
        "clsx",
        "tailwind-merge",
        "lucide-react",
        "pdfjs-dist",
        "@marsidev/react-turnstile",
      ],
      exclude: [
        "astro:transitions",
        "astro/virtual-modules/transitions-events.js",
        "astro/virtual-modules/transitions-router.js",
        "astro/virtual-modules/transitions-swap-functions.js",
        "astro/virtual-modules/transitions-types.js",
      ],
    },
    ssr: {
      external: ["pdfjs-dist"],
    },
    server: {
      proxy: {
        "/api/v1": {
          target: "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
    plugins: [
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "kemenag.svg",
          "logo.png",
          "pwa-192x192.png",
          "pwa-512x512.png",
          "pwa-maskable-512x512.png",
          "apple-touch-icon.png",
          "og-image.png",
        ],
        manifest: {
          name: "SI BETANG - E-Arsip Kemenag Barito Utara",
          short_name: "SI BETANG",
          description:
            "Aplikasi Manajemen Tata Kelola & Penyimpanan Arsip Digital Kementerian Agama Kabupaten Barito Utara",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "any",
          background_color: "#0f172a",
          theme_color: "#059669",
          categories: ["productivity", "utilities", "business", "government"],
          lang: "id-ID",
          dir: "ltr",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/kemenag.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
          shortcuts: [
            {
              name: "File Browser",
              short_name: "Arsip",
              description: "Jelajahi berkas dan folder arsip",
              url: "/folders/root",
              icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
            },
            {
              name: "Recycle Bin",
              short_name: "Sampah",
              description: "Kelola berkas terhapus",
              url: "/trash",
              icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
            },
          ],
          screenshots: [
            {
              src: "/pwa-screenshot-desktop.png",
              sizes: "1280x720",
              type: "image/png",
              form_factor: "wide",
              label: "Antarmuka Dashboard & File Browser SI BETANG",
            },
            {
              src: "/pwa-screenshot-mobile.png",
              sizes: "750x1334",
              type: "image/png",
              form_factor: "narrow",
              label: "Tampilan Mobile Ramah Sentuhan SI BETANG",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff,woff2,ttf,webmanifest}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "images-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  },
});