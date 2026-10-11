#!/usr/bin/env node

/**
 * Script Otomasi Build Google TWA Android APK untuk SI BETANG Kemenag Barito Utara
 *
 * Cara Penggunaan:
 *   node scripts/build-apk.js
 *   atau
 *   npm run build:apk
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_PUBLIC = path.resolve(ROOT_DIR, "frontend", "public");
const DOWNLOAD_DIR = path.resolve(FRONTEND_PUBLIC, "download");
const APK_DESTINATION = path.resolve(DOWNLOAD_DIR, "sibetang-kemenag.apk");
const TWA_MANIFEST = path.resolve(ROOT_DIR, "twa-manifest.json");

console.log("\n=======================================================");
console.log("  BUILD GOOGLE TWA ANDROID APK - SI BETANG KEMENAG    ");
console.log("=======================================================\n");

// 1. Pastikan folder frontend/public/download tersedia
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  console.log(`[+] Membuat direktori: ${DOWNLOAD_DIR}`);
}

// 2. Cek twa-manifest.json
if (!fs.existsSync(TWA_MANIFEST)) {
  console.error("[-] Error: twa-manifest.json tidak ditemukan!");
  process.exit(1);
}
console.log("[✓] twa-manifest.json terdeteksi.");

// 3. Tampilkan panduan build
console.log("\nTerdapat 2 cara untuk menghasilkan berkas APK resmi:\n");

console.log("-------------------------------------------------------");
console.log("METODE 1: Cloud Build via PWABuilder (Paling Cepat & Mudah)");
console.log("-------------------------------------------------------");
console.log("1. Buka https://www.pwabuilder.com di peramban.");
console.log("2. Masukkan URL website SI BETANG Anda.");
console.log("3. Klik 'Package for Android' -> 'Generate Package'.");
console.log("4. Unduh berkas ZIP, ekstrak, dan salin file '.apk' ke:");
console.log(`   ${APK_DESTINATION}\n`);

console.log("-------------------------------------------------------");
console.log("METODE 2: Lokal Build via Google Bubblewrap CLI");
console.log("-------------------------------------------------------");
console.log("Pastikan JDK 17+ dan Android SDK terpasang di komputer/server Anda.");
console.log("Jalankan perintah berikut:\n");
console.log("   npx @bubblewrap/cli build\n");
console.log("Setelah selesai, salin file APK hasil build ke:");
console.log(`   ${APK_DESTINATION}\n`);

// 4. Periksa apakah sudah ada APK yang siap diunduh
if (fs.existsSync(APK_DESTINATION)) {
  const stats = fs.statSync(APK_DESTINATION);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`[✓] Berkas APK aktif terdeteksi: sibetang-kemenag.apk (${sizeMB} MB)`);
  console.log(`[✓] Tersedia di URL: /download/sibetang-kemenag.apk\n`);
} else {
  // Buat file placeholder README di folder download
  const readmePath = path.resolve(DOWNLOAD_DIR, "README.txt");
  fs.writeFileSync(
    readmePath,
    "Tempatkan berkas sibetang-kemenag.apk di folder ini agar dapat diunduh langsung oleh pengguna dari tombol web.\n"
  );
  console.log(`[!] Catatan: Berkas ${APK_DESTINATION} belum ada.`);
  console.log("    Silakan lakukan build via Metode 1 atau Metode 2 di atas lalu tempatkan di folder tersebut.\n");
}
