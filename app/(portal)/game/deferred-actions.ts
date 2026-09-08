"use server";

import { redirect } from "next/navigation";

import { getCharacterAttributeBreakdown } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";
import type { CharacterAttributeKey, CharacterAttributes } from "@/types/game";

type CharacterRow = {
  id: string;
  status: string;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
};

export type DeferredAttributeBreakdownEntry = {
  base: number | null;
  gifts: number;
  adjustedBase: number | null;
  ancestry: number;
  order: number;
  effective: number | null;
};

export type DeferredAttributeBreakdown = Record<
  CharacterAttributeKey,
  DeferredAttributeBreakdownEntry
>;

export type DeferredChatItem = {
  recordKind: "standard" | "unique";
  recordId: string;
  itemId: string;
  name: string;
  description: string;
  quantity: number;
  targetMode: "self" | "other" | "either";
  maxCharges: number | null;
  chargesRemaining: number | null;
  cooldownReadyAt: string | null;
  successDie?: number | null;
  successThreshold?: number | null;
  resolutionMode?: "automatic" | "fixed" | "opposed";
  counterOptions?: string[];
  successAttribute?: CharacterAttributeKey | null;
  damageDice?: string | null;
  damageType?: string | null;
  categorySlug?: string | null;
  isEquipped?: boolean;
  equippedSlot?: string | null;
  effects: {
    trigger_type: string;
    effect_mode: string;
    duration_minutes: number | null;
    muscles_modifier: number;
    reflexes_modifier: number;
    vigour_modifier: number;
    shrewd_modifier: number;
    brains_modifier: number;
    presence_modifier: number;
    health_delta: number;
    max_health_modifier: number;
    warping_affinity_modifier: number;
    warps_per_day_modifier: number;
  }[];
};

export type DeferredChatGift = {
  characterGiftId: string;
  giftId: string;
  name: string;
  description: string;
  effectMode: "none" | "passive" | "temporary";
  targetMode: "self" | "other" | "either";
  damageDice: string | null;
  damageType: string | null;
  successDie: number | null;
  successThreshold: number | null;
  successAttribute: CharacterAttributeKey | null;
  durationMinutes: number | null;
  cooldownMinutes: number;
  healthDelta: number;
  maxHealthModifier: number;
  musclesModifier: number;
  reflexesModifier: number;
  vigourModifier: number;
  shrewdModifier: number;
  brainsModifier: number;
  presenceModifier: number;
  warpingAffinityModifier: number;
  warpsPerDayModifier: number;
  activeUntil: string | null;
  cooldownUntil: string | null;
};

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: character, error } = await supabase
    .from("characters")
    .select("id,status,muscles,reflexes,vigor,brains,shrewd,presence_score")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load character: ${error.message}`);
  }
  if (!character) {
    redirect("/character/create");
  }
  if (character.status !== "approved") {
    throw new Error("Your character must be approved before using room utilities.");
  }

  return { supabase, character: character as CharacterRow };
}

async function attributesFor(character: CharacterRow) {
  const attributeBreakdown = (await getCharacterAttributeBreakdown(
    character.id,
    {
      muscles: character.muscles,
      reflexes: character.reflexes,
      vigor: character.vigor,
      brains: character.brains,
      shrewd: character.shrewd,
      presence_score: character.presence_score,
    },
  )) as DeferredAttributeBreakdown;

  const attributes: CharacterAttributes = {
    muscles: attributeBreakdown.muscles.effective,
    reflexes: attributeBreakdown.reflexes.effective,
    vigor: attributeBreakdown.vigor.effective,
    brains: attributeBreakdown.brains.effective,
    shrewd: attributeBreakdown.shrewd.effective,
    presence_score: attributeBreakdown.presence_score.effective,
  };

  return { attributes, attributeBreakdown };
}

async function itemsFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
): Promise<DeferredChatItem[]> {
  const { data: rawInventoryRows, error: inventoryError } =
    await supabase.rpc("get_public_character_inventory", {
      p_character_id: characterId,
    });

  if (inventoryError) {
    throw new Error(`Unable to load usable Items for chat: ${inventoryError.message}`);
  }

  const rows = (rawInventoryRows ?? []) as {
    record_kind: "standard" | "unique";
    record_id: string;
    item_id: string;
    name: string;
    quantity: number;
    is_usable: boolean;
    is_equipped: boolean;
    equipped_slot: string | null;
  }[];

  const candidates = rows.filter(
    (row) =>
      row.is_usable ||
      (row.is_equipped &&
        ["main_hand", "off_hand"].includes(String(row.equipped_slot ?? ""))),
  );

  const itemIds = [...new Set(candidates.map((row) => row.item_id))];

  const [mastersResult, chargesResult, cooldownsResult] = await Promise.all([
    itemIds.length
      ? supabase
          .from("items")
          .select(`
            id,
            name,
            description,
            target_mode,
            max_charges,
            success_die,
            success_threshold,
            resolution_mode,
            counter_options,
            success_attribute,
            damage_dice,
            damage_type,
            cooldown_minutes,
            teaches_recipe_id,
            category:item_categories(slug),
            effects:item_effects(
              trigger_type,
              effect_mode,
              duration_minutes,
              muscles_modifier,
              reflexes_modifier,
              vigour_modifier,
              shrewd_modifier,
              brains_modifier,
              presence_modifier,
              health_delta,
              max_health_modifier,
              warping_affinity_modifier,
              warps_per_day_modifier
            )
          `)
          .in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("character_item_instances")
      .select("id,charges_remaining")
      .eq("owner_character_id", characterId),
    supabase
      .from("character_item_use_cooldowns")
      .select("source_key,ready_at")
      .eq("character_id", characterId),
  ]);

  const error =
    mastersResult.error ?? chargesResult.error ?? cooldownsResult.error;
  if (error) {
    throw new Error(`Unable to prepare usable Items for chat: ${error.message}`);
  }

  const masters = new Map((mastersResult.data ?? []).map((x) => [x.id, x]));
  const charges = new Map(
    (chargesResult.data ?? []).map((x) => [x.id, x.charges_remaining]),
  );
  const cooldowns = new Map(
    (cooldownsResult.data ?? []).map((x) => [x.source_key, x.ready_at]),
  );

  const preparedItems: Array<DeferredChatItem | null> =
    candidates.map((row) => {
      const master = masters.get(row.item_id);
      if (!master || master.teaches_recipe_id) {
        return null;
      }

      const categoryRelation = master.category ?? null;
      const category = Array.isArray(categoryRelation)
        ? categoryRelation[0] ?? null
        : categoryRelation;

      const equippedWeapon =
        category?.slug === "weapon" &&
        row.is_equipped &&
        ["main_hand", "off_hand"].includes(String(row.equipped_slot ?? ""));

      if (!row.is_usable && !equippedWeapon) {
        return null;
      }
      if (category?.slug === "weapon" && !equippedWeapon) {
        return null;
      }

      const sourceKey =
        row.record_kind === "unique"
          ? `unique:${row.record_id}`
          : `standard:${row.item_id}`;

      return {
        recordKind: row.record_kind,
        recordId: row.record_id,
        itemId: row.item_id,
        name: row.name,
        description: master.description ?? "",
        quantity: row.quantity,
        targetMode: (master.target_mode ?? "self") as
          | "self"
          | "other"
          | "either",
        maxCharges: master.max_charges,
        chargesRemaining:
          row.record_kind === "unique"
            ? charges.get(row.record_id) ?? null
            : null,
        cooldownReadyAt: cooldowns.get(sourceKey) ?? null,
        successDie: master.success_die ?? null,
        successThreshold: master.success_threshold ?? null,
        resolutionMode: (master.resolution_mode ?? "automatic") as
          | "automatic"
          | "fixed"
          | "opposed",
        counterOptions: Array.isArray(master.counter_options)
          ? master.counter_options
          : [],
        successAttribute: (master.success_attribute ?? null) as
          | CharacterAttributeKey
          | null,
        damageDice: master.damage_dice ?? null,
        damageType: master.damage_type ?? null,
        categorySlug: category?.slug ?? null,
        isEquipped: row.is_equipped ?? false,
        equippedSlot: row.equipped_slot ?? null,
        effects: Array.isArray(master.effects)
          ? master.effects
          : master.effects
            ? [master.effects]
            : [],
      } satisfies DeferredChatItem;
    });

  return preparedItems.filter(
    (item): item is DeferredChatItem =>
      item !== null,
  );
}

async function giftsFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
): Promise<DeferredChatGift[]> {
  const { data: rows, error } = await supabase
    .from("character_gifts")
    .select(`
      id,
      gift:gifts(
        id,
        name,
        description,
        is_active,
        effect_mode,
        target_mode,
        damage_dice,
        damage_type,
        success_die,
        success_threshold,
        success_attribute,
        duration_minutes,
        cooldown_minutes,
        health_delta,
        max_health_modifier,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        shrewd_modifier,
        brains_modifier,
        presence_modifier,
        warping_affinity_modifier,
        warps_per_day_modifier
      ),
      activations:gift_activations(
        activated_at,
        expires_at,
        ended_at,
        health_reverted_at
      )
    `)
    .eq("character_id", characterId);

  if (error) {
    throw new Error(`Unable to load character Feats: ${error.message}`);
  }

  const now = Date.now();

  return (rows ?? [])
    .map((ownership) => {
      const relation = ownership.gift ?? null;
      const gift = Array.isArray(relation) ? relation[0] ?? null : relation;
      if (!gift || !gift.is_active) {
        return null;
      }

      const activations = ownership.activations ?? [];
      const activeActivation =
        activations.find(
          (activation) =>
            activation.ended_at === null &&
            Date.parse(activation.activated_at) <= now &&
            Date.parse(activation.expires_at) > now,
        ) ?? null;

      const latestActivation =
        [...activations].sort(
          (a, b) =>
            Date.parse(b.activated_at) - Date.parse(a.activated_at),
        )[0] ?? null;

      const cooldownUntil =
        gift.effect_mode === "temporary" && latestActivation
          ? new Date(
              Date.parse(latestActivation.activated_at) +
                (gift.cooldown_minutes ?? 0) * 60 * 1000,
            ).toISOString()
          : null;

      return {
        characterGiftId: ownership.id,
        giftId: gift.id,
        name: gift.name,
        description: gift.description ?? "",
        effectMode: gift.effect_mode as "none" | "passive" | "temporary",
        targetMode: (gift.target_mode ?? "self") as "self" | "other" | "either",
        damageDice: gift.damage_dice ?? null,
        damageType: gift.damage_type ?? null,
        successDie: gift.success_die ?? null,
        successThreshold: gift.success_threshold ?? null,
        successAttribute: (gift.success_attribute ?? null) as
          | CharacterAttributeKey
          | null,
        durationMinutes: gift.duration_minutes,
        cooldownMinutes: gift.cooldown_minutes ?? 0,
        healthDelta: gift.health_delta ?? 0,
        maxHealthModifier: gift.max_health_modifier ?? 0,
        musclesModifier: gift.muscles_modifier ?? 0,
        reflexesModifier: gift.reflexes_modifier ?? 0,
        vigourModifier: gift.vigour_modifier ?? 0,
        shrewdModifier: gift.shrewd_modifier ?? 0,
        brainsModifier: gift.brains_modifier ?? 0,
        presenceModifier: gift.presence_modifier ?? 0,
        warpingAffinityModifier: gift.warping_affinity_modifier ?? 0,
        warpsPerDayModifier: gift.warps_per_day_modifier ?? 0,
        activeUntil: activeActivation?.expires_at ?? null,
        cooldownUntil:
          cooldownUntil && Date.parse(cooldownUntil) > now
            ? cooldownUntil
            : null,
      } satisfies DeferredChatGift;
    })
    .filter((gift): gift is DeferredChatGift => gift !== null);
}

export async function loadMyEffectiveAttributes() {
  const { character } = await context();
  return attributesFor(character);
}

export async function loadRoomItems() {
  const { supabase, character } = await context();
  return itemsFor(supabase, character.id);
}

export async function loadRoomFeats() {
  const { supabase, character } = await context();
  return giftsFor(supabase, character.id);
}

export async function loadRoomCombatData() {
  const { supabase, character } = await context();
  const [attributeData, items] = await Promise.all([
    attributesFor(character),
    itemsFor(supabase, character.id),
  ]);
  return { ...attributeData, items };
}
