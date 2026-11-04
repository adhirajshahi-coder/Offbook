import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Write an audit entry as the signed-in staff member (PRD §12.10). */
export async function audit(action: string, targetType: string, targetId: string | null, details: Record<string, unknown> = {}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("write_audit", {
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
    p_details: details,
  });
  if (error) console.error("[audit failed]", action, error.message);
}
