import { useRef, useState } from "react";
import { Upload, FolderUp } from "lucide-react";

interface UploadDropzoneProps {
  isFolderMode: boolean;
  onFilesSelected: (files: File[]) => void;
  onScanningState: (msg: string) => void;
}

interface WebkitEntry {
  isFile: boolean;
  isDirectory: boolean;
  file: (cb: (file: File) => void) => void;
  createReader: () => { readEntries: (cb: (entries: WebkitEntry[]) => void) => void };
}

export function UploadDropzone({ isFolderMode, onFilesSelected, onScanningState }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFilesFromDataTransfer = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];
    const entries: WebkitEntry[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry() as unknown as WebkitEntry;
        if (entry) entries.push(entry);
      }
    }

    const readEntry = async (entry: WebkitEntry) => {
      if (entry.isFile) {
        return new Promise<void>((resolve) => {
          entry.file((file: File) => {
            files.push(file);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        return new Promise<void>((resolve) => {
          dirReader.readEntries(async (dirEntries: WebkitEntry[]) => {
            for (const childEntry of dirEntries) {
              await readEntry(childEntry);
            }
            resolve();
          });
        });
      }
    };

    for (const entry of entries) {
      await readEntry(entry);
    }
    return files;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      onScanningState("Memindai folder... Mohon tunggu.");
      const extractedFiles = await getFilesFromDataTransfer(e.dataTransfer.items);
      onScanningState("");
      if (extractedFiles.length > 0) {
        onFilesSelected(extractedFiles);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer select-none group ${
        isDragging
          ? "border-emerald-500 bg-emerald-50/60 scale-[0.99]"
          : "border-slate-200 bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-500"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        {...(isFolderMode ? { webkitdirectory: "", directory: "" } : {})}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
          }
          e.target.value = "";
        }}
      />
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 text-emerald-600 mb-3 group-hover:scale-105 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:ring-emerald-200 transition-all">
        {isFolderMode ? <FolderUp className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
      </div>
      <p className="text-sm font-bold text-slate-800 mb-1 group-hover:text-slate-900 transition-colors">
        Tarik & lepas {isFolderMode ? "folder" : "berkas"} di sini, atau
      </p>
      <span className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 group-hover:underline transition-colors">
        Pilih {isFolderMode ? "Folder" : "Berkas"} dari Komputer
      </span>
      <p className="text-[11px] text-slate-400 mt-2">
        Mendukung semua format: Dokumen PDF, Word, Excel, Gambar, Video, Arsip ZIP
      </p>
    </div>
  );
}
