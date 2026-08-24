"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireStaffCapability,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function adjustCharacterRemnants(formData: FormData) {
  await requireStaffCapability("character_economy");

  const characterId = String(formData.get("characterId") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const reason = String(formData.get("reason") ?? "").trim();

  if (!characterId) throw new Error("Character is required.");
  if (!Number.isSafeInteger(amount) || amount === 0) {
    throw new Error("Enter a whole non-zero Remnant adjustment.");
  }
  if (reason.length < 3) throw new Error("A staff adjustment reason is required.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_adjust_remnants", {
    p_character_id: characterId,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/characters/${characterId}`);
  revalidatePath("/character");
}
