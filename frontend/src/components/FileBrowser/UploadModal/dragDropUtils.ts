/**
 * Utilitas untuk membaca dan mengekstrak berkas dari event Drag & Drop (DataTransfer)
 * secara rekursif, mendukung berkas tunggal, folder bersarang, maupun kombinasi keduanya.
 */

interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
}

interface FileSystemFileEntry extends FileSystemEntry {
  file: (successCallback: (file: File) => void, errorCallback?: (error: any) => void) => void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  createReader: () => FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: any) => void,
  ) => void;
}

/**
 * Membaca seluruh entri dalam suatu direktori secara tuntas.
 * Spesifikasi Chromium membatasi pemanggilan readEntries maksimal ~100 item per panggilan.
 * Kita memanggilnya secara rekursif hingga batch bernilai kosong ([]).
 */
async function readAllEntriesFromReader(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const allEntries: FileSystemEntry[] = [];

  const readBatch = async (): Promise<void> => {
    return new Promise((resolve) => {
      reader.readEntries(
        (batch) => {
          if (!batch || batch.length === 0) {
            resolve();
          } else {
            allEntries.push(...batch);
            readBatch().then(resolve);
          }
        },
        (err) => {
          console.warn("Peringatan saat membaca entri direktori:", err);
          resolve(); // Lanjutkan agar proses tidak macet
        },
      );
    });
  };

  await readBatch();
  return allEntries;
}

/**
 * Mengambil objek File dari FileSystemFileEntry dengan penanganan error.
 */
function getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      entry.file(
        (file) => resolve(file),
        (err) => {
          console.warn(`Gagal membaca berkas "${entry.name}":`, err);
          resolve(null);
        },
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Menelusuri entri file/folder secara rekursif hingga batas maxFiles.
 */
async function traverseEntry(
  entry: FileSystemEntry,
  collectedFiles: File[],
  maxFiles: number,
  basePath = "",
): Promise<void> {
  if (collectedFiles.length >= maxFiles) return;

  const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const file = await getFileFromEntry(entry as FileSystemFileEntry);
    if (file && collectedFiles.length < maxFiles) {
      const lowerName = file.name.toLowerCase();
      if (
        lowerName === "desktop.ini" ||
        lowerName === "thumbs.db" ||
        lowerName === ".ds_store" ||
        lowerName.startsWith("._")
      ) {
        return;
      }

      const fullPath = (entry.fullPath ? entry.fullPath.replace(/^\//, "") : currentPath) || file.name;
      try {
        Object.defineProperty(file, "webkitRelativePath", {
          value: fullPath,
          writable: true,
          configurable: true,
        });
      } catch {
        // Fallback jika browser mencegah override properti
      }
      (file as any).relativePath = fullPath;
      const parts = fullPath.split("/").filter(Boolean);
      if (parts.length > 1) {
        (file as any).directorySegments = parts.slice(0, parts.length - 1);
      }
      collectedFiles.push(file);
    }
  } else if (entry.isDirectory) {
    try {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await readAllEntriesFromReader(reader);
      for (const child of entries) {
        if (collectedFiles.length >= maxFiles) break;
        await traverseEntry(child, collectedFiles, maxFiles, currentPath);
      }
    } catch (err) {
      console.warn(`Gagal memproses folder "${entry.name}":`, err);
    }
  }
}

/**
 * Mengekstrak seluruh berkas dari DataTransfer event (baik file individual maupun folder).
 */
export async function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer,
  maxFiles = 1000,
): Promise<File[]> {
  const collectedFiles: File[] = [];

  // 1. Prioritas: Gunakan DataTransferItemList API (webkitGetAsEntry) untuk membaca folder secara rekursif
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const rootEntries: FileSystemEntry[] = [];
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.kind === "file") {
        if (typeof item.webkitGetAsEntry === "function") {
          const entry = item.webkitGetAsEntry() as FileSystemEntry | null;
          if (entry) {
            rootEntries.push(entry);
          }
        }
      }
    }

    if (rootEntries.length > 0) {
      for (const entry of rootEntries) {
        if (collectedFiles.length >= maxFiles) break;
        await traverseEntry(entry, collectedFiles, maxFiles);
      }

      if (collectedFiles.length > 0) {
        return collectedFiles;
      }
    }
  }

  // 2. Fallback standar (jika browser tidak mendukung webkitGetAsEntry atau drag file biasa):
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    const rawFiles = Array.from(dataTransfer.files);
    for (const f of rawFiles) {
      if (collectedFiles.length >= maxFiles) break;
      const lowerName = f.name.toLowerCase();
      if (
        lowerName === "desktop.ini" ||
        lowerName === "thumbs.db" ||
        lowerName === ".ds_store" ||
        lowerName.startsWith("._")
      ) {
        continue;
      }
      // Filter berkas semu folder 0-byte tanpa ekstensi jika ada
      if (f.size > 0 || f.type !== "") {
        collectedFiles.push(f);
      }
    }
  }

  return collectedFiles;
}
