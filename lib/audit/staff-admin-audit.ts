import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type StaffAdminAuditInput = {
  actorUserId: string;
  actorStaffRole: string;
  action: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordStaffAdminAudit(
  input: StaffAdminAuditInput,
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("staff_admin_audit_log")
    .insert({
      actor_user_id: input.actorUserId,
      actor_staff_role: input.actorStaffRole,
      action: input.action,
      target_user_id: input.targetUserId ?? null,
      metadata: input.metadata ?? {},
    });

  if (error) {
    throw new Error(
      `Unable to record staff audit event: ${error.message}`,
    );
  }
}
