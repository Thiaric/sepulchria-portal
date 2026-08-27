import "server-only";


import {
  CharacterInventoryBrowser,
  type InventoryBrowserRow,
  type InventoryItemEffect,
  type InventoryRequirement,
} from "@/components/characters/character-inventory-browser";
import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type InventoryRow = Omit<
  InventoryBrowserRow,
  | "requirements"
  | "equipment_bonuses"
  | "item_effects"
  | "item_active"
  | "teaches_recipe"
>;

type CharacterState = {
  display_name: string | null;
  first_name: string;
  surname: string;
  race_id: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  shrewd: number | null;
  brains: number | null;
  presence_score: number | null;
  current_health: number | null;
  current_room_id: string | null;
};

type MembershipState = {
  order_job_id: string;
  role: Relation<{
    id: string;
    name: string;
    level: Relation<{
      level: number;
      order: Relation<{
        id: string;
        name: string;
      }>;
    }>;
  }>;
};

type ItemRequirementRow = {
  id: string;
  is_active: boolean;
  equip_slot: string | null;
  use_behaviour: string | null;
  target_mode: string | null;
  max_charges: number | null;
  cooldown_minutes: number | null;
  teaches_recipe_id: string | null;
  reference_value: number | null;
  success_die: number | null;
  success_threshold: number | null;
  success_attribute:
    | "muscles"
    | "reflexes"
    | "vigor"
    | "brains"
    | "shrewd"
    | "presence_score"
    | null;
  damage_dice: string | null;
  damage_type: string | null;
  effects:
    | {
        trigger_type: string;
        effect_mode: string;
        duration_minutes: number | null;
        health_delta: number;
        muscles_modifier: number;
        reflexes_modifier: number;
        vigour_modifier: number;
        shrewd_modifier: number;
        brains_modifier: number;
        presence_modifier: number;
        max_health_modifier: number;
        warping_affinity_modifier: number;
        warps_per_day_modifier: number;
      }[]
    | null;
  min_muscles: number | null;
  min_reflexes: number | null;
  min_vigour: number | null;
  min_shrewd: number | null;
  min_brains: number | null;
  min_presence: number | null;
  min_order_level: number | null;
  races:
    | {
        race_id: string;
        race: Relation<{ name: string }>;
      }[]
    | null;
  orders:
    | {
        order_id: string;
        order: Relation<{ name: string }>;
      }[]
    | null;
  jobs:
    | {
        order_job_id: string;
        job: Relation<{
          name: string;
          level: Relation<{
            level: number;
            order: Relation<{ name: string }>;
          }>;
        }>;
      }[]
    | null;
};

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function requirementList(
  item: ItemRequirementRow | undefined,
  character: CharacterState | null,
  membership: MembershipState | null,
): InventoryRequirement[] {
  if (!item || !character) {
    return [];
  }

  const role = one(membership?.role ?? null);
  const level = one(role?.level ?? null);
  const order = one(level?.order ?? null);

  const requirements: InventoryRequirement[] = [];

  requirements.push({
    label: "Item active",
    met: item.is_active === true,
  });

  const attribute = (
    label: string,
    minimum: number | null,
    actual: number | null,
  ) => {
    if (minimum === null) {
      return;
    }

    requirements.push({
      label: `${label} ${minimum}+`,
      met: (actual ?? 0) >= minimum,
    });
  };

  attribute(
    "Muscles",
    item.min_muscles,
    character.muscles,
  );
  attribute(
    "Reflexes",
    item.min_reflexes,
    character.reflexes,
  );
  attribute(
    "Vigour",
    item.min_vigour,
    character.vigor,
  );
  attribute(
    "Shrewd",
    item.min_shrewd,
    character.shrewd,
  );
  attribute(
    "Brains",
    item.min_brains,
    character.brains,
  );
  attribute(
    "Presence",
    item.min_presence,
    character.presence_score,
  );

  const races = item.races ?? [];

  if (races.length) {
    requirements.push({
      label: `Ancestry: ${races
        .map(
          (entry) =>
            one(entry.race)?.name,
        )
        .filter(Boolean)
        .join(" / ")}`,
      met: races.some(
        (entry) =>
          entry.race_id ===
          character.race_id,
      ),
    });
  }

  const orders = item.orders ?? [];

  if (orders.length) {
    requirements.push({
      label: `Order: ${orders
        .map(
          (entry) =>
            one(entry.order)?.name,
        )
        .filter(Boolean)
        .join(" / ")}`,
      met: orders.some(
        (entry) =>
          entry.order_id ===
          order?.id,
      ),
    });
  }

  const jobs = item.jobs ?? [];

  if (jobs.length) {
    requirements.push({
      label: `Role: ${jobs
        .map((entry) => {
          const job = one(entry.job);
          const jobLevel = one(
            job?.level ?? null,
          );
          const jobOrder = one(
            jobLevel?.order ?? null,
          );

          return job
            ? `${
                jobOrder?.name ??
                "Order"
              } — L${
                jobLevel?.level ?? "?"
              } ${job.name}`
            : null;
        })
        .filter(Boolean)
        .join(" / ")}`,
      met: jobs.some(
        (entry) =>
          entry.order_job_id ===
          membership?.order_job_id,
      ),
    });
  }

  if (
    item.min_order_level !== null
  ) {
    requirements.push({
      label: `Order Level ${item.min_order_level}+`,
      met:
        (level?.level ?? -1) >=
        item.min_order_level,
    });
  }

  return requirements;
}

function getUseBlockReason(
  item: ItemRequirementRow | undefined,
  character: CharacterState | null,
  maxHealth: number | null,
): string | null {
  if (
    !item ||
    !character ||
    maxHealth === null
  ) {
    return null;
  }

  if (item.teaches_recipe_id) {
    return null;
  }

  const effects =
    (item.effects ?? []).filter(
      (effect) =>
        effect.trigger_type === "use",
    );

  if (!effects.length) {
    return "This Item has no configured Use effect.";
  }

  // Temporary effects are meaningful even if a simultaneous heal would
  // be wasted, so the Item is allowed.
  if (
    effects.some(
      (effect) =>
        effect.effect_mode ===
        "temporary",
    )
  ) {
    return null;
  }

  const currentHealth =
    Math.max(
      0,
      Math.min(
        character.current_health ??
          maxHealth,
        maxHealth,
      ),
    );

  const hasApplicableInstant =
    effects.some((effect) => {
      if (
        effect.effect_mode !==
        "instant"
      ) {
        return false;
      }

      if (
        effect.health_delta > 0
      ) {
        return (
          currentHealth <
          maxHealth
        );
      }

      if (
        effect.health_delta < 0
      ) {
        return currentHealth > 0;
      }

      return false;
    });

  if (hasApplicableInstant) {
    return null;
  }

  const isHealingItem =
    effects.some(
      (effect) =>
        effect.effect_mode ===
          "instant" &&
        effect.health_delta > 0,
    );

  if (
    isHealingItem &&
    currentHealth >= maxHealth
  ) {
    return "You are already at full Health.";
  }

  return "This Item would have no effect right now.";
}

function equipmentBonuses(
  item: ItemRequirementRow | undefined,
) {
  if (!item) {
    return [];
  }

  const totals =
    new Map<string, number>();

  const add = (
    label: string,
    value: number,
  ) => {
    if (!value) {
      return;
    }

    totals.set(
      label,
      (totals.get(label) ?? 0) + value,
    );
  };

  for (const effect of item.effects ?? []) {
    if (
      effect.trigger_type !== "equipped" ||
      effect.effect_mode !== "passive"
    ) {
      continue;
    }

    add("Muscles", effect.muscles_modifier);
    add("Reflexes", effect.reflexes_modifier);
    add("Vigour", effect.vigour_modifier);
    add("Shrewd", effect.shrewd_modifier);
    add("Brains", effect.brains_modifier);
    add("Presence", effect.presence_modifier);
    add("Max Health", effect.max_health_modifier);
    add("Affinity", effect.warping_affinity_modifier);
    add("Shapes/day", effect.warps_per_day_modifier);
  }

  return [...totals.entries()]
    .filter(([, value]) => value !== 0)
    .map(([label, value]) => ({
      label,
      value,
    }));
}

function itemEffects(
  item: ItemRequirementRow | undefined,
): InventoryItemEffect[] {
  if (!item) {
    return [];
  }

  const result: InventoryItemEffect[] = [];

  const push = (
    context: string,
    durationMinutes: number | null,
    label: string,
    value: number,
  ) => {
    if (!value) return;

    result.push({
      context,
      duration_minutes: durationMinutes,
      label,
      value,
    });
  };

  for (const effect of item.effects ?? []) {
    const context =
      effect.trigger_type === "owned"
        ? "While owned"
        : effect.trigger_type === "equipped"
          ? "While equipped"
          : effect.trigger_type === "use"
            ? "On use"
            : "Effect";

    const durationMinutes =
      effect.trigger_type === "use" &&
      effect.effect_mode === "temporary"
        ? effect.duration_minutes
        : null;

    push(context, durationMinutes, "Health", effect.health_delta);
    push(context, durationMinutes, "Muscles", effect.muscles_modifier);
    push(context, durationMinutes, "Reflexes", effect.reflexes_modifier);
    push(context, durationMinutes, "Vigour", effect.vigour_modifier);
    push(context, durationMinutes, "Shrewd", effect.shrewd_modifier);
    push(context, durationMinutes, "Brains", effect.brains_modifier);
    push(context, durationMinutes, "Presence", effect.presence_modifier);
    push(context, durationMinutes, "Max Health", effect.max_health_modifier);
    push(context, durationMinutes, "Affinity", effect.warping_affinity_modifier);
    push(context, durationMinutes, "Shapes/day", effect.warps_per_day_modifier);
  }

  return result;
}

export async function CharacterInventoryDisplay({
  characterId,
  own = false,
}: {
  characterId: string;
  own?: boolean;
}) {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_public_character_inventory",
    {
      p_character_id:
        characterId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load character Inventory: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as InventoryRow[];

  const itemIds = [
    ...new Set(
      rows.map(
        (row) => row.item_id,
      ),
    ),
  ];

  const uniqueRecordIds =
    rows
      .filter((row) => row.record_kind === "unique")
      .map((row) => row.record_id);

  const [
    characterResult,
    membershipResult,
    requirementsResult,
    uniqueInstancesResult,
    cooldownsResult,
    maxHealthResult,
    activeEffectsResult,
    targetsResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(
        "display_name, first_name, surname, race_id, muscles, reflexes, vigor, shrewd, brains, presence_score, current_health, current_room_id",
      )
      .eq(
        "id",
        characterId,
      )
      .maybeSingle(),

    supabase
      .from(
        "order_memberships",
      )
      .select(`
        order_job_id,
        role:order_jobs(
          id,
          name,
          level:order_levels(
            level,
            order:orders(
              id,
              name
            )
          )
        )
      `)
      .eq(
        "character_id",
        characterId,
      )
      .limit(1)
      .maybeSingle(),

    itemIds.length
      ? supabase
          .from("items")
          .select(`
            id,
            is_active,
            equip_slot,
            use_behaviour,
            target_mode,
            max_charges,
            cooldown_minutes,
            teaches_recipe_id,
            reference_value,
            success_die,
            success_threshold,
            success_attribute,
            damage_dice,
            damage_type,
            effects:item_effects(
              trigger_type,
              effect_mode,
              duration_minutes,
              health_delta,
              muscles_modifier,
              reflexes_modifier,
              vigour_modifier,
              shrewd_modifier,
              brains_modifier,
              presence_modifier,
              max_health_modifier,
              warping_affinity_modifier,
              warps_per_day_modifier
            ),
            min_muscles,
            min_reflexes,
            min_vigour,
            min_shrewd,
            min_brains,
            min_presence,
            min_order_level,
            races:item_equipment_races(
              race_id,
              race:races(name)
            ),
            orders:item_equipment_orders(
              order_id,
              order:orders(name)
            ),
            jobs:item_equipment_jobs(
              order_job_id,
              job:order_jobs(
                name,
                level:order_levels(
                  level,
                  order:orders(name)
                )
              )
            )
          `)
          .in(
            "id",
            itemIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    uniqueRecordIds.length
      ? supabase
          .from("character_item_instances")
          .select("id, charges_remaining")
          .in("id", uniqueRecordIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    own
      ? supabase
          .from("character_item_use_cooldowns")
          .select("source_key, ready_at")
          .eq("character_id", characterId)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    own
      ? supabase.rpc(
          "get_character_current_max_health",
          {
            p_character_id: characterId,
          },
        )
      : Promise.resolve({
          data: null,
          error: null,
        }),

    own
      ? supabase
          .from("character_active_item_effects")
          .select(
            "item_id, item_instance_id, expires_at",
          )
          .eq(
            "character_id",
            characterId,
          )
          .gt(
            "expires_at",
            new Date().toISOString(),
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    own
      ? supabase
          .from("characters")
          .select(
            "id, display_name, current_room_id, status",
          )
          .eq("status", "approved")
      .eq("is_system", false)
          .neq("id", characterId)
          .order("display_name")
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const stateError =
    characterResult.error ??
    membershipResult.error ??
    requirementsResult.error ??
    uniqueInstancesResult.error ??
    cooldownsResult.error ??
    maxHealthResult.error ??
    activeEffectsResult.error ??
    targetsResult.error;

  if (stateError) {
    throw new Error(
      `Unable to load Item requirements: ${stateError.message}`,
    );
  }

  const character =
    (characterResult.data ??
      null) as CharacterState | null;

  const characterName =
    character?.display_name?.trim() ||
    [
      character?.first_name,
      character?.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "This character";

  const membership =
    (membershipResult.data ??
      null) as unknown as MembershipState | null;

  const requirementRows =
    (requirementsResult.data ??
      []) as unknown as ItemRequirementRow[];

  const requirementByItem =
    new Map(
      requirementRows.map(
        (row) => [
          row.id,
          row,
        ],
      ),
    );

  const uniqueCharges = new Map(
    (uniqueInstancesResult.data ?? []).map((entry) => [
      entry.id,
      entry.charges_remaining,
    ]),
  );

  const cooldowns = new Map(
    (cooldownsResult.data ?? []).map((entry) => [
      entry.source_key,
      entry.ready_at,
    ]),
  );

  const activeEffectExpiryByItem =
    new Map<string, string>();

  const activeEffectExpiryByInstance =
    new Map<string, string>();

  for (
    const effect of
      activeEffectsResult.data ?? []
  ) {
    const expiresAt =
      effect.expires_at;

    if (!expiresAt) {
      continue;
    }

    if (
      effect.item_instance_id
    ) {
      const previous =
        activeEffectExpiryByInstance.get(
          effect.item_instance_id,
        );

      if (
        !previous ||
        Date.parse(expiresAt) >
          Date.parse(previous)
      ) {
        activeEffectExpiryByInstance.set(
          effect.item_instance_id,
          expiresAt,
        );
      }
    } else if (
      effect.item_id
    ) {
      const previous =
        activeEffectExpiryByItem.get(
          effect.item_id,
        );

      if (
        !previous ||
        Date.parse(expiresAt) >
          Date.parse(previous)
      ) {
        activeEffectExpiryByItem.set(
          effect.item_id,
          expiresAt,
        );
      }
    }
  }

  const maxHealth =
    own &&
    maxHealthResult.data !== null
      ? Number(maxHealthResult.data)
      : null;

  const useTargets =
    (targetsResult.data ?? [])
      .filter(
        (target) =>
          character?.current_room_id &&
          target.current_room_id ===
            character.current_room_id,
      )
      .map((target) => ({
        id: target.id,
        name:
          target.display_name?.trim() ||
          "Unnamed character",
      }));

  const browserRows:
    InventoryBrowserRow[] =
    rows.map((row) => {
      const master =
        requirementByItem.get(
          row.item_id,
        );

      const sourceKey =
        row.record_kind === "unique"
          ? `unique:${row.record_id}`
          : `standard:${row.item_id}`;

      return {
        ...row,
        item_active:
          master?.is_active === true,
        teaches_recipe:
          Boolean(
            master?.teaches_recipe_id,
          ),
        reference_value:
          master?.reference_value === null ||
          master?.reference_value === undefined
            ? null
            : Number(
                master.reference_value,
              ),
        configured_slot:
          master?.equip_slot ??
          null,
        use_behaviour:
          master?.use_behaviour ?? null,
        target_mode:
          master?.target_mode ?? null,
        max_charges:
          master?.max_charges ?? null,
        charges_remaining:
          row.record_kind === "unique"
            ? uniqueCharges.get(row.record_id) ?? null
            : null,
        cooldown_minutes:
          master?.cooldown_minutes ?? null,
        success_die:
          master?.success_die ?? null,
        success_threshold:
          master?.success_threshold ?? null,
        success_attribute:
          master?.success_attribute ?? null,
        damage_dice:
          master?.damage_dice ?? null,
        damage_type:
          master?.damage_type ?? null,
        cooldown_ready_at:
          cooldowns.get(sourceKey) ?? null,
        active_effect_expires_at:
          row.record_kind === "unique"
            ? activeEffectExpiryByInstance.get(
                row.record_id,
              ) ?? null
            : activeEffectExpiryByItem.get(
                row.item_id,
              ) ?? null,
        use_block_reason:
          own
            ? getUseBlockReason(
                master,
                character,
                maxHealth,
              )
            : null,
        requirements:
          row.is_equippable
            ? requirementList(
                master,
                character,
                membership,
              )
            : [],
        equipment_bonuses:
          row.is_equippable
            ? equipmentBonuses(
                master,
              )
            : [],
        item_effects:
          itemEffects(master),
      };
    });

  return (
    <CharacterInventoryBrowser
      rows={browserRows}
      characterName={
        characterName
      }
      own={own}
      useTargets={useTargets}
    />
  );
}
