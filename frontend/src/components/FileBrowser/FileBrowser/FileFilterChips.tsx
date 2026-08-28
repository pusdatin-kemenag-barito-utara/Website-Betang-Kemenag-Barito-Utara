import {
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  Star,
  FileArchive,
} from "lucide-react";

interface FileFilterChipsProps {
  filterType: string;
  onFilterChange: (type: string) => void;
}

export function FileFilterChips({ filterType, onFilterChange }: FileFilterChipsProps) {
  const chips = [
    { id: "all", label: "Semua" },
    { id: "starred", label: "Berbintang", icon: Star },
    { id: "folder", label: "Folder", icon: FolderIcon },
    { id: "pdf", label: "PDF", icon: FileText },
    { id: "image", label: "Gambar", icon: ImageIcon },
    { id: "archive", label: "Arsip / ZIP", icon: FileArchive },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1 select-none">
      {chips.map((chip) => {
        const Icon = chip.icon;
        const isActive = filterType === chip.id;

        return (
          <button
            key={chip.id}
            onClick={() => onFilterChange(chip.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              isActive
                ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500"
                : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {Icon && <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />}
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
