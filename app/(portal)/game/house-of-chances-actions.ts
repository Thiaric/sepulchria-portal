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
    | {
        type: "item";
        item_id: string;
        name: string;
        quantity: number;
        image_url: string | null;
        quality: string;
      }
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

  const itemRewardIds = Array.from(
    new Set(
      result.reward_snapshot
        .filter(
          (
            reward,
          ): reward is Extract<
            HouseOfChancesPlayResult["reward_snapshot"][number],
            { type: "item" }
          > => reward.type === "item",
        )
        .map((reward) => reward.item_id),
    ),
  );

  if (itemRewardIds.length > 0) {
    const { data: prizeItems } = await supabase
      .from("items")
      .select("id, image_url, quality")
      .in("id", itemRewardIds);

    const itemVisualById = new Map(
      (prizeItems ?? []).map((item) => [
        String(item.id),
        {
          image_url:
            item.image_url
              ? String(item.image_url)
              : null,
          quality:
            item.quality
              ? String(item.quality)
              : "average",
        },
      ]),
    );

    result.reward_snapshot = result.reward_snapshot.map((reward) =>
      reward.type === "item"
        ? {
            ...reward,
            image_url:
              itemVisualById.get(
                reward.item_id,
              )?.image_url ??
              null,
            quality:
              itemVisualById.get(
                reward.item_id,
              )?.quality ??
              "average",
          }
        : reward,
    );
  }

  revalidatePath("/game");
  revalidatePath("/character");

  return {
    ok: true as const,
    message: result.matched_rule_name
      ? `Fortune smiles: ${result.matched_rule_name}.`
      : null,
    result,
  };
}
