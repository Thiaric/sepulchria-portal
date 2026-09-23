"use server";

import { randomInt } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { applyGiftCurrentHealthDelta } from "@/lib/gifts/gift-health-effects";
import { createClient } from "@/lib/supabase/server";
import {
  finaliseCharacterDeath,
  getDeathRules,
  reconcileExpiredCharacterDeath,
} from "@/lib/death/death-system";

type LifeState = "alive" | "death_save_pending" | "dead";
type AttributeKey = "muscles" | "reflexes" | "vigor" | "brains" | "shrewd" | "presence_score";

export type DeathRescueFeat = {
  characterGiftId: string;
  name: string;
  description: string;
  healthDelta: number;
  healthDice: string | null;
  successDie: number | null;
  successThreshold: number | null;
  successAttribute: AttributeKey | null;
};

export type MyDeathState = {
  lifeState: LifeState;
  currentHealth: number | null;
  zeroHpAt: string | null;
  deadUntil: string | null;
  diedAt?: string | null;
  essenceEndsAt?: string | null;
  eventId: string | null;
  rescueAttempted: boolean;
  rescueFeats: DeathRescueFeat[];
};

type CharacterRow = {
  id: string;
  display_name: string;
  current_room_id: string | null;
  current_health: number | null;
  life_state: LifeState;
  zero_hp_at: string | null;
  dead_until: string | null;
  died_at: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
};

type EventRow = {
  id: string;
  status: "pending" | "rescued" | "dead" | "revived";
  rescue_attempted_at: string | null;
};

type GiftRelation = {
  name: string;
  description: string | null;
  is_active: boolean;
  effect_mode: "none" | "passive" | "temporary";
  target_mode: "self" | "other" | "either" | null;
  damage_dice: string | null;
  success_die: number | null;
  success_threshold: number | null;
  success_attribute: AttributeKey | null;
  health_delta: number | null;
  health_dice: string | null;
};

function adminClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing Supabase privileged credentials.");
  return createAdminClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function ownedCharacter(): Promise<CharacterRow> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required.");

  const admin = adminClient();
  const result = await admin
    .from("characters")
    .select("id,display_name,current_room_id,current_health,life_state,zero_hp_at,dead_until,died_at,muscles,reflexes,vigor,brains,shrewd,presence_score")
    .eq("user_id", user.id)
    .maybeSingle();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Character not found.");
  }
  return result.data as CharacterRow;
}

async function reconcileExpiredDeath(character: CharacterRow): Promise<CharacterRow> {
  if (character.life_state !== "dead" || !character.dead_until) return character;

  const expiry = Date.parse(character.dead_until);
  if (Number.isNaN(expiry) || expiry > Date.now()) return character;

  await reconcileExpiredCharacterDeath(character.id);

  const admin = adminClient();
  const refreshed = await admin
    .from("characters")
    .select("id,display_name,current_room_id,current_health,life_state,zero_hp_at,dead_until,died_at,muscles,reflexes,vigor,brains,shrewd,presence_score")
    .eq("id", character.id)
    .single();

  if (refreshed.error || !refreshed.data) {
    throw new Error(refreshed.error?.message ?? "Unable to reload Character after resurrection.");
  }

  return refreshed.data as CharacterRow;
}

async function currentPendingEvent(characterId: string): Promise<EventRow | null> {
  const admin = adminClient();
  const result = await admin
    .from("character_death_events")
    .select("id,status,rescue_attempted_at")
    .eq("character_id", characterId)
    .eq("status", "pending")
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) throw new Error(`Unable to load Death event: ${result.error.message}`);
  return result.data as EventRow | null;
}

async function eligibleRescueFeats(characterId: string): Promise<DeathRescueFeat[]> {
  const admin = adminClient();
  const result = await admin
    .from("character_gifts")
    .select(`
      id,
      gift:gifts(
        name,description,is_active,effect_mode,target_mode,damage_dice,
        success_die,success_threshold,success_attribute,health_delta,health_dice
      )
    `)
    .eq("character_id", characterId);

  if (result.error) throw new Error(`Unable to load rescue Feats: ${result.error.message}`);

  const feats: DeathRescueFeat[] = [];
  for (const row of result.data ?? []) {
    const gift = one(row.gift as GiftRelation | GiftRelation[] | null);
    if (
      !gift ||
      !gift.is_active ||
      gift.effect_mode !== "none" ||
      !["self", "either"].includes(gift.target_mode ?? "") ||
      gift.damage_dice ||
      (
        Number(gift.health_delta ?? 0) <= 0 &&
        !gift.health_dice
      )
    ) continue;

    feats.push({
      characterGiftId: String(row.id),
      name: gift.name,
      description: gift.description ?? "",
      healthDelta: Number(gift.health_delta ?? 0),
      healthDice: gift.health_dice ?? null,
      successDie: gift.success_die ?? null,
      successThreshold: gift.success_threshold ?? null,
      successAttribute: gift.success_attribute ?? null,
    });
  }
  return feats;
}

export async function getMyDeathState(): Promise<MyDeathState> {
  const character = await reconcileExpiredDeath(await ownedCharacter());
  const event = character.life_state === "death_save_pending"
    ? await currentPendingEvent(character.id)
    : null;

  const rescueFeats =
    character.life_state === "death_save_pending" && !event?.rescue_attempted_at
      ? await eligibleRescueFeats(character.id)
      : [];

  const rules = await getDeathRules();
  const essenceEndsAt =
    character.life_state === "dead" && character.died_at
      ? new Date(
          Date.parse(character.died_at) +
            rules.essenceWindowMinutes * 60_000,
        ).toISOString()
      : null;

  return {
    lifeState: character.life_state,
    currentHealth: character.current_health,
    zeroHpAt: character.zero_hp_at,
    deadUntil: character.dead_until,
    diedAt: character.died_at,
    essenceEndsAt,
    eventId: event?.id ?? null,
    rescueAttempted: Boolean(event?.rescue_attempted_at),
    rescueFeats,
  };
}

async function finaliseDeath(character: CharacterRow, eventId: string) {
  const result = await finaliseCharacterDeath({
    characterId: character.id,
    deathEventId: eventId,
  });

  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/characters");

  return result.deadUntil;
}

export async function acceptCharacterDeath() {
  try {
    const character = await ownedCharacter();
    if (character.life_state !== "death_save_pending") {
      return { ok: false, message: "There is no pending Death event." };
    }
    const event = await currentPendingEvent(character.id);
    if (!event) return { ok: false, message: "There is no pending Death event." };

    const deadUntil = await finaliseDeath(character, event.id);
    return { ok: true, message: "Death accepted.", deadUntil };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to resolve Death.",
    };
  }
}

const LABELS: Record<AttributeKey, string> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

async function rollRescueSuccess(character: CharacterRow, feat: DeathRescueFeat) {
  if (!feat.successDie) {
    return { success: true, summary: "Success Roll: Automatic - SUCCESS" };
  }

  if (
    ![4, 6, 8, 10, 12, 20, 100].includes(feat.successDie) ||
    !feat.successThreshold ||
    feat.successThreshold < 1
  ) throw new Error("This Feat has an invalid Success Roll.");

  const rolled = randomInt(1, feat.successDie + 1);
  let modifier = 0;
  let modifierText = "";

  if (feat.successAttribute) {
    const effective = await getEffectiveCharacterAttributes(character.id, {
      muscles: character.muscles,
      reflexes: character.reflexes,
      vigor: character.vigor,
      brains: character.brains,
      shrewd: character.shrewd,
      presence_score: character.presence_score,
    });
    modifier = Number(effective[feat.successAttribute] ?? 0);
    modifierText = ` + ${LABELS[feat.successAttribute]} (${modifier >= 0 ? "+" : ""}${modifier})`;
  }

  const total = rolled + modifier;
  const success = total >= feat.successThreshold;
  return {
    success,
    summary:
      `Success Roll: d${feat.successDie} -> ${rolled}${modifierText}` +
      ` = ${total} vs ${feat.successThreshold} - ${success ? "SUCCESS" : "FAILED"}`,
  };
}

function rollRescueHealing(feat: DeathRescueFeat) {
  if (!feat.healthDice) {
    return {
      amount: feat.healthDelta,
      summary: `Healing: ${feat.healthDelta > 0 ? "+" : ""}${feat.healthDelta} Health`,
    };
  }

  const match = /^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(
    feat.healthDice,
  );

  if (!match) {
    throw new Error("This Feat has invalid healing dice.");
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);

  if (count < 1 || count > 20) {
    throw new Error("This Feat has invalid healing dice.");
  }

  let rolled = 0;
  for (let index = 0; index < count; index += 1) {
    rolled += randomInt(1, sides + 1);
  }

  const amount = rolled + feat.healthDelta;

  return {
    amount,
    summary:
      `Healing: ${feat.healthDice} -> ${rolled}` +
      `${
        feat.healthDelta !== 0
          ? ` ${feat.healthDelta > 0 ? "+" : ""}${feat.healthDelta}`
          : ""
      } = ${amount} Health`,
  };
}

async function announceRescue(
  character: CharacterRow,
  feat: DeathRescueFeat,
  summary: string,
  succeeded: boolean,
  healthAmount: number,
) {
  if (!character.current_room_id) return;
  const admin = adminClient();
  const effect = succeeded
    ? `Health +${healthAmount} · Death prevented`
    : "No effect applied · Death follows";

  const result = await admin.from("room_messages").insert({
    room_id: character.current_room_id,
    character_id: character.id,
    message:
      `◆ used "${feat.name}" at Death's Threshold · ` +
      `${feat.description.trim() || "No description"} · ${summary} · ${effect}`,
    message_type: "action",
    client_nonce: crypto.randomUUID(),
  });

  if (result.error) throw new Error(`Unable to announce rescue Feat: ${result.error.message}`);
}

export async function useDeathRescueFeat(eventId: string, characterGiftId: string) {
  const admin = adminClient();
  let claimed = false;

  try {
    const character = await ownedCharacter();
    if (character.life_state !== "death_save_pending" || character.current_health !== 0) {
      return { ok: false, rescued: false, message: "Your Character is not at Death's Threshold." };
    }

    const event = await currentPendingEvent(character.id);
    if (!event || event.id !== eventId || event.rescue_attempted_at) {
      return {
        ok: false,
        rescued: false,
        message: "The single rescue Feat opportunity has already been used or is no longer available.",
      };
    }

    const feat = (await eligibleRescueFeats(character.id))
      .find((candidate) => candidate.characterGiftId === characterGiftId);

    if (!feat) {
      return { ok: false, rescued: false, message: "That Feat cannot be used to prevent Death." };
    }

    const now = new Date().toISOString();
    const claim = await admin
      .from("character_death_events")
      .update({
        rescue_attempted_at: now,
        rescue_character_gift_id: characterGiftId,
      })
      .eq("id", eventId)
      .eq("character_id", character.id)
      .eq("status", "pending")
      .is("rescue_attempted_at", null)
      .select("id")
      .maybeSingle();

    if (claim.error || !claim.data) {
      return {
        ok: false,
        rescued: false,
        message: claim.error?.message ?? "The rescue Feat opportunity has already been claimed.",
      };
    }
    claimed = true;

    const roll = await rollRescueSuccess(character, feat);

    if (!roll.success) {
      await announceRescue(character, feat, roll.summary, false, 0);
      const deadUntil = await finaliseDeath(character, eventId);
      return {
        ok: true,
        rescued: false,
        message: `${feat.name} failed. The Character is dead.`,
        deadUntil,
      };
    }

    const healing = rollRescueHealing(feat);

    if (healing.amount <= 0) {
      throw new Error(
        "This rescue Feat did not produce a positive healing result.",
      );
    }

    await applyGiftCurrentHealthDelta({
      characterId: character.id,
      healthDelta: healing.amount,
    });
    await announceRescue(
      character,
      feat,
      `${roll.summary} · ${healing.summary}`,
      true,
      healing.amount,
    );

    await admin
      .from("character_death_events")
      .update({ status: "rescued", resolved_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("character_id", character.id);

    revalidatePath("/game");
    revalidatePath("/character");
    revalidatePath("/characters");

    return { ok: true, rescued: true, message: `${feat.name} prevented Death.` };
  } catch (error) {
    if (claimed) {
      await admin
        .from("character_death_events")
        .update({
          rescue_attempted_at: null,
          rescue_character_gift_id: null,
        })
        .eq("id", eventId)
        .eq("status", "pending");
    }

    return {
      ok: false,
      rescued: false,
      message: error instanceof Error ? error.message : "Unable to use rescue Feat.",
    };
  }
}
