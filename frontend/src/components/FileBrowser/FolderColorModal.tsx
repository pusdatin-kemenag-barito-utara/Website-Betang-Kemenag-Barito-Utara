import { useState } from "react";
import { X, Check, Palette, RotateCcw } from "lucide-react";
import type { FileItem } from "@/lib/types";

interface FolderColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FileItem | null;
  onSelectColor: (folderId: string, color: string | null) => Promise<void>;
}

const PRESET_COLORS = [
  { name: "Default (Hijau)", value: null, hex: "#10b981", bgClass: "bg-emerald-500" },
  { name: "Biru Laut", value: "#0284c7", hex: "#0284c7", bgClass: "bg-sky-600" },
  { name: "Indigo Sapphire", value: "#4f46e5", hex: "#4f46e5", bgClass: "bg-indigo-600" },
  { name: "Ungu Violet", value: "#9333ea", hex: "#9333ea", bgClass: "bg-purple-600" },
  { name: "Emas / Amber", value: "#d97706", hex: "#d97706", bgClass: "bg-amber-600" },
  { name: "Merah Crimson", value: "#e11d48", hex: "#e11d48", bgClass: "bg-rose-600" },
  { name: "Teal Cyan", value: "#0d9488", hex: "#0d9488", bgClass: "bg-teal-600" },
  { name: "Abu-abu Slate", value: "#475569", hex: "#475569", bgClass: "bg-slate-600" },
  { name: "Pink Fuchia", value: "#db2777", hex: "#db2777", bgClass: "bg-pink-600" },
];

export function FolderColorModal({
  isOpen,
  onClose,
  folder,
  onSelectColor,
}: FolderColorModalProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(folder?.color || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !folder) return null;

  const handleSave = async (color: string | null) => {
    setSelectedColor(color);
    setIsSubmitting(true);
    try {
      await onSelectColor(folder.id, color);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Ubah Warna Folder
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {folder.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette Grid */}
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            {PRESET_COLORS.map((c) => {
              const isSelected = selectedColor === c.value || (!selectedColor && c.value === null);
              return (
                <button
                  key={c.name}
                  onClick={() => handleSave(c.value)}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group relative"
                  title={c.name}
                >
                  <div
                    className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 ${c.bgClass}`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-full">
                    {c.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {folder.color && (
            <button
              onClick={() => handleSave(null)}
              disabled={isSubmitting}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-dashed border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Kembalikan ke Warna Standar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
