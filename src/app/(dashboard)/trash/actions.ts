"use server"

import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"

export async function restoreTrashItem(id: string, type: "folder" | "file") {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const table = type === "folder" ? "folders" : "files"
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error

    await logAudit({
      action: "UPDATE",
      target: `Restore Trash Item: ${type} ID ${id}`
    })

    return { success: true }
  } catch (error) {
    console.error("Error restoring item:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function permanentDeleteTrashItems(items: { id: string, type: "folder" | "file" }[]) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const fileIds = items.filter(i => i.type === "file").map(i => i.id)
    const folderIds = items.filter(i => i.type === "folder").map(i => i.id)

    if (fileIds.length > 0) {
      const { error: fileErr } = await supabase.from("files").delete().in("id", fileIds)
      if (fileErr) throw fileErr
    }

    if (folderIds.length > 0) {
      const { error: folderErr } = await supabase.from("folders").delete().in("id", folderIds)
      if (folderErr) throw folderErr
    }

    await logAudit({
      action: "DELETE",
      target: `Permanent delete ${items.length} items from Trash`
    })

    return { success: true }
  } catch (error) {
    console.error("Error permanently deleting items:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
