"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function createBidang(name: string, sort_order: number = 0) {
  const supabase = await createClient()

  // Pastikan nama bidang valid
  if (!name || name.trim() === "") {
    return { success: false, error: "Nama bidang tidak boleh kosong" }
  }

  // Cek apakah sudah ada yang dengan nama sama
  const { data: existing } = await supabase
    .from("bidang")
    .select("id")
    .ilike("name", name.trim())
    .single()

  if (existing) {
    return { success: false, error: "Bidang dengan nama tersebut sudah ada" }
  }

  const { error } = await supabase
    .from("bidang")
    .insert([{ name: name.trim(), sort_order }])

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/bidang")
  await logAudit({
    action: "INSERT",
    target: `Bidang: ${name.trim()}`
  })
  return { success: true }
}

export async function updateBidang(id: string, name: string, sort_order: number = 0) {
  const supabase = await createClient()

  if (!name || name.trim() === "") {
    return { success: false, error: "Nama bidang tidak boleh kosong" }
  }

  // Cek nama kembar
  const { data: existing } = await supabase
    .from("bidang")
    .select("id")
    .ilike("name", name.trim())
    .neq("id", id)
    .single()

  if (existing) {
    return { success: false, error: "Bidang dengan nama tersebut sudah ada" }
  }

  const { error } = await supabase
    .from("bidang")
    .update({ name: name.trim(), sort_order })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/bidang")
  // User list dropdown depends on this, also revalidate /users
  revalidatePath("/users")
  await logAudit({
    action: "UPDATE",
    target: `Bidang: ${name.trim()}`
  })
  return { success: true }
}

export async function deleteBidang(id: string) {
  const supabase = await createClient()

  // Validasi 1: Apakah ada pengguna yang terdaftar di bidang ini?
  // (Pengecekan dihilangkan karena data user sekarang tersentralisasi di schema kemenag_pusdatin
  // dan aplikasi Si Betang sekarang menggunakan bidang = 'global')

  // Validasi 2: Apakah ada dokumen/file yang terdaftar di bidang ini?
  const { count: filesCount, error: fileError } = await supabase
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("bidang_id", id)
    .is("deleted_at", null)

  if (fileError) return { success: false, error: fileError.message }

  if (filesCount && filesCount > 0) {
    return { success: false, error: `Tidak bisa menghapus bidang ini karena masih memiliki ${filesCount} dokumen aktif.` }
  }

  const { error } = await supabase
    .from("bidang")
    .delete()
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/bidang")
  revalidatePath("/users")
  await logAudit({
    action: "DELETE",
    target: `Bidang ID: ${id}`
  })
  return { success: true }
}

export async function reorderBidang(items: { id: string, sort_order: number }[]) {
  const supabase = await createClient()

  // Supabase UPSERT / BULK UPDATE can be done with .upsert if we have PK.
  // We map the incoming items to match the schema
  const updates = items.map(item => ({
    id: item.id,
    sort_order: item.sort_order
  }))

  const { error } = await supabase
    .from("bidang")
    .upsert(updates, { onConflict: 'id' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/bidang")
  await logAudit({
    action: "UPDATE",
    target: `Reorder Bidang`
  })
  return { success: true }
}
