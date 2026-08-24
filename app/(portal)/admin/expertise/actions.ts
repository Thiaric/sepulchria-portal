"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function awardExpertise(formData: FormData): Promise<void> {
  await requireAdminSection("expertise");

  const characterId = String(formData.get("character_id") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim();

  if (!characterId) {
    throw new Error("Character is required.");
  }

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Enter a non-zero Expertise amount.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_award_expertise", {
    p_character_id: characterId,
    p_amount: amount,
    p_note: note || null,
  });

  if (error) {
    throw new Error(`Unable to award Expertise: ${error.message}`);
  }

  revalidatePath("/admin/expertise");
  revalidatePath("/characters");
}
