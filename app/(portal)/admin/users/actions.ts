"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const STAFF_ROLES = [
  "owner",
  "admin",
  "moderator",
  "master",
] as const;

type StaffRole =
  (typeof STAFF_ROLES)[number];

function readRequiredUuid(
  value: FormDataEntryValue | null,
): string {
  if (typeof value !== "string") {
    throw new Error(
      "The user identifier is missing.",
    );
  }

  const trimmed = value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(trimmed)) {
    throw new Error(
      "The submitted user identifier is invalid.",
    );
  }

  return trimmed;
}

function readOptionalRole(
  value: FormDataEntryValue | null,
): StaffRole | null {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const role = value.trim();

  if (
    !STAFF_ROLES.includes(
      role as StaffRole,
    )
  ) {
    throw new Error(
      "The selected staff role is invalid.",
    );
  }

  return role as StaffRole;
}

export async function updateUserStaffRole(
  formData: FormData,
) {
  await requireAdmin();

  const userId = readRequiredUuid(
    formData.get("userId"),
  );

  const role = readOptionalRole(
    formData.get("role"),
  );

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "set_staff_role",
    {
      target_user_id: userId,
      new_role: role,
    },
  );

  if (error) {
    throw new Error(
      `Unable to update staff role: ${error.message}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");

  redirect("/admin/users");
}