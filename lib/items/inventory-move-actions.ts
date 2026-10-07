"use server";

import { createClient } from "@/lib/supabase/server";

export type MoveOwnInventoryItemResult = {
  ok: boolean;
  message: string;
  targetContainerId: string | null;
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function moveOwnInventoryItem(
  formData: FormData,
): Promise<MoveOwnInventoryItemResult> {
  const recordKind = text(formData, "recordKind");
  const recordId = text(formData, "recordId");
  const targetContainerId =
    text(formData, "targetContainerId") || null;

  if (
    !["standard", "unique"].includes(recordKind) ||
    !recordId
  ) {
    return {
      ok: false,
      message: "Invalid Item.",
      targetContainerId,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "move_own_inventory_record",
    {
      p_record_kind: recordKind,
      p_record_id: recordId,
      p_target_container_id: targetContainerId,
    },
  );

  if (error) {
    return {
      ok: false,
      message: error.message,
      targetContainerId,
    };
  }

  return {
    ok: true,
    message: "Item moved.",
    targetContainerId,
  };
}
