"use client"

import { useState } from "react"
import { updateDisableRightClick } from "@/lib/api"
import { toast } from "sonner"
import { MousePointerClick, ShieldCheck, Loader2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

export function SettingsClient({ initialDisableRightClick }: { initialDisableRightClick: boolean }) {
  const [disableRightClick, setDisableRightClick] = useState(initialDisableRightClick)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)
    const newValue = !disableRightClick
    
    trackEvent("toggle_setting", {
      setting_name: "disable_right_click",
      new_value: newValue,
    })

    // Optimistic update
    setDisableRightClick(newValue)

    const result = await updateDisableRightClick(newValue)
    
    if (result.success) {
      const root = document.getElementById("dashboard-root")
      if (root) {
        root.dataset.disableRightClick = String(newValue)
      }
      toast.success(
        newValue 
          ? "Pemblokiran klik kanan diaktifkan." 
          : "Pemblokiran klik kanan dinonaktifkan."
      )
    } else {
      // Revert on error
      setDisableRightClick(!newValue)
      const root = document.getElementById("dashboard-root")
      if (root) {
        root.dataset.disableRightClick = String(!newValue)
      }
      toast.error(result.error || "Terjadi kesalahan saat menyimpan pengaturan.")
    }
    
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
        <div className="flex gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${disableRightClick ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
            {disableRightClick ? <ShieldCheck className="h-6 w-6" /> : <MousePointerClick className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Blokir Klik Kanan Browser</h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">
              Jika diaktifkan, menu bawaan browser saat menekan klik kanan (Context Menu) akan diblokir secara global di seluruh aplikasi. Pengguna akan dipaksa menggunakan menu interaktif bawaan aplikasi.
            </p>
          </div>
        </div>
        
        {/* Modern Toggle Switch */}
        <button
          role="switch"
          aria-checked={disableRightClick}
          disabled={isLoading}
          onClick={handleToggle}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            disableRightClick ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <span className="sr-only">Toggle Right Click Blocker</span>
          {isLoading && (
            <span className="absolute inset-0 z-10 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-white opacity-70" />
            </span>
          )}
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              disableRightClick ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}