import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Insert-only audit trail. Failures are logged but never block the calling
 * action -- the audit row is a side effect, not part of the transaction.
 */
export async function logAudit(
  supabase: SupabaseClient,
  entry: {
    entity: string;
    entityId: string;
    action: string;
    actorId: string;
    details?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("audit_log").insert({
    entity: entry.entity,
    entity_id: entry.entityId,
    action: entry.action,
    actor_id: entry.actorId,
    details: entry.details ?? null,
  });

  if (error) {
    console.error("audit log insert failed:", error.message);
  }
}
