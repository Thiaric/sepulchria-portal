"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function setRegistrationsOpenAction(
  formData: FormData,
) {
  const staff = await requireAdmin();
  const supabase = await createClient();

  const registrationsOpen =
    String(formData.get("registrationsOpen") ?? "false") === "true";

  const { error } = await supabase
    .from("registration_settings")
    .update({
      registrations_open: registrationsOpen,
      updated_at: new Date().toISOString(),
      updated_by: staff.userId,
    })
    .eq("id", 1);

  if (error) {
    throw new Error(
      `Unable to update registration settings: ${error.message}`,
    );
  }

  revalidatePath("/homepage");
  revalidatePath("/auth/sign-up");
  revalidatePath("/admin/new-register");
}
