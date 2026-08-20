"use server";

import { randomInt } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, CharacterAttributeKey } from "@/types/game";

type CounterKind =
  | "dodge"
  | "defend"
  | "resist_vigour"
  | "resist_shrewd"
  | "resist_brains"
  | "resist_presence";

const COUNTERS: Record<CounterKind, { label: string; attribute: CharacterAttributeKey }> = {
  dodge: { label: "Dodge", attribute: "reflexes" },
  defend: { label: "Defend", attribute: "vigor" },
  resist_vigour: { label: "Resist (Vigour)", attribute: "vigor" },
  resist_shrewd: { label: "Resist (Shrewd)", attribute: "shrewd" },
  resist_brains: { label: "Resist (Brains)", attribute: "brains" },
  resist_presence: { label: "Resist (Presence)", attribute: "presence_score" },
};

const ATTRIBUTE_LABELS: Record<CharacterAttributeKey, string> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

type OwnedCharacter = {
  id: string;
  display_name: string;
  current_room_id: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
};

function privilegedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase server credentials.");
  }

  return createAdminClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function roll(sides: number) {
  return randomInt(1, sides + 1);
}

function rollDamage(formula: string | null) {
  if (!formula) return 0;

  const match = /^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(formula);
  if (!match) throw new Error("Invalid Damage Dice.");

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  let result = 0;

  for (let i = 0; i < count; i += 1) {
    result += roll(sides);
  }

  return result;
}

async function ownedCharacter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required.");

  const { data, error } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, muscles, reflexes, vigor, brains, shrewd, presence_score",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) throw new Error("Character not found.");
  if (!data.current_room_id) throw new Error("Character not at a Location.");

  return {
    supabase,
    character: data as OwnedCharacter,
  };
}

async function effective(
  character: OwnedCharacter,
  attribute: CharacterAttributeKey,
) {
  const values = await getEffectiveCharacterAttributes(character.id, {
    muscles: character.muscles,
    reflexes: character.reflexes,
    vigor: character.vigor,
    brains: character.brains,
    shrewd: character.shrewd,
    presence_score: character.presence_score,
  });

  return Number(values[attribute] ?? 0);
}

async function roomTarget(roomId: string, targetId: string) {
  const admin = privilegedClient();
  const { data, error } = await admin
    .from("characters")
    .select("id, display_name, current_room_id, status")
    .eq("id", targetId)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data || data.current_room_id !== roomId) {
    throw new Error("That Character is not available at this Location.");
  }

  return data;
}

async function roomMessage(
  roomId: string,
  characterId: string,
  message: string,
) {
  const admin = privilegedClient();
  const { error } = await admin.from("room_messages").insert({
    room_id: roomId,
    character_id: characterId,
    message,
    message_type: "action",
    client_nonce: crypto.randomUUID(),
  });

  if (error) throw new Error(error.message);
}

function defaultCounter(attribute: CharacterAttributeKey): CounterKind {
  if (attribute === "muscles") return "resist_vigour";
  if (attribute === "reflexes") return "dodge";
  if (attribute === "brains") return "resist_brains";
  if (attribute === "shrewd") return "resist_shrewd";
  return "resist_presence";
}

async function createPending({
  character,
  targetId,
  actionKind,
  actionLabel,
  die,
  rolled,
  attribute,
  modifier,
  allowedCounters,
  itemId = null,
  recordKind = null,
  recordId = null,
  damageDice = null,
  damageType = null,
  damageFlat = 0,
  damageAttribute = null,
}: {
  character: OwnedCharacter;
  targetId: string;
  actionKind: "weapon" | "unarmed" | "attribute" | "item";
  actionLabel: string;
  die: number;
  rolled: number;
  attribute: CharacterAttributeKey;
  modifier: number;
  allowedCounters: CounterKind[];
  itemId?: string | null;
  recordKind?: string | null;
  recordId?: string | null;
  damageDice?: string | null;
  damageType?: string | null;
  damageFlat?: number;
  damageAttribute?: CharacterAttributeKey | null;
}) {
  if (!character.current_room_id) {
    throw new Error("Character not at a Location.");
  }

  const target = await roomTarget(character.current_room_id, targetId);
  const admin = privilegedClient();

  const { error } = await admin.from("opposed_actions").insert({
    room_id: character.current_room_id,
    attacker_character_id: character.id,
    target_character_id: target.id,
    action_kind: actionKind,
    action_label: actionLabel,
    source_item_id: itemId,
    source_record_kind: recordKind,
    source_record_id: recordId,
    attack_die: die,
    attack_roll: rolled,
    attack_attribute: attribute,
    attack_modifier: modifier,
    attack_total: rolled + modifier,
    allowed_counters: allowedCounters,
    damage_dice: damageDice,
    damage_type: damageType,
    damage_flat: damageFlat,
    damage_attribute: damageAttribute,
  });

  if (error) throw new Error(error.message);

  return target;
}

export async function startAttributeOpposedAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { character } = await ownedCharacter();
    const attribute = field(
      formData,
      "opposed_attribute",
    ) as CharacterAttributeKey;

    if (!(attribute in ATTRIBUTE_LABELS)) {
      return { ok: false, message: "Invalid Attribute." };
    }

    const targetId = field(formData, "opposed_target_character_id");
    const otherTarget = field(formData, "opposed_external_target");
    const modifier = await effective(character, attribute);
    const rolled = roll(20);
    const total = rolled + modifier;
    const label = `Use ${ATTRIBUTE_LABELS[attribute]}`;

    if (!targetId) {
      const targetText = otherTarget ? ` on ${otherTarget}` : "";

      await roomMessage(
        character.current_room_id!,
        character.id,
        `◆ ${label}${targetText} · d20 -> ${rolled} + ${ATTRIBUTE_LABELS[attribute]} (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Fate resolves the result`,
      );

      revalidatePath("/game");

      return {
        ok: true,
        message: `${label}: ${total}`,
        submittedAt: Date.now(),
      };
    }

    const counter = defaultCounter(attribute);
    const target = await createPending({
      character,
      targetId,
      actionKind: "attribute",
      actionLabel: label,
      die: 20,
      rolled,
      attribute,
      modifier,
      allowedCounters: [counter],
    });

    await roomMessage(
      character.current_room_id!,
      character.id,
      `◆ ${label} on ${target.display_name} · d20 -> ${rolled} + ${ATTRIBUTE_LABELS[attribute]} (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Awaiting ${COUNTERS[counter].label}`,
    );

    revalidatePath("/game");

    return {
      ok: true,
      message: `Action pending against ${target.display_name}.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to perform Action.",
    };
  }
}

export async function startUnarmedAttack(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { character } = await ownedCharacter();
    const targetId = field(formData, "opposed_target_character_id");
    const otherTarget = field(formData, "opposed_external_target");
    const modifier = await effective(character, "muscles");
    const rolled = roll(20);
    const total = rolled + modifier;

    if (!targetId) {
      const targetText = otherTarget ? ` on ${otherTarget}` : "";

      await roomMessage(
        character.current_room_id!,
        character.id,
        `◆ Unarmed Attack${targetText} · d20 -> ${rolled} + Muscles (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Potential Damage: 1 + Muscles · Fate resolves the result`,
      );

      revalidatePath("/game");

      return {
        ok: true,
        message: `Unarmed Attack: ${total}`,
        submittedAt: Date.now(),
      };
    }

    const target = await createPending({
      character,
      targetId,
      actionKind: "unarmed",
      actionLabel: "Unarmed Attack",
      die: 20,
      rolled,
      attribute: "muscles",
      modifier,
      allowedCounters: ["dodge", "defend"],
      damageFlat: 1,
      damageAttribute: "muscles",
    });

    await roomMessage(
      character.current_room_id!,
      character.id,
      `◆ attacks ${target.display_name} Unarmed · d20 -> ${rolled} + Muscles (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Awaiting Dodge or Defend`,
    );

    revalidatePath("/game");

    return {
      ok: true,
      message: `Unarmed Attack pending against ${target.display_name}.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to attack.",
    };
  }
}

export async function startWeaponOpposedAttack(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, character } = await ownedCharacter();
    const recordKind = field(formData, "item_record_kind");
    const recordId = field(formData, "item_record_id");
    const targetId = field(formData, "opposed_target_character_id");
    const otherTarget = field(formData, "opposed_external_target");

    if (!recordId || !["standard", "unique"].includes(recordKind)) {
      return { ok: false, message: "Invalid Weapon." };
    }

    const { data: inventoryRows, error: inventoryError } = await supabase.rpc(
      "get_public_character_inventory",
      { p_character_id: character.id },
    );

    if (inventoryError) throw new Error(inventoryError.message);

    const inventory = (inventoryRows ?? []) as Array<{
      record_kind: string;
      record_id: string;
      item_id: string;
      is_equipped: boolean;
      equipped_slot: string | null;
    }>;

    const row = inventory.find(
      (entry) =>
        entry.record_kind === recordKind &&
        entry.record_id === recordId,
    );

    if (
      !row ||
      !row.is_equipped ||
      !["main_hand", "off_hand"].includes(
        String(row.equipped_slot ?? ""),
      )
    ) {
      return {
        ok: false,
        message:
          "Only an equipped Main Hand / Off Hand Weapon can attack.",
      };
    }

    const admin = privilegedClient();
    const { data: item, error: itemError } = await admin
      .from("items")
      .select(
        "id, name, success_die, success_attribute, damage_dice, damage_type, category:item_categories(slug)",
      )
      .eq("id", row.item_id)
      .maybeSingle();

    const category = Array.isArray(item?.category)
      ? item?.category[0] ?? null
      : item?.category ?? null;

    if (itemError || !item || category?.slug !== "weapon") {
      return {
        ok: false,
        message: "Unable to load equipped Weapon.",
      };
    }

    const die = Number(item.success_die ?? 20);
    const attribute = (
      item.success_attribute ?? "muscles"
    ) as CharacterAttributeKey;
    const modifier = await effective(character, attribute);
    const rolled = roll(die);
    const total = rolled + modifier;

    if (!targetId) {
      const targetText = otherTarget ? ` on ${otherTarget}` : "";

      await roomMessage(
        character.current_room_id!,
        character.id,
        `◆ attacks${targetText} with "${item.name}" · d${die} -> ${rolled} + ${ATTRIBUTE_LABELS[attribute]} (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Fate resolves the defence/DC`,
      );

      revalidatePath("/game");

      return {
        ok: true,
        message: `${item.name}: ${total}`,
        submittedAt: Date.now(),
      };
    }

    const target = await createPending({
      character,
      targetId,
      actionKind: "weapon",
      actionLabel: item.name,
      die,
      rolled,
      attribute,
      modifier,
      allowedCounters: ["dodge", "defend"],
      itemId: item.id,
      recordKind,
      recordId,
      damageDice: item.damage_dice,
      damageType: item.damage_type,
      damageAttribute: attribute,
    });

    await roomMessage(
      character.current_room_id!,
      character.id,
      `◆ attacks ${target.display_name} with "${item.name}" · d${die} -> ${rolled} + ${ATTRIBUTE_LABELS[attribute]} (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Awaiting Dodge or Defend`,
    );

    revalidatePath("/game");

    return {
      ok: true,
      message: `Attack pending against ${target.display_name}.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to attack.",
    };
  }
}

async function damageCharacter(targetId: string, amount: number) {
  if (amount <= 0) return;

  const admin = privilegedClient();
  const authenticated = await createClient();

  const [healthResult, maxResult] = await Promise.all([
    admin
      .from("characters")
      .select("current_health")
      .eq("id", targetId)
      .maybeSingle(),
    authenticated.rpc("get_character_current_max_health", {
      p_character_id: targetId,
    }),
  ]);

  const error = healthResult.error ?? maxResult.error;

  if (error || !healthResult.data) {
    throw new Error(
      error?.message ?? "Unable to read target Health.",
    );
  }

  const maxHealth = Math.max(1, Number(maxResult.data ?? 1));
  const currentHealth = Math.max(
    0,
    Math.min(
      Number(healthResult.data.current_health ?? maxHealth),
      maxHealth,
    ),
  );

  const { error: updateError } = await admin
    .from("characters")
    .update({
      current_health: Math.max(0, currentHealth - amount),
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (updateError) throw new Error(updateError.message);
}

export async function counterOpposedAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { character } = await ownedCharacter();
    const actionId = field(formData, "opposed_action_id");
    const counterKind = field(formData, "counter_kind") as CounterKind;

    if (!actionId || !COUNTERS[counterKind]) {
      return { ok: false, message: "Invalid Counter." };
    }

    const admin = privilegedClient();
    const { data: pending, error } = await admin
      .from("opposed_actions")
      .select("*")
      .eq("id", actionId)
      .eq("target_character_id", character.id)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !pending) {
      return {
        ok: false,
        message: "That Action is no longer pending.",
      };
    }

    if (Date.parse(pending.expires_at) <= Date.now()) {
      await admin
        .from("opposed_actions")
        .update({
          status: "expired",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", pending.id)
        .eq("status", "pending");

      return {
        ok: false,
        message: "That Action has expired.",
      };
    }

    if (!(pending.allowed_counters ?? []).includes(counterKind)) {
      return {
        ok: false,
        message: "That Counter is not allowed.",
      };
    }

    const counter = COUNTERS[counterKind];
    const modifier = await effective(character, counter.attribute);
    const rolled = roll(20);
    const total = rolled + modifier;
    const attackTotal = Number(pending.attack_total);
    const countered = total >= attackTotal;

    let damage = 0;

    if (
      !countered &&
      ["weapon", "unarmed"].includes(pending.action_kind)
    ) {
      const attackModifier = pending.damage_attribute
        ? Number(pending.attack_modifier ?? 0)
        : 0;

      damage = Math.max(
        0,
        Number(pending.damage_flat ?? 0) +
          rollDamage(pending.damage_dice) +
          attackModifier,
      );

      await damageCharacter(character.id, damage);
    }

    const status = countered ? "countered" : "succeeded";

    const { error: updateError } = await admin
      .from("opposed_actions")
      .update({
        status,
        counter_kind: counterKind,
        counter_roll: rolled,
        counter_attribute: counter.attribute,
        counter_modifier: modifier,
        counter_total: total,
        resolved_damage: damage,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", pending.id)
      .eq("status", "pending");

    if (updateError) throw new Error(updateError.message);

    const outcome = countered
      ? `${counter.label.toUpperCase()} SUCCESSFUL · ${total} >= ${attackTotal} · No effect`
      : `${pending.action_label} SUCCEEDS · ${attackTotal} > ${total}${
          damage > 0 ? ` · ${damage} Damage` : ""
        }`;

    await roomMessage(
      pending.room_id,
      character.id,
      `◆ ${character.display_name} uses ${counter.label} · d20 -> ${rolled} + ${ATTRIBUTE_LABELS[counter.attribute]} (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · ${outcome}`,
    );

    revalidatePath("/game");
    revalidatePath("/character");
    revalidatePath("/characters");

    return {
      ok: true,
      message: outcome,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to Counter Action.",
    };
  }
}
