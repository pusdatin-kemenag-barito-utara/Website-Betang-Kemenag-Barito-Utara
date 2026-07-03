"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getAppSettings() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('disable_right_click')
      .eq('id', 1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return { success: true, disableRightClick: data ? data.disable_right_click : true }
  } catch (error) {
    console.error("Error fetching settings:", error)
    return { success: false, error: "Gagal mengambil pengaturan", disableRightClick: true }
  }
}

export async function updateDisableRightClick(disableRightClick: boolean) {
  try {
    const supabase = await createClient()
    
    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    // Super Admin Check
    const { data: meta } = await supabase
      .rpc('get_pusdatin_user', { email_address: user.email })

    if (meta?.role !== 'super_admin' && meta?.role !== 'Super Admin') {
      throw new Error("Akses ditolak. Hanya Super Admin yang dapat mengubah pengaturan ini.")
    }

    const { error } = await supabase
      .from('app_settings')
      .update({ disable_right_click: disableRightClick, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (error) throw error

    revalidatePath('/', 'layout') // Revalidate the whole layout
    return { success: true }
  } catch (error) {
    console.error("Error updating settings:", error)
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan" }
  }
}
