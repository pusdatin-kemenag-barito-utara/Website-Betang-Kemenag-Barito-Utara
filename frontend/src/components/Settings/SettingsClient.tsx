"use client"

import { useState } from "react"
import { updateAppSettings, type AppSettings } from "@/lib/api"
import { toast } from "sonner"
import { trackEvent } from "@/lib/analytics"
import { DocumentSecuritySection } from "./sections/DocumentSecuritySection"
import { CloudStorageSection } from "./sections/CloudStorageSection"
import { UserExperienceSection } from "./sections/UserExperienceSection"
import { SystemHealthSection } from "./sections/SystemHealthSection"

interface SettingsClientProps {
  initialSettings: AppSettings
  currentUser?: {
    name?: string
    email?: string
    role?: string
    isSuperAdmin?: boolean
  } | null
}

export function SettingsClient({ initialSettings, currentUser }: SettingsClientProps) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

  // Local UI-only preferences (persisted in localStorage)
  const [smoothAnimations, setSmoothAnimations] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("betang_smooth_animations") !== "false"
    }
    return true
  })

  const [toastNotifications, setToastNotifications] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("betang_toast_notifications") !== "false"
    }
    return true
  })

  const handleUpdate = async (patch: Partial<AppSettings>, keyLabel: string) => {
    const key = Object.keys(patch)[0]
    setUpdatingKey(key)

    const prev = { ...settings }
    const updated = { ...settings, ...patch }
    setSettings(updated)

    trackEvent("update_app_settings", patch as Record<string, any>)

    const res = await updateAppSettings(patch)
    setUpdatingKey(null)

    if (res.success) {
      if (patch.disable_right_click !== undefined) {
        const root = document.getElementById("dashboard-root")
        if (root) {
          root.dataset.disableRightClick = String(patch.disable_right_click)
        }
      }
      toast.success(`${keyLabel} berhasil diperbarui.`)
    } else {
      setSettings(prev)
      toast.error(res.error || `Gagal memperbarui ${keyLabel}.`)
    }
  }

  const handleToggleAnimations = () => {
    const next = !smoothAnimations
    setSmoothAnimations(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("betang_smooth_animations", String(next))
    }
    toast.success(next ? "Animasi antarmuka diaktifkan." : "Animasi antarmuka disederhanakan.")
  }

  const handleToggleToasts = () => {
    const next = !toastNotifications
    setToastNotifications(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("betang_toast_notifications", String(next))
    }
    toast.success(next ? "Notifikasi toaster aksi aktif." : "Notifikasi toaster aksi dinonaktifkan.")
  }

  return (
    <div className="w-full flex flex-col gap-8">
      {/* 1. Keamanan & Proteksi Dokumen */}
      <DocumentSecuritySection
        settings={settings}
        updatingKey={updatingKey}
        onUpdate={handleUpdate}
      />

      {/* 2. Penyimpanan & Jaringan Cloudflare R2 */}
      <CloudStorageSection
        settings={settings}
        updatingKey={updatingKey}
        onUpdate={handleUpdate}
      />

      {/* 3. Antarmuka & Preferensi Pengguna (UI/UX) */}
      <UserExperienceSection
        settings={settings}
        onUpdate={handleUpdate}
        smoothAnimations={smoothAnimations}
        onToggleAnimations={handleToggleAnimations}
        toastNotifications={toastNotifications}
        onToggleToasts={handleToggleToasts}
      />

      {/* 4. Status Ekosistem & Infrastruktur Cloud */}
      <SystemHealthSection currentUser={currentUser} />
    </div>
  )
}