"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSection } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = new Set([
  "pending",
  "under_review",
  "accepted",
  "rejected",
]);

export async function updateOrderSubmissionAction(formData: FormData) {
  const staff = await requireAdminSection("orders");

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const staffNotes = String(formData.get("staffNotes") ?? "").trim();

  if (!submissionId || !VALID_STATUSES.has(status)) {
    throw new Error("Invalid Order submission update.");
  }

  const supabase = await createClient();
  const reviewed = status !== "pending";

  const { error } = await supabase
    .from("order_submissions")
    .update({
      status,
      staff_notes: staffNotes || null,
      reviewed_by_user_id: reviewed ? staff.userId : null,
      reviewed_at: reviewed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/order-submissions");
}
