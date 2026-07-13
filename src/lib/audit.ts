import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type AuditAction = "INSERT" | "UPDATE" | "DELETE"

interface LogAuditParams {
  action: AuditAction
  target: string
  beforeState?: unknown
  afterState?: unknown
}

export async function logAudit({ action, target, beforeState, afterState }: LogAuditParams) {
  try {
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      console.warn("[AUDIT] Skipping audit log, no authenticated user found.")
      return
    }

    const adminClient = createAdminClient()

    // Call the RPC function that we created in the public schema to bypass PostgREST schema exposure limits
    const { error } = await adminClient.rpc('log_pusdatin_audit', {
      p_action: action,
      p_target: target,
      p_target_schema: 'kemenag_arsip',
      p_performed_by: user.id,
      p_before_state: beforeState || null,
      p_after_state: afterState || null,
      p_ip: null
    })

    if (error) {
      console.error("[AUDIT] Failed to insert audit log:", error.message)
    }
  } catch (error) {
    console.error("[AUDIT] Unexpected error while logging:", error)
  }
}
