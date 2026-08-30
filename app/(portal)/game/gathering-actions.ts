"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type GatheringResult = {
  ok: boolean;
  attempt_id: string;
  outcome_type: "item" | "remnants" | "nothing";
  item_id: string | null;
  item_name: string | null;
  item_image_url: string | null;
  quantity: number | null;
  remnants: number | null;
  ledger_id?: string | null;
  wallet_balance?: number | null;
  attempts_used: number;
  attempts_remaining: number;
  daily_limit: number;
  location_name: string;
  message: string;
};

export async function gatherAtCurrentLocation() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "gather_at_current_location",
  );

  if (error) {
    return {
      ok: false as const,
      message: error.message,
      result: null,
    };
  }

  const raw = Array.isArray(data)
    ? data[0] ?? null
    : data;

  if (!raw || typeof raw !== "object") {
    return {
      ok: false as const,
      message: "The Gathering attempt could not be confirmed.",
      result: null,
    };
  }

  const result = raw as GatheringResult;

  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/crafting");

  return {
    ok: true as const,
    message: result.message,
    result,
  };
}
