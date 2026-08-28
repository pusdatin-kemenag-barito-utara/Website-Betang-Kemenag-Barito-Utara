import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { getStorageUsage } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

const DEFAULT_LIMIT_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB

let cachedStorage: {
  usedBytes: number;
  limitBytes: number;
  percentage: number;
} | null = null;

export function StorageQuotaWidget() {
  const [usage, setUsage] = useState<{
    usedBytes: number;
    limitBytes: number;
    percentage: number;
  } | null>(cachedStorage);

  useEffect(() => {
    let mounted = true;
    getStorageUsage().then((res) => {
      if (!mounted) return;
      if (res.success) {
        const data = {
          usedBytes: res.usedBytes,
          limitBytes: res.limitBytes || DEFAULT_LIMIT_BYTES,
          percentage: res.percentage,
        };
        cachedStorage = data;
        setUsage(data);
        trackEvent("view_storage_usage", {
          used_bytes: res.usedBytes,
          limit_bytes: res.limitBytes || DEFAULT_LIMIT_BYTES,
          percentage: res.percentage,
        });
      }
    });

    const handleStorageUpdated = () => {
      getStorageUsage().then((res) => {
        if (!mounted) return;
        if (res.success) {
          const data = {
            usedBytes: res.usedBytes,
            limitBytes: res.limitBytes || DEFAULT_LIMIT_BYTES,
            percentage: res.percentage,
          };
          cachedStorage = data;
          setUsage(data);
        }
      });
    };

    window.addEventListener("storage-updated", handleStorageUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("storage-updated", handleStorageUpdated);
    };
  }, []);

  const usedBytes = usage?.usedBytes ?? 0;
  const limitBytes = usage?.limitBytes ?? DEFAULT_LIMIT_BYTES;
  const percentage = usage ? Math.min(usage.percentage, 100) : 0;

  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <HardDrive className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Penyimpanan
            </p>
            <p className="text-[11px] font-semibold text-white">
              {formatFileSize(usedBytes)} <span className="text-slate-500">/ {formatFileSize(limitBytes)}</span>
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-400">{Math.round(percentage)}%</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}