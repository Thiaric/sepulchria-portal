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
  const targetCharacterId =
    text(formData, "targetCharacterId") || null;

  if (!["standard", "unique"].includes(recordKind) || !recordId) {
    return { ok: false, message: "Invalid Item." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "use_own_inventory_record_targeted",
    {
      p_record_kind: recordKind,
      p_record_id: recordId,
      p_target_character_id: targetCharacterId,
    },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = (data ?? {}) as {
    ok?: boolean;
    blocked?: boolean;
    block_reason?: string;
    item_name?: string;
    target_name?: string;
    health_delta?: number;
    temporary_effects?: number;
  };

  if (result.blocked) {
    return {
      ok: false,
      message:
        result.block_reason ??
        "This Item cannot be used right now.",
    };
  }

  if (recordKind === "standard") {
    const { error: normalizeError } =
      await supabase.rpc(
        "normalize_inventory_after_change",
        {
          p_other_character_id: null,
        },
      );

    if (normalizeError) {
      return {
        ok: false,
        message:
          "Item used, but remaining stacks could not be consolidated: " +
          normalizeError.message,
      };
    }
  }

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

  const target =
    result.target_name
      ? ` on ${result.target_name}`
      : "";

  return {
    ok: true,
    message: details.length
      ? `${result.item_name ?? "Item"} used${target}: ${details.join(", ")}.`
      : `${result.item_name ?? "Item"} used${target}.`,
  };
}
