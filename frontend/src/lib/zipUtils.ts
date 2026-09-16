import JSZip from "jszip";
import { getFolderContents, createFolder } from "@/lib/api";

/**
 * Mendeteksi MIME type berkas secara akurat berdasarkan ekstensi.
 */
export function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };
  return mimeMap[ext] || "application/octet-stream";
}

/**
 * Mengecek apakah berkas atau nama berkas merupakan arsip ZIP.
 */
export function isZipFile(fileOrName: File | string): boolean {
  if (typeof fileOrName === "string") {
    return fileOrName.toLowerCase().endsWith(".zip");
  }
  return (
    fileOrName.name.toLowerCase().endsWith(".zip") ||
    fileOrName.type.includes("zip") ||
    fileOrName.type === "application/x-zip-compressed"
  );
}

export interface ExtractedZipItem {
  file: File;
  relativePath: string;
  directorySegments: string[];
  directoryPath: string;
}

export interface ZipExtractionResult {
  items: ExtractedZipItem[];
  files: File[];
  directories: string[];
  totalInZip: number;
  skippedCount: number;
  folderName: string;
}

/**
 * Mengekstrak berkas beserta hierarki foldernya dari dalam arsip ZIP secara aman di browser client.
 * Menghasilkan daftar berkas dengan informasi folder bersarang dan daftar direktori utuh.
 */
export async function extractFilesFromZip(
  zipFileOrBlob: File | Blob,
  maxFiles = 1000,
  defaultBaseName = "arsip",
): Promise<ZipExtractionResult> {
  const zip = await JSZip.loadAsync(zipFileOrBlob);
  const items: ExtractedZipItem[] = [];
  const files: File[] = [];
  let totalInZip = 0;
  let skippedCount = 0;

  const entries = Object.values(zip.files);
  const baseName =
    zipFileOrBlob instanceof File
      ? zipFileOrBlob.name.replace(/\.zip$/i, "")
      : defaultBaseName;

  // Kumpulkan seluruh direktori unik yang valid dari entri ZIP
  const dirSet = new Set<string>();

  for (const entry of entries) {
    const rawPath = entry.name.replace(/\\/g, "/");
    const parts = rawPath.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    // Abaikan direktori/berkas tersembunyi dan artefak sistem
    const hasIgnored = parts.some(
      (p) =>
        p.startsWith(".") ||
        p === "__MACOSX" ||
        p.toLowerCase() === "thumbs.db" ||
        p.toLowerCase() === "desktop.ini",
    );
    if (hasIgnored) continue;

    if (entry.dir) {
      // Semua bagian path adalah folder
      for (let i = 1; i <= parts.length; i++) {
        dirSet.add(parts.slice(0, i).join("/"));
      }
    } else {
      // Entri berkas: bagian selain elemen terakhir adalah folder
      const dirParts = parts.slice(0, -1);
      for (let i = 1; i <= dirParts.length; i++) {
        dirSet.add(dirParts.slice(0, i).join("/"));
      }
    }
  }

  // Urutkan direktori dari yang teratas (parent) ke terdalam (child)
  const directories = Array.from(dirSet).sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b, "id-ID", { numeric: true, sensitivity: "base" });
  });

  const seenPaths = new Map<string, number>();

  for (const entry of entries) {
    if (entry.dir) continue;

    const rawPath = entry.name.replace(/\\/g, "/");
    const parts = rawPath.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    // Abaikan berkas tersembunyi / metadata sistem operasi
    const hasIgnored = parts.some(
      (p) =>
        p.startsWith(".") ||
        p === "__MACOSX" ||
        p.toLowerCase() === "thumbs.db" ||
        p.toLowerCase() === "desktop.ini",
    );
    if (hasIgnored) continue;

    const fileName = parts[parts.length - 1];
    const dirSegments = parts.slice(0, -1);
    const directoryPath = dirSegments.join("/");

    totalInZip++;

    if (items.length >= maxFiles) {
      skippedCount++;
      continue;
    }

    try {
      const blob = await entry.async("blob");
      const mimeType = getMimeTypeFromFileName(fileName);

      // Tangani nama duplikat jika ada file bernama sama di folder yang persis sama
      const pathKey = directoryPath ? `${directoryPath}/${fileName}` : fileName;
      let finalFileName = fileName;

      if (seenPaths.has(pathKey)) {
        const count = seenPaths.get(pathKey)! + 1;
        seenPaths.set(pathKey, count);
        const dotIndex = fileName.lastIndexOf(".");
        if (dotIndex > 0) {
          const namePart = fileName.substring(0, dotIndex);
          const extPart = fileName.substring(dotIndex);
          finalFileName = `${namePart} (${count})${extPart}`;
        } else {
          finalFileName = `${fileName} (${count})`;
        }
      } else {
        seenPaths.set(pathKey, 0);
      }

      const relativePath = directoryPath ? `${directoryPath}/${finalFileName}` : finalFileName;

      const extractedFile = new File([blob], finalFileName, {
        type: mimeType,
        lastModified: entry.date ? entry.date.getTime() : Date.now(),
      });

      const item: ExtractedZipItem = {
        file: extractedFile,
        relativePath,
        directorySegments: dirSegments,
        directoryPath,
      };

      items.push(item);
      files.push(extractedFile);
    } catch (err) {
      console.warn(`Gagal mengekstrak berkas "${fileName}" dari ZIP:`, err);
    }
  }

  return {
    items,
    files,
    directories,
    totalInZip,
    skippedCount,
    folderName: baseName,
  };
}

/**
 * Memastikan struktur folder bersarang (misal: ["Tata Usaha", "Kepegawaian"]) telah dibuat
 * di database di bawah folder induk `baseParentId`, dan mengembalikan ID folder tujuan.
 * Menggunakan folderCache lokal agar tidak melakukan pemanggilan API berulang untuk path yang sama.
 */
export async function ensureFolderPath(
  baseParentId: string,
  segments: string[],
  folderCache: Map<string, string>,
): Promise<string> {
  const cleanBaseId =
    !baseParentId || baseParentId === "undefined" || baseParentId === "null" || baseParentId === "starred"
      ? "root"
      : baseParentId;

  if (!segments || segments.length === 0) {
    return cleanBaseId;
  }

  let currentParentId = cleanBaseId;
  let currentPathKey = cleanBaseId;

  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) continue;

    currentPathKey += "/" + segment.toLowerCase();

    // 1. Cek dari memory cache lokal proses saat ini
    if (folderCache.has(currentPathKey)) {
      currentParentId = folderCache.get(currentPathKey)!;
      continue;
    }

    // 2. Cek apakah folder dengan nama ini sudah ada di dalam currentParentId
    let targetFolderId: string | null = null;
    try {
      const contentsRes = await getFolderContents(currentParentId, "", true);
      if (contentsRes.success && contentsRes.data) {
        const rawFolders = Array.isArray(contentsRes.data)
          ? contentsRes.data
          : (contentsRes.data.folders || []);

        const existing = rawFolders.find((it: any) => {
          const folderObj = it.folder || it;
          const name = folderObj?.name || it?.name;
          return typeof name === "string" && name.trim().toLowerCase() === segment.toLowerCase();
        });

        if (existing) {
          const folderObj = existing.folder || existing;
          targetFolderId = folderObj.id || existing.id;
        }
      }
    } catch (err) {
      console.warn(`Pengecekan folder "${segment}" gagal, mencoba membuat baru:`, err);
    }

    // 3. Jika belum ada, buat folder baru di bawah currentParentId
    if (!targetFolderId) {
      const parentArg = currentParentId === "root" ? null : currentParentId;
      const createRes = await createFolder(segment, parentArg);
      if (createRes.success && createRes.data?.id) {
        targetFolderId = createRes.data.id;
      } else {
        console.warn(`Gagal membuat subfolder "${segment}" saat ekstraksi:`, createRes.error);
        targetFolderId = currentParentId;
      }
    }

    const resolvedFolderId: string = targetFolderId || currentParentId;
    folderCache.set(currentPathKey, resolvedFolderId);
    currentParentId = resolvedFolderId;
  }

  return currentParentId;
}
