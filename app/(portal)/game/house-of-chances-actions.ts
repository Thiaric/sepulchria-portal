"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type HouseOfChancesPlayResult = {
  play_id: string;
  roll_1: number;
  roll_2: number;
  roll_3: number;
  roll_total: number;
  cost_paid: number;
  matched_rule_id: string | null;
  matched_rule_name: string | null;
  reward_snapshot: Array<
    | { type: "remnants"; amount: number }
    | { type: "item"; item_id: string; name: string; quantity: number }
  >;
  wallet_balance: number;
  plays_used: number;
  plays_remaining: number;
};

export async function playHouseOfChances() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("play_house_of_chances");

  if (error) {
    return { ok: false as const, message: error.message, result: null };
  }

  const raw = Array.isArray(data) ? data[0] : data;

  if (!raw) {
    return {
      ok: false as const,
      message: "The House could not confirm the play.",
      result: null,
    };
  }

  const result = raw as HouseOfChancesPlayResult;

  revalidatePath("/game");
  revalidatePath("/character");

  return {
    ok: true as const,
    message: result.matched_rule_name
      ? `Fortune smiles: ${result.matched_rule_name}.`
      : "No prize this time.",
    result,
  };
}
