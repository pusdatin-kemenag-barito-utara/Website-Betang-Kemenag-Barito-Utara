import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Settings } from "lucide-react"
import { SettingsClient } from "@/app/(dashboard)/settings/SettingsClient"
import { getAppSettings } from "./actions"
import { PageBanner } from "@/components/ui/PageBanner"

export const metadata = {
  title: "Pengaturan Sistem | E-Arsip",
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Double check Super Admin status
  const { data: meta } = await supabase
    .rpc('get_pusdatin_user', { email_address: user.email })

  if (meta?.role !== 'super_admin' && meta?.role !== 'Super Admin') {
    redirect("/") // Redirect back to home if not super admin
  }

  const { disableRightClick } = await getAppSettings()

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <PageBanner 
        title="Pengaturan Sistem" 
        description="Konfigurasi sistem keamanan dan perilaku antarmuka aplikasi secara global." 
        icon={<Settings className="h-8 w-8 text-white" />} 
      />
      
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="font-bold text-slate-800">Keamanan & Antarmuka</h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengaturan di bawah ini akan diterapkan secara global untuk semua pengguna aplikasi.
          </p>
        </div>
        
        <div className="p-6">
          <SettingsClient initialDisableRightClick={disableRightClick} />
        </div>
      </div>
    </div>
  )
}
