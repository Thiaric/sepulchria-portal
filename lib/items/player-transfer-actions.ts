"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DiscardInventoryResult = {
  ok: boolean;
  message: string;
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function discardInventoryItem(
  formData: FormData,
): Promise<DiscardInventoryResult> {
  const recordKind = text(formData, "recordKind");
  const recordId = text(formData, "recordId");
  const parsed = Number.parseInt(text(formData, "quantity") || "1", 10);
  const quantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  if (!["standard", "unique"].includes(recordKind) || !recordId) {
    return { ok: false, message: "Invalid Item." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "discard_own_inventory_record",
    { k: recordKind, r: recordId, q: quantity },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  if (recordKind === "standard") {
    const { error: normalizeError } = await supabase.rpc(
      "normalize_own_inventory_stacks",
    );

    if (normalizeError) {
      return {
        ok: false,
        message:
          "Item discarded, but the remaining stacks could not be consolidated: " +
          normalizeError.message,
      };
    }
  }

  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/game");

  return {
    ok: true,
    message:
      recordKind === "unique"
        ? "Unique Item returned to the Admin Vault."
        : "Item discarded.",
  };
}
