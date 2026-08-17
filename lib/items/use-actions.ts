"use server";

import { createClient } from "@/lib/supabase/server";

export type UseInventoryItemResult = {
  ok: boolean;
  message: string;
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function useInventoryItem(
  formData: FormData,
): Promise<UseInventoryItemResult> {
  const recordKind = text(formData, "recordKind");
  const recordId = text(formData, "recordId");

  if (!["standard", "unique"].includes(recordKind) || !recordId) {
    return { ok: false, message: "Invalid Item." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "use_own_inventory_record",
    {
      p_record_kind: recordKind,
      p_record_id: recordId,
    },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = (data ?? {}) as {
    item_name?: string;
    health_delta?: number;
    temporary_effects?: number;
  };

  const details: string[] = [];

  if (Number(result.health_delta ?? 0) !== 0) {
    const amount = Number(result.health_delta);

    details.push(
      amount > 0
        ? `restored ${amount} Health`
        : `changed Health by ${amount}`,
    );
  }

  if (Number(result.temporary_effects ?? 0) > 0) {
    details.push("temporary effect activated");
  }

  // IMPORTANT:
  // Do not call revalidatePath() here.
  // The client performs one controlled router.refresh() after the action
  // succeeds. Combining revalidatePath + router.refresh + realtime refresh
  // caused overlapping renders when an Item changed the character row.

  return {
    ok: true,
    message: details.length
      ? `${result.item_name ?? "Item"} used: ${details.join(", ")}.`
      : `${result.item_name ?? "Item"} used.`,
  };
}
