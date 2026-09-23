"use server";



import { redirect } from "next/navigation";
import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  applyGiftOwnershipHealthEffects,
  removeGiftOwnershipHealthEffects,
} from "@/lib/gifts/gift-health-effects";
import { createClient } from "@/lib/supabase/server";
import { wordOfPower } from "@/lib/warping/constants";

function requiredText(formData: FormData, name: string, label: string) {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() || null : null;
}

function integer(formData: FormData, name: string, fallback = 0) {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function timeInMinutes(
  formData: FormData,
  valueName: string,
  unitName: string,
  fallback = 0,
) {
  const amount = integer(
    formData,
    valueName,
    fallback,
  );

  const unit =
    optionalText(
      formData,
      unitName,
    ) ?? "minutes";

  const multiplier =
    unit === "days"
      ? 1440
      : unit === "hours"
        ? 60
        : unit === "minutes"
          ? 1
          : null;

  if (multiplier === null) {
    throw new Error(
      "Invalid Feat time unit.",
    );
  }

  return amount * multiplier;
}

function allIds(formData: FormData, name: string) {
  return formData.getAll(name).filter(
    (value): value is string =>
      typeof value === "string" && value.length > 0,
  );
}

function attr(formData: FormData, name: string, label: string) {
  const value = integer(formData, name, 0);
  if (value < -10 || value > 10) {
    throw new Error(`${label} modifier must be between -10 and 10.`);
  }
  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function back(type: "success" | "error", message: string): never {
  const params = new URLSearchParams();
  params.set(type, message);
  redirect(`/admin/gifts?${params.toString()}`);
}

function refresh() {
  revalidatePath("/admin/gifts");
  revalidatePath("/character/create");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/orders/manage");
  revalidatePath("/game");
}

function giftValues(formData: FormData) {
  const requestedEffectMode =
    requiredText(formData, "effectMode", "Effect mode");

  const effectMode =
    requestedEffectMode === "none"
      ? "temporary"
      : requestedEffectMode;

  if (!["passive", "temporary"].includes(effectMode)) {
    throw new Error("Invalid Feat effect mode.");
  }

  const isPassive =
    effectMode === "passive";

  let durationMinutes: number | null = null;
  let isInstantaneous = false;

  if (!isPassive) {
    const durationMode =
      requiredText(formData, "durationMode", "Duration");

    if (!["instantaneous", "minutes"].includes(durationMode)) {
      throw new Error("Invalid Feat duration.");
    }

    isInstantaneous =
      durationMode === "instantaneous";

    if (isInstantaneous) {
      durationMinutes = 0;
    } else {
      durationMinutes =
        timeInMinutes(
          formData,
          "durationValue",
          "durationUnit",
          0,
        );

      if (durationMinutes <= 0) {
        throw new Error(
          "Timed Activated Feats need a duration greater than 0.",
        );
      }
    }
  }

  const cooldownMinutes =
    isPassive
      ? 0
      : timeInMinutes(
          formData,
          "cooldownValue",
          "cooldownUnit",
          0,
        );

  if (cooldownMinutes < 0) {
    throw new Error("Feat cooldown cannot be negative.");
  }

  const healthDelta =
    isPassive
      ? 0
      : integer(formData, "healthDelta", 0);

  const healthDice =
    isPassive
      ? null
      : optionalText(formData, "healthDice");

  if (
    healthDice &&
    !/^[1-9][0-9]*d(4|6|8|10|12|20|100)$/.test(healthDice)
  ) {
    throw new Error(
      "Healing dice must use a format such as 1d4, 2d6 or 1d12.",
    );
  }

  if (healthDice) {
    const count =
      Number.parseInt(healthDice.split("d")[0] ?? "0", 10);

    if (count > 20) {
      throw new Error(
        "A Feat cannot roll more than 20 healing dice.",
      );
    }
  }

  const requestedTargetMode =
    isPassive
      ? "self"
      : requiredText(formData, "targetMode", "Target mode");

  if (!["self", "other", "either"].includes(requestedTargetMode)) {
    throw new Error("Invalid Feat target mode.");
  }

  const targetMode =
    isPassive
      ? "self"
      : requestedTargetMode;

  const damageDice =
    isPassive
      ? null
      : optionalText(formData, "damageDice");

  if (
    damageDice &&
    !/^[1-9][0-9]*d(4|6|8|10|12|20|100)$/.test(damageDice)
  ) {
    throw new Error(
      "Damage dice must use a format such as 1d4, 2d6 or 1d12.",
    );
  }

  if (damageDice) {
    const count =
      Number.parseInt(damageDice.split("d")[0] ?? "0", 10);

    if (count > 20) {
      throw new Error(
        "A Feat cannot roll more than 20 damage dice.",
      );
    }
  }

  const damageType =
    damageDice
      ? optionalText(formData, "damageType") ?? "Damage"
      : null;

  const allowsPersistentModifiers =
    isPassive ||
    (!isPassive && !isInstantaneous);

  const maxHealthModifier =
    allowsPersistentModifiers
      ? integer(formData, "maxHealthModifier", 0)
      : 0;

  const musclesModifier =
    allowsPersistentModifiers
      ? attr(formData, "musclesModifier", "Muscles")
      : 0;

  const reflexesModifier =
    allowsPersistentModifiers
      ? attr(formData, "reflexesModifier", "Reflexes")
      : 0;

  const vigourModifier =
    allowsPersistentModifiers
      ? attr(formData, "vigourModifier", "Vigour")
      : 0;

  const shrewdModifier =
    allowsPersistentModifiers
      ? attr(formData, "shrewdModifier", "Shrewd")
      : 0;

  const brainsModifier =
    allowsPersistentModifiers
      ? attr(formData, "brainsModifier", "Brains")
      : 0;

  const presenceModifier =
    allowsPersistentModifiers
      ? attr(formData, "presenceModifier", "Presence")
      : 0;

  const warpingAffinityModifier =
    allowsPersistentModifiers
      ? Math.max(
          0,
          Math.min(
            8,
            integer(formData, "warpingAffinityModifier", 0),
          ),
        )
      : 0;

  const warpsPerDayModifier =
    allowsPersistentModifiers
      ? Math.max(
          0,
          Math.min(
            10,
            integer(formData, "warpsPerDayModifier", 0),
          ),
        )
      : 0;

  let successDie: number | null = null;
  let successThreshold: number | null = null;
  let successAttribute: string | null = null;

  if (!isPassive) {
    const rawSuccessDie =
      optionalText(formData, "successDie");

    if (rawSuccessDie) {
      const parsedSuccessDie =
        Number.parseInt(rawSuccessDie, 10);

      if (
        ![4, 6, 8, 10, 12, 20, 100].includes(
          parsedSuccessDie,
        )
      ) {
        throw new Error("Invalid Success Die.");
      }

      successDie =
        parsedSuccessDie;

      successThreshold =
        integer(formData, "successThreshold", 0);

      if (successThreshold < 1) {
        throw new Error(
          "A Success Roll needs a threshold of at least 1.",
        );
      }

      const requestedSuccessAttribute =
        optionalText(formData, "successAttribute");

      if (
        requestedSuccessAttribute &&
        ![
          "muscles",
          "reflexes",
          "vigor",
          "brains",
          "shrewd",
          "presence_score",
        ].includes(requestedSuccessAttribute)
      ) {
        throw new Error("Invalid Success Attribute.");
      }

      successAttribute =
        requestedSuccessAttribute;
    }
  }

  return {
    name: requiredText(formData, "name", "Gift name"),
    description: optionalText(formData, "description") ?? "",
    is_active: checkbox(formData, "isActive"),
    is_general: checkbox(formData, "isGeneral"),
    effect_mode: effectMode,
    target_mode: targetMode,
    duration_minutes: durationMinutes,
    cooldown_minutes: cooldownMinutes,
    health_delta: healthDelta,
    health_dice: healthDice,
    damage_dice: damageDice,
    damage_type: damageType,
    success_die: successDie,
    success_threshold: successThreshold,
    success_attribute: successAttribute,
    max_health_modifier: maxHealthModifier,
    muscles_modifier: musclesModifier,
    reflexes_modifier: reflexesModifier,
    vigour_modifier: vigourModifier,
    shrewd_modifier: shrewdModifier,
    brains_modifier: brainsModifier,
    presence_modifier: presenceModifier,
    warping_affinity_modifier: warpingAffinityModifier,
    warps_per_day_modifier: warpsPerDayModifier,
    sort_order: integer(formData, "sortOrder", 0),
  };
}

function prefixedText(formData: FormData, name: string) {
  return optionalText(formData, `mechanics_${name}`);
}

function prefixedInt(
  formData: FormData,
  name: string,
  fallback = 0,
) {
  return integer(formData, `mechanics_${name}`, fallback);
}

function prefixedAll(formData: FormData, name: string) {
  return formData.getAll(`mechanics_${name}`).map(String);
}

function prefixedCsv(formData: FormData, name: string) {
  return (prefixedText(formData, name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function shapeStylePayload(
  formData: FormData,
  giftId: string,
  values: ReturnType<typeof giftValues>,
) {
  const targetMode =
    prefixedText(formData, "target_mode") ??
    values.target_mode ??
    "self";

  const targetScope =
    prefixedText(formData, "target_scope") ??
    "single";

  const passive =
    values.effect_mode === "passive";

  const durationMode =
    passive
      ? "until_dispelled"
      : prefixedText(
          formData,
          "duration_mode",
        ) ??
        "instantaneous";

  const instantaneous =
    !passive &&
    durationMode === "instantaneous";

  const durationUnit =
    passive
      ? "until_dispelled"
      : instantaneous
        ? "minutes"
        : durationMode;

  const otherAlternative =
    targetMode !== "self" &&
    formData.get("mechanics_other_alternative_enabled") === "on";

  const resolution = (
    profile: "self" | "other" | "other_alt",
    fallback: "automatic" | "save",
  ) =>
    prefixedText(formData, `${profile}_resolution_mode`) ??
    fallback;

  const selfResolution = resolution("self", "automatic");
  const otherResolution = resolution("other", "automatic");
  const otherAltResolution = resolution("other_alt", "save");

  const profileFields = (
    profile: "self" | "other" | "other_alt",
    enabled = true,
  ) => ({
    [`${profile}_damage_dice`]:
      enabled
        ? prefixedText(formData, `${profile}_damage_dice`)
        : null,
    [`${profile}_damage_attribute`]:
      enabled
        ? prefixedText(formData, `${profile}_damage_attribute`)
        : null,
    [`${profile}_heal_dice`]:
      enabled
        ? prefixedText(formData, `${profile}_heal_dice`)
        : null,
    [`${profile}_heal_attribute`]:
      enabled
        ? prefixedText(formData, `${profile}_heal_attribute`)
        : null,
    [`${profile}_max_hp_change`]:
      enabled
        ? prefixedText(formData, `${profile}_max_hp_change`)
        : null,
    [`${profile}_conditions`]:
      enabled
        ? prefixedCsv(formData, `${profile}_conditions`)
        : [],
    [`${profile}_muscles_modifier`]:
      enabled
        ? prefixedInt(formData, `${profile}_muscles_modifier`)
        : 0,
    [`${profile}_reflexes_modifier`]:
      enabled
        ? prefixedInt(formData, `${profile}_reflexes_modifier`)
        : 0,
    [`${profile}_vigour_modifier`]:
      enabled
        ? prefixedInt(formData, `${profile}_vigour_modifier`)
        : 0,
    [`${profile}_brains_modifier`]:
      enabled
        ? prefixedInt(formData, `${profile}_brains_modifier`)
        : 0,
    [`${profile}_shrewd_modifier`]:
      enabled
        ? prefixedInt(formData, `${profile}_shrewd_modifier`)
        : 0,
    [`${profile}_presence_modifier`]:
      enabled
        ? prefixedInt(formData, `${profile}_presence_modifier`)
        : 0,
  });

  const essence = "Pyr";
  const action = "Creo";
  const law = "Eos";

  return {
    feat_id: giftId,
    is_feat_backing: true,
    name: values.name,
    description: values.description,
    extended_description: null,
    level: 1,
    school: "embercraft",
    essence_word: essence,
    action_word: action,
    law_word: law,
    word_of_power: wordOfPower(essence, action, law),
    movement: "projection",
    requires_verbal: false,
    requires_movement: false,

    resolution_mode: otherResolution,
    dc_attribute:
      otherResolution === "save"
        ? prefixedText(formData, "other_dc_attribute")
        : null,
    save_options:
      otherResolution === "save"
        ? prefixedAll(formData, "other_save_options")
        : [],
    save_success_damage:
      otherResolution === "save"
        ? prefixedText(formData, "other_save_success_damage") ?? "none"
        : "none",

    self_resolution_mode: selfResolution,
    self_dc_attribute:
      selfResolution === "save"
        ? prefixedText(formData, "self_dc_attribute")
        : null,
    self_save_options:
      selfResolution === "save"
        ? prefixedAll(formData, "self_save_options")
        : [],
    self_save_success_damage:
      selfResolution === "save"
        ? prefixedText(formData, "self_save_success_damage") ?? "none"
        : "none",

    other_resolution_mode: otherResolution,
    other_dc_attribute:
      otherResolution === "save"
        ? prefixedText(formData, "other_dc_attribute")
        : null,
    other_save_options:
      otherResolution === "save"
        ? prefixedAll(formData, "other_save_options")
        : [],
    other_save_success_damage:
      otherResolution === "save"
        ? prefixedText(formData, "other_save_success_damage") ?? "none"
        : "none",

    other_alt_resolution_mode: otherAltResolution,
    other_alt_dc_attribute:
      otherAlternative && otherAltResolution === "save"
        ? prefixedText(formData, "other_alt_dc_attribute")
        : null,
    other_alt_save_options:
      otherAlternative && otherAltResolution === "save"
        ? prefixedAll(formData, "other_alt_save_options")
        : [],
    other_alt_save_success_damage:
      otherAlternative && otherAltResolution === "save"
        ? prefixedText(formData, "other_alt_save_success_damage") ?? "none"
        : "none",

    target_mode: targetMode,
    target_scope:
      targetMode === "self" ? "single" : targetScope,
    max_targets:
      targetMode === "self" || targetScope !== "multiple"
        ? 1
        : Math.max(2, prefixedInt(formData, "max_targets", 2)),

    effect_nature:
      prefixedText(formData, "effect_nature") ?? "harmful",
    is_instantaneous: instantaneous,
    duration_unit: durationUnit,
    duration_amount:
      instantaneous || durationUnit === "until_dispelled"
        ? null
        : Math.max(1, prefixedInt(formData, "duration_amount", 1)),

    is_dispel:
      formData.get(
        "mechanics_is_dispel",
      ) === "on",
    price_key: null,
    damage_type:
      prefixedText(formData, "damage_type") ??
      values.damage_type ??
      null,

    ...profileFields("self"),
    ...profileFields("other"),
    ...profileFields("other_alt", otherAlternative),

    other_alternative_enabled: otherAlternative,

    min_muscles: null,
    min_reflexes: null,
    min_vigour: null,
    min_brains: null,
    min_shrewd: null,
    min_presence: null,

    is_active: values.is_active,
    updated_at: new Date().toISOString(),
  };
}

function validateShapeStylePayload(
  payload: any,
) {
  if (
    (payload.target_mode === "other" ||
      payload.target_mode === "either") &&
    payload.other_resolution_mode === "save" &&
    payload.other_save_options.length === 0
  ) {
    throw new Error(
      "The normal/Beneficial Other effect requires at least one Save option.",
    );
  }

  if (
    payload.other_alternative_enabled &&
    payload.other_alt_resolution_mode === "save" &&
    payload.other_alt_save_options.length === 0
  ) {
    throw new Error(
      "The Harmful Other effect requires at least one Save option.",
    );
  }

  const passiveMaxHp =
    String(
      payload.self_max_hp_change ??
        "",
    ).trim();

  if (
    payload.duration_unit === "until_dispelled" &&
    payload.feat_id &&
    passiveMaxHp &&
    !/^[+-]?[0-9]+$/.test(passiveMaxHp)
  ) {
    throw new Error(
      "Passive Feat Max HP change must be a fixed whole number, not dice.",
    );
  }

  const persistent =
    payload.self_conditions.length ||
    payload.other_conditions.length ||
    payload.other_alt_conditions.length ||
    [
      payload.self_max_hp_change,
      payload.other_max_hp_change,
      payload.other_alt_max_hp_change,
      payload.self_muscles_modifier,
      payload.self_reflexes_modifier,
      payload.self_vigour_modifier,
      payload.self_brains_modifier,
      payload.self_shrewd_modifier,
      payload.self_presence_modifier,
      payload.other_muscles_modifier,
      payload.other_reflexes_modifier,
      payload.other_vigour_modifier,
      payload.other_brains_modifier,
      payload.other_shrewd_modifier,
      payload.other_presence_modifier,
      payload.other_alt_muscles_modifier,
      payload.other_alt_reflexes_modifier,
      payload.other_alt_vigour_modifier,
      payload.other_alt_brains_modifier,
      payload.other_alt_shrewd_modifier,
      payload.other_alt_presence_modifier,
    ].some((value) =>
      typeof value === "number" ? value !== 0 : Boolean(value),
    );

  if (payload.is_instantaneous && persistent) {
    throw new Error(
      "Instantaneous Feat mechanics cannot apply Conditions, Attribute modifiers or Max Health changes.",
    );
  }
}

async function syncGiftMechanics(
  giftId: string,
  formData: FormData,
  values: ReturnType<typeof giftValues>,
) {
  const supabase = await createClient();
  const payload = shapeStylePayload(formData, giftId, values);
  validateShapeStylePayload(payload);

  const existing = await supabase
    .from("shapes")
    .select("id")
    .eq("feat_id", giftId)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);

  if (existing.data) {
    const update = await supabase
      .from("shapes")
      .update(payload)
      .eq("id", existing.data.id);

    if (update.error) {
      throw new Error(
        `Unable to save Shape-style Feat mechanics: ${update.error.message}`,
      );
    }
    return;
  }

  const insert = await supabase.from("shapes").insert(payload);

  if (insert.error) {
    throw new Error(
      `Unable to create Shape-style Feat mechanics: ${insert.error.message}`,
    );
  }
}

async function replaceEligibility(
  giftId: string,
  raceIds: string[],
  roleIds: string[],
) {
  const supabase = await createClient();

  const [oldRacesResult, oldRolesResult] = await Promise.all([
    supabase.from("gift_races").select("race_id").eq("gift_id", giftId),
    supabase.from("gift_order_jobs").select("order_job_id").eq("gift_id", giftId),
  ]);

  const snapshotError =
    oldRacesResult.error ?? oldRolesResult.error;

  if (snapshotError) {
    throw new Error(
      `Unable to preserve existing Feat eligibility: ${snapshotError.message}`,
    );
  }

  const oldRaceIds =
    (oldRacesResult.data ?? []).map((row) => row.race_id);
  const oldRoleIds =
    (oldRolesResult.data ?? []).map((row) => row.order_job_id);

  const restoreEligibility = async () => {
    await Promise.all([
      supabase.from("gift_races").delete().eq("gift_id", giftId),
      supabase.from("gift_order_jobs").delete().eq("gift_id", giftId),
    ]);

    if (oldRaceIds.length) {
      await supabase.from("gift_races").insert(
        oldRaceIds.map((raceId) => ({
          gift_id: giftId,
          race_id: raceId,
        })),
      );
    }

    if (oldRoleIds.length) {
      await supabase.from("gift_order_jobs").insert(
        oldRoleIds.map((roleId) => ({
          gift_id: giftId,
          order_job_id: roleId,
        })),
      );
    }
  };

  const [raceDelete, roleDelete] = await Promise.all([
    supabase.from("gift_races").delete().eq("gift_id", giftId),
    supabase.from("gift_order_jobs").delete().eq("gift_id", giftId),
  ]);

  const deleteError = raceDelete.error ?? roleDelete.error;
  if (deleteError) {
    await restoreEligibility();
    throw new Error(deleteError.message);
  }

  if (raceIds.length) {
    const { error } = await supabase.from("gift_races").insert(
      raceIds.map((raceId) => ({
        gift_id: giftId,
        race_id: raceId,
      })),
    );
    if (error) {
      await restoreEligibility();
      throw new Error(`Unable to save Ancestry eligibility: ${error.message}`);
    }
  }

  if (roleIds.length) {
    const { error } = await supabase.from("gift_order_jobs").insert(
      roleIds.map((roleId) => ({
        gift_id: giftId,
        order_job_id: roleId,
      })),
    );
    if (error) {
      await restoreEligibility();
      throw new Error(`Unable to save Order Role eligibility: ${error.message}`);
    }
  }
}

export async function createGift(formData: FormData) {
  await requireAdminSection("gifts");
  const supabase = await createClient();

  try {
    const values = giftValues(formData);

    const { data, error } = await supabase
      .from("gifts")
      .insert(values)
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Gift could not be created.");

    try {
      await syncGiftMechanics(
        data.id,
        formData,
        values,
      );

      await replaceEligibility(
        data.id,
        allIds(formData, "raceIds"),
        allIds(formData, "roleIds"),
      );
    } catch (error) {
      await supabase.from("gifts").delete().eq("id", data.id);
      throw error;
    }
  } catch (error) {
    back("error", error instanceof Error ? error.message : "Unable to create Gift.");
  }

  refresh();
  return;
}

export async function updateGift(formData: FormData) {
  await requireAdminSection("gifts");
  const supabase = await createClient();

  try {
    const giftId = requiredText(formData, "giftId", "Gift ID");
    if (!isUuid(giftId)) throw new Error("Invalid Gift.");

    const values =
      giftValues(formData);

    const { error } = await supabase
      .from("gifts")
      .update(values)
      .eq("id", giftId);

    if (error) throw new Error(error.message);

    await syncGiftMechanics(
      giftId,
      formData,
      values,
    );

    await replaceEligibility(
      giftId,
      allIds(formData, "raceIds"),
      allIds(formData, "roleIds"),
    );
  } catch (error) {
    back("error", error instanceof Error ? error.message : "Unable to update Gift.");
  }

  refresh();
  return;
}

export async function assignGiftToCharacter(formData: FormData) {
  const staff = await requireAdminSection("gifts");
  const supabase = await createClient();

  try {
    const giftId = requiredText(formData, "giftId", "Gift");
    const characterId = requiredText(formData, "characterId", "Character");
    const assignmentMode = requiredText(formData, "assignmentMode", "Assignment duration");

    if (!isUuid(giftId) || !isUuid(characterId)) {
      throw new Error("Invalid Gift or character.");
    }

    if (!["permanent", "temporary"].includes(assignmentMode)) {
      throw new Error("Invalid Feat assignment duration.");
    }

    const assignmentDays =
      assignmentMode === "temporary"
        ? integer(formData, "assignmentDays", 0)
        : 0;

    if (assignmentMode === "temporary" && assignmentDays <= 0) {
      throw new Error("Temporary Feat assignments need at least 1 day.");
    }

    const expiresAt =
      assignmentMode === "temporary"
        ? new Date(Date.now() + assignmentDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { error: expiryError } = await supabase.rpc(
      "reconcile_expired_staff_gifts",
      { p_character_id: characterId },
    );

    if (expiryError) {
      throw new Error(`Unable to clear expired Feat assignments: ${expiryError.message}`);
    }

    const {
      data: assignment,
      error,
    } = await supabase
      .from("character_gifts")
      .insert({
        gift_id: giftId,
        character_id: characterId,
        acquisition_source: "staff",
        assigned_by: staff.userId,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error?.code === "23505") {
      throw new Error("That character already owns this Gift.");
    }
    if (error || !assignment) {
      throw new Error(
        error?.message ??
          "Gift assignment could not be created.",
      );
    }

    try {
      await applyGiftOwnershipHealthEffects(
        assignment.id,
      );
    } catch (healthError) {
      await supabase
        .from("character_gifts")
        .delete()
        .eq("id", assignment.id);

      throw healthError;
    }
  } catch (error) {
    back("error", error instanceof Error ? error.message : "Unable to assign Gift.");
  }

  refresh();
  return;
}

export async function removeGiftFromCharacter(formData: FormData) {
  await requireAdminSection("gifts");
  const supabase = await createClient();

  try {
    const assignmentId = requiredText(formData, "assignmentId", "Assignment");
    if (!isUuid(assignmentId)) throw new Error("Invalid Gift assignment.");

    await removeGiftOwnershipHealthEffects(
      assignmentId,
    );

    const { error } = await supabase
      .from("character_gifts")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      try {
        await applyGiftOwnershipHealthEffects(
          assignmentId,
        );
      } catch {
        // Keep the original delete error. The ownership row still exists.
      }

      throw new Error(error.message);
    }
  } catch (error) {
    back("error", error instanceof Error ? error.message : "Unable to remove Gift.");
  }

  refresh();
  return;
}

export async function deleteGift(formData: FormData) {
  await requireAdminSection("gifts");
  const supabase = await createClient();

  try {
    const giftId = requiredText(formData, "giftId", "Gift ID");
    if (!isUuid(giftId)) throw new Error("Invalid Gift.");

    const { count, error: countError } = await supabase
      .from("character_gifts")
      .select("id", { count: "exact", head: true })
      .eq("gift_id", giftId);

    if (countError) throw new Error(countError.message);

    if (count && count > 0) {
      throw new Error(
        `This Gift is assigned to ${count} ${count === 1 ? "character" : "characters"}. Remove those assignments or deactivate the Gift instead.`,
      );
    }

    const { error } = await supabase.from("gifts").delete().eq("id", giftId);
    if (error) throw new Error(error.message);
  } catch (error) {
    back("error", error instanceof Error ? error.message : "Unable to delete Gift.");
  }

  refresh();
  return;
}
