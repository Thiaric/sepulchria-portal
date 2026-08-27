"use server";

import { randomInt } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";

export type UseInventoryItemResult = {
  ok: boolean;
  message: string;
};

type ItemSuccessAttribute =
  | "muscles"
  | "reflexes"
  | "vigor"
  | "brains"
  | "shrewd"
  | "presence_score";

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

type ItemMechanics = {
  id: string;
  name: string;
  is_active: boolean;
  is_usable: boolean;
  use_behaviour: "reusable" | "consumable" | "limited_charges" | null;
  target_mode: "self" | "other" | "either" | null;
  success_die: number | null;
  success_threshold: number | null;
  success_attribute: ItemSuccessAttribute | null;
  resolution_mode: "automatic" | "fixed" | "opposed" | null;
  counter_options: string[] | null;
  damage_dice: string | null;
  damage_type: string | null;
  cooldown_minutes: number | null;
  teaches_recipe_id: string | null;
  category: { slug: string } | { slug: string }[] | null;
};

type AttemptRecord = {
  recordKind: "standard" | "unique";
  recordId: string;
  itemId: string;
  quantity: number | null;
  chargesRemaining: number | null;
  item: ItemMechanics;
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function createPrivilegedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const ATTRIBUTE_LABELS: Record<ItemSuccessAttribute, string> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

async function getOwnedCharacter() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in.");
  }

  const { data, error } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, muscles, reflexes, vigor, brains, shrewd, presence_score",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Your character could not be found.");
  }

  return {
    supabase,
    character: data as OwnedCharacter,
  };
}

async function loadAttemptRecord(
  recordKind: string,
  recordId: string,
  characterId: string,
): Promise<AttemptRecord> {
  const admin = createPrivilegedClient();

  const itemSelect = `
    id,
    name,
    is_active,
    is_usable,
    use_behaviour,
    target_mode,
    success_die,
    success_threshold,
    success_attribute,
    resolution_mode,
    counter_options,
    damage_dice,
    damage_type,
    cooldown_minutes,
    teaches_recipe_id,
    category:item_categories(slug)
  `;

  if (recordKind === "standard") {
    const { data, error } = await admin
      .from("character_items")
      .select(`
        id,
        item_id,
        quantity,
        item:items(${itemSelect})
      `)
      .eq("id", recordId)
      .eq("character_id", characterId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("That Item is not in your Inventory.");
    }

    const item = one(data.item) as ItemMechanics | null;

    if (!item) {
      throw new Error("The Item definition could not be loaded.");
    }

    return {
      recordKind: "standard",
      recordId: data.id,
      itemId: data.item_id,
      quantity: Number(data.quantity ?? 0),
      chargesRemaining: null,
      item,
    };
  }

  if (recordKind === "unique") {
    const { data, error } = await admin
      .from("character_item_instances")
      .select(`
        id,
        item_id,
        charges_remaining,
        item:items(${itemSelect})
      `)
      .eq("id", recordId)
      .eq("owner_character_id", characterId)
      .eq("vault_status", "owned")
      .maybeSingle();

    if (error || !data) {
      throw new Error("That Item is not in your Inventory.");
    }

    const item = one(data.item) as ItemMechanics | null;

    if (!item) {
      throw new Error("The Item definition could not be loaded.");
    }

    return {
      recordKind: "unique",
      recordId: data.id,
      itemId: data.item_id,
      quantity: null,
      chargesRemaining:
        data.charges_remaining === null
          ? null
          : Number(data.charges_remaining),
      item,
    };
  }

  throw new Error("Invalid Item.");
}

async function resolveTarget({
  character,
  targetMode,
  requestedTargetId,
}: {
  character: OwnedCharacter;
  targetMode: "self" | "other" | "either";
  requestedTargetId: string | null;
}) {
  if (
    targetMode === "self" ||
    (targetMode === "either" && !requestedTargetId)
  ) {
    return {
      id: character.id,
      displayName: character.display_name,
    };
  }

  if (!requestedTargetId) {
    throw new Error("Choose a character to target.");
  }

  if (requestedTargetId === character.id) {
    if (targetMode === "other") {
      throw new Error("This Item must target another character.");
    }

    return {
      id: character.id,
      displayName: character.display_name,
    };
  }

  if (!character.current_room_id) {
    throw new Error("You must be in a location to target another character.");
  }

  const admin = createPrivilegedClient();
  const { data, error } = await admin
    .from("characters")
    .select("id, display_name, current_room_id, status")
    .eq("id", requestedTargetId)
    .eq("status", "approved")
    .eq("is_system", false)
    .maybeSingle();

  if (
    error ||
    !data ||
    data.current_room_id !== character.current_room_id
  ) {
    throw new Error(
      "That character is not available in your current location.",
    );
  }

  return {
    id: data.id,
    displayName: data.display_name,
  };
}

async function rollItemSuccess(
  character: OwnedCharacter,
  item: ItemMechanics,
) {
  if (!item.success_die) {
    return {
      success: true,
      modifier: 0,
      summary: "Success Roll: Automatic - SUCCESS",
    };
  }

  if (
    ![4, 6, 8, 10, 12, 20, 100].includes(item.success_die) ||
    !item.success_threshold ||
    item.success_threshold < 1
  ) {
    throw new Error("This Item has an invalid Success Roll.");
  }

  const rolled = randomInt(1, item.success_die + 1);
  let modifier = 0;
  let modifierText = "";

  if (item.success_attribute) {
    const effective = await getEffectiveCharacterAttributes(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score: character.presence_score,
      },
    );

    modifier = Number(effective[item.success_attribute] ?? 0);
    modifierText =
      ` + ${ATTRIBUTE_LABELS[item.success_attribute]} ` +
      `(${modifier >= 0 ? "+" : ""}${modifier})`;
  }

  const total = rolled + modifier;
  const success = total >= item.success_threshold;

  return {
    success,
    modifier,
    summary:
      `Success Roll: d${item.success_die} -> ${rolled}${modifierText}` +
      ` = ${total} vs ${item.success_threshold} - ${
        success ? "SUCCESS" : "FAILED"
      }`,
  };
}

function rollDamage(damageDice: string | null) {
  if (!damageDice) {
    return 0;
  }

  const match = /^([1-9][0-9]*)d(4|6|8|10|12|20|100)$/.exec(
    damageDice,
  );

  if (!match) {
    throw new Error("This Item has invalid Damage Dice.");
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);

  if (count < 1 || count > 20) {
    throw new Error("This Item has invalid Damage Dice.");
  }

  let total = 0;

  for (let index = 0; index < count; index += 1) {
    total += randomInt(1, sides + 1);
  }

  return total;
}

async function consumeFailedAttempt(
  record: AttemptRecord,
  characterId: string,
) {
  const behaviour = record.item.use_behaviour;

  if (!behaviour || behaviour === "reusable") {
    return "No consumable charge was spent.";
  }

  const admin = createPrivilegedClient();

  if (behaviour === "consumable") {
    if (record.recordKind === "standard") {
      const quantity = Number(record.quantity ?? 0);

      if (quantity <= 0) {
        throw new Error("This Item has no uses remaining.");
      }

      if (quantity === 1) {
        const { error } = await admin
          .from("character_items")
          .delete()
          .eq("id", record.recordId)
          .eq("character_id", characterId);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await admin
          .from("character_items")
          .update({ quantity: quantity - 1 })
          .eq("id", record.recordId)
          .eq("character_id", characterId);

        if (error) {
          throw new Error(error.message);
        }
      }

      return "The consumable use was spent.";
    }

    const { error } = await admin
      .from("character_item_instances")
      .delete()
      .eq("id", record.recordId)
      .eq("owner_character_id", characterId)
      .eq("vault_status", "owned");

    if (error) {
      throw new Error(error.message);
    }

    return "The consumable use was spent.";
  }

  if (behaviour === "limited_charges") {
    if (record.recordKind !== "unique") {
      throw new Error(
        "Limited-charge Items require an individual Item instance.",
      );
    }

    const remaining = Number(record.chargesRemaining ?? 0);

    if (remaining <= 0) {
      throw new Error("This Item has no charges remaining.");
    }

    const { error } = await admin
      .from("character_item_instances")
      .update({ charges_remaining: remaining - 1 })
      .eq("id", record.recordId)
      .eq("owner_character_id", characterId)
      .eq("vault_status", "owned");

    if (error) {
      throw new Error(error.message);
    }

    return `One charge was spent (${remaining - 1} remaining).`;
  }

  return "No consumable charge was spent.";
}

async function resolveDamageOnlySuccessfulUse({
  record,
  characterId,
}: {
  record: AttemptRecord;
  characterId: string;
}) {
  const admin = createPrivilegedClient();
  const sourceKey =
    record.recordKind === "unique"
      ? `unique:${record.recordId}`
      : `standard:${record.itemId}`;

  const now = Date.now();
  const cooldownMinutes = Math.max(
    0,
    Number(record.item.cooldown_minutes ?? 0),
  );

  if (cooldownMinutes > 0) {
    const { data: cooldown, error: cooldownError } = await admin
      .from("character_item_use_cooldowns")
      .select("ready_at")
      .eq("character_id", characterId)
      .eq("source_key", sourceKey)
      .maybeSingle();

    if (cooldownError) throw new Error(cooldownError.message);

    if (cooldown?.ready_at && Date.parse(cooldown.ready_at) > now) {
      throw new Error("This Item is still on cooldown.");
    }
  }

  const behaviour = record.item.use_behaviour;

  if (behaviour === "consumable") {
    if (record.recordKind === "standard") {
      const quantity = Number(record.quantity ?? 0);
      if (quantity <= 0) throw new Error("This Item has no uses remaining.");

      if (quantity === 1) {
        const { error } = await admin
          .from("character_items")
          .delete()
          .eq("id", record.recordId)
          .eq("character_id", characterId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await admin
          .from("character_items")
          .update({ quantity: quantity - 1 })
          .eq("id", record.recordId)
          .eq("character_id", characterId);
        if (error) throw new Error(error.message);
      }
    } else {
      const { error } = await admin
        .from("character_item_instances")
        .delete()
        .eq("id", record.recordId)
        .eq("owner_character_id", characterId)
        .eq("vault_status", "owned");
      if (error) throw new Error(error.message);
    }
  } else if (behaviour === "limited_charges") {
    if (record.recordKind !== "unique") {
      throw new Error("Limited-charge Items require an individual Item instance.");
    }

    const remaining = Number(record.chargesRemaining ?? 0);
    if (remaining <= 0) throw new Error("This Item has no charges remaining.");

    const { error } = await admin
      .from("character_item_instances")
      .update({ charges_remaining: remaining - 1 })
      .eq("id", record.recordId)
      .eq("owner_character_id", characterId)
      .eq("vault_status", "owned");
    if (error) throw new Error(error.message);
  }

  if (cooldownMinutes > 0) {
    const { error } = await admin
      .from("character_item_use_cooldowns")
      .upsert(
        {
          character_id: characterId,
          source_key: sourceKey,
          ready_at: new Date(
            now + cooldownMinutes * 60_000,
          ).toISOString(),
        },
        { onConflict: "character_id,source_key" },
      );

    if (error) throw new Error(error.message);
  }

  return {
    ok: true,
    blocked: false,
    item_name: record.item.name,
    target_name: undefined,
    health_delta: 0,
    temporary_effects: 0,
  };
}

async function applyItemDamage(
  targetCharacterId: string,
  amount: number,
) {
  if (amount <= 0) {
    return;
  }

  const admin = createPrivilegedClient();
const supabase = await createClient();

const [
  characterResult,
  maxHealthResult,
] = await Promise.all([
  admin
    .from("characters")
    .select("current_health")
    .eq("id", targetCharacterId)
    .maybeSingle(),
  supabase.rpc("get_character_current_max_health", {
    p_character_id: targetCharacterId,
  }),
]);

  const error =
    characterResult.error ??
    maxHealthResult.error;

  if (error || !characterResult.data) {
    throw new Error(
      `Unable to apply Item damage: ${
        error?.message ?? "target not found"
      }`,
    );
  }

  const maxHealth = Math.max(
    1,
    Number(maxHealthResult.data ?? 1),
  );

  const currentHealth = Math.max(
    0,
    Math.min(
      Number(
        characterResult.data.current_health ??
          maxHealth,
      ),
      maxHealth,
    ),
  );

  const nextHealth = Math.max(
    0,
    currentHealth - amount,
  );

  const { error: updateError } = await admin
    .from("characters")
    .update({
      current_health: nextHealth,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetCharacterId);

  if (updateError) {
    throw new Error(
      `Unable to apply Item damage: ${updateError.message}`,
    );
  }
}

export async function useInventoryItem(
  formData: FormData,
): Promise<UseInventoryItemResult> {
  try {
    const recordKind = text(formData, "recordKind");
    const recordId = text(formData, "recordId");
    const targetCharacterId =
      text(formData, "targetCharacterId") || null;

    if (
      !["standard", "unique"].includes(recordKind) ||
      !recordId
    ) {
      return {
        ok: false,
        message: "Invalid Item.",
      };
    }

    const {
      supabase,
      character,
    } = await getOwnedCharacter();

      const record = await loadAttemptRecord(
      recordKind,
      recordId,
      character.id,
    );

    if (!record.item.is_active) {
      throw new Error("This Item is inactive.");
    }

    if (!record.item.is_usable) {
      throw new Error(
        "This Item cannot be used through the Use Item action.",
      );
    }

    if (record.item.teaches_recipe_id) {
      const {
        data: learnResult,
        error: learnError,
      } = await supabase.rpc(
        "learn_recipe_from_item",
        {
          p_character_id:
            character.id,
          p_record_kind:
            record.recordKind,
          p_record_id:
            record.recordId,
        },
      );

      if (learnError) {
        throw new Error(
          learnError.message,
        );
      }

      const result =
        learnResult as
          | {
              success?: boolean;
              message?: string;
            }
          | null;

      return {
        ok:
          result?.success ===
          true,
        message:
          result?.message ??
          "The recipe could not be learned.",
      };
    }

    const categorySlug =
      one(record.item.category)?.slug ?? null;

    if (categorySlug === "weapon") {
      const { data: inventoryRows, error: inventoryError } =
        await supabase.rpc(
          "get_public_character_inventory",
          { p_character_id: character.id },
        );

      if (inventoryError) {
        return {
          ok: false,
          message:
            `Unable to verify equipped Weapon: ${inventoryError.message}`,
        };
      }

      const equipped = ((inventoryRows ?? []) as Array<{
        record_kind?: string;
        record_id?: string;
        is_equipped?: boolean;
        equipped_slot?: string | null;
      }>).find(
        (row) =>
          row.record_kind === recordKind &&
          row.record_id === recordId,
      );

      if (
        !equipped?.is_equipped ||
        !["main_hand", "off_hand"].includes(
          String(equipped.equipped_slot ?? ""),
        )
      ) {
        return {
          ok: false,
          message:
            "Weapons can only be used while equipped in Main Hand or Off Hand.",
        };
      }
    }

    const targetMode =
      record.item.target_mode ?? "self";

    const target = await resolveTarget({
      character,
      targetMode,
      requestedTargetId: targetCharacterId,
    });

    if (record.item.resolution_mode === "opposed") {
      return {
        ok: false,
        message:
          "Opposed Items must be used from Play so the target can choose a Counter.",
      };
    }

    const successRoll =
      await rollItemSuccess(
        character,
        record.item,
      );

    if (!successRoll.success) {
      const spent =
        await consumeFailedAttempt(
          record,
          character.id,
        );

      if (recordKind === "standard") {
        await supabase.rpc(
          "normalize_inventory_after_change",
          {
            p_other_character_id: null,
          },
        );
      }

      return {
        ok: true,
        message:
          `${record.item.name} failed. ` +
          `${successRoll.summary}. ` +
          `${spent} No effect applied; cooldown did not start.`,
      };
    }

    const rpcResult = await supabase.rpc(
      "use_own_inventory_record_targeted",
      {
        p_record_kind: recordKind,
        p_record_id: recordId,
        p_target_character_id:
          targetCharacterId,
      },
    );

    let data = rpcResult.data;

    if (rpcResult.error) {
      const damageOnlyFallback =
        Boolean(record.item.damage_dice) &&
        rpcResult.error.message.includes(
          "no configured Use effect",
        );

      if (!damageOnlyFallback) {
        return {
          ok: false,
          message: rpcResult.error.message,
        };
      }

      data = await resolveDamageOnlySuccessfulUse({
        record,
        characterId: character.id,
      });
    }

    let result = (data ?? {}) as {
      ok?: boolean;
      blocked?: boolean;
      block_reason?: string;
      item_name?: string;
      target_name?: string;
      health_delta?: number;
      temporary_effects?: number;
    };

    if (
      result.blocked &&
      Boolean(record.item.damage_dice) &&
      result.block_reason?.includes("no configured Use effect")
    ) {
      result = await resolveDamageOnlySuccessfulUse({
        record,
        characterId: character.id,
      });
    }

    if (result.blocked) {
      return {
        ok: false,
        message:
          result.block_reason ??
          "This Item cannot be used right now.",
      };
    }

    const baseDamage =
      rollDamage(record.item.damage_dice);

    const attributeDamage =
      categorySlug === "weapon" &&
      record.item.success_attribute
        ? successRoll.modifier
        : 0;

    const damage = Math.max(
      0,
      baseDamage + attributeDamage,
    );

    if (damage > 0) {
      await applyItemDamage(
        target.id,
        damage,
      );
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

    const details: string[] = [
      successRoll.summary,
    ];

    if (
      Number(result.health_delta ?? 0) !== 0
    ) {
      const amount =
        Number(result.health_delta);

      details.push(
        amount > 0
          ? `restored ${amount} Health`
          : `changed Health by ${amount}`,
      );
    }

    if (
      Number(
        result.temporary_effects ?? 0,
      ) > 0
    ) {
      details.push(
        "temporary effect activated",
      );
    }

    if (damage > 0) {
      const attributeText =
        categorySlug === "weapon" &&
        record.item.success_attribute
          ? ` + ${
              ATTRIBUTE_LABELS[
                record.item.success_attribute
              ]
            } (${successRoll.modifier >= 0 ? "+" : ""}${successRoll.modifier})`
          : "";

      details.push(
        `${record.item.damage_dice}${attributeText}` +
          `${
            record.item.damage_type
              ? ` ${record.item.damage_type}`
              : ""
          } -> ${damage} Damage`,
      );
    }

    const targetText =
      result.target_name
        ? ` on ${result.target_name}`
        : target.displayName
          ? ` on ${target.displayName}`
          : "";

    return {
      ok: true,
      message:
        `${result.item_name ?? record.item.name} used${targetText}: ` +
        `${details.join(" · ")}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to use Item.",
    };
  }
}
