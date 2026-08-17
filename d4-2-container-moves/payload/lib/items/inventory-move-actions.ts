"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string): never {
  const params = new URLSearchParams();
  params.set("error", message);
  redirect(`/character?${params.toString()}`);
}

export async function moveOwnInventoryItem(
  formData: FormData,
) {
  const recordKind = text(formData, "recordKind");
  const recordId = text(formData, "recordId");
  const targetContainerId =
    text(formData, "targetContainerId") || null;

  if (
    !["standard", "unique"].includes(recordKind) ||
    !recordId
  ) {
    fail("Invalid Item.");
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
    fail(error.message);
  }

  revalidatePath("/character");
  revalidatePath("/characters");
}
