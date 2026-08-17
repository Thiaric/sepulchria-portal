"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(
  formData: FormData,
  name: string,
) {
  const value = formData.get(name);
  return typeof value === "string"
    ? value.trim()
    : "";
}

function validKind(
  value: string,
): value is "standard" | "unique" {
  return value === "standard" || value === "unique";
}

function refresh() {
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/game");
}

function fail(message: string): never {
  const params = new URLSearchParams();
  params.set("error", message);
  redirect(`/character?${params.toString()}`);
}

export async function equipInventoryItem(
  formData: FormData,
) {
  const recordKind = text(
    formData,
    "recordKind",
  );
  const recordId = text(
    formData,
    "recordId",
  );

  if (
    !validKind(recordKind) ||
    !recordId
  ) {
    fail("Invalid Item.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "equip_character_inventory_record",
    {
      p_record_kind: recordKind,
      p_record_id: recordId,
    },
  );

  if (error) {
    fail(error.message);
  }

  refresh();
}

export async function unequipInventoryItem(
  formData: FormData,
) {
  const recordKind = text(
    formData,
    "recordKind",
  );
  const recordId = text(
    formData,
    "recordId",
  );

  if (
    !validKind(recordKind) ||
    !recordId
  ) {
    fail("Invalid Item.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "unequip_character_inventory_record",
    {
      p_record_kind: recordKind,
      p_record_id: recordId,
    },
  );

  if (error) {
    fail(error.message);
  }

  refresh();
}
