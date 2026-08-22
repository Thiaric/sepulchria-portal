"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import {
  applyGiftOwnershipHealthEffects,
  removeGiftOwnershipHealthEffects,
} from "@/lib/gifts/gift-health-effects";
import { createClient } from "@/lib/supabase/server";

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
  const effectMode = requiredText(formData, "effectMode", "Effect mode");

  if (!["none", "passive", "temporary"].includes(effectMode)) {
    throw new Error("Invalid Feat effect mode.");
  }

  let durationMinutes: number | null = null;

  if (effectMode === "temporary") {
    const durationMode = requiredText(formData, "durationMode", "Duration");

    if (!["instantaneous", "minutes"].includes(durationMode)) {
      throw new Error("Invalid Feat duration.");
    }

    if (durationMode === "instantaneous") {
      durationMinutes = 0;
    } else {
      durationMinutes = integer(formData, "durationMinutes", 0);

      if (durationMinutes <= 0) {
        throw new Error(
          "Timed Activated Feats need a duration greater than 0 minutes.",
        );
      }
    }
  }

  const cooldownMinutes =
    effectMode === "temporary"
      ? integer(formData, "cooldownMinutes", 0)
      : 0;

  if (cooldownMinutes < 0) {
    throw new Error("Feat cooldown cannot be negative.");
  }

  const healthDelta =
    effectMode === "passive"
      ? 0
      : integer(formData, "healthDelta", 0);

  const maxHealthModifier =
    effectMode === "none"
      ? 0
      : integer(formData, "maxHealthModifier", 0);

  const requestedTargetMode =
    requiredText(formData, "targetMode", "Target mode");

  if (!["self", "other", "either"].includes(requestedTargetMode)) {
    throw new Error("Invalid Feat target mode.");
  }

  const targetMode =
    effectMode === "passive" ? "self" : requestedTargetMode;

  const rawDamageDice = optionalText(formData, "damageDice");
  const damageDice =
    effectMode === "passive" ? null : rawDamageDice;

  if (
    damageDice &&
    !/^[1-9][0-9]*d(4|6|8|10|12|20|100)$/.test(damageDice)
  ) {
    throw new Error(
      "Damage dice must use a format such as 1d4, 2d6 or 1d12.",
    );
  }

  if (damageDice) {
    const count = Number.parseInt(damageDice.split("d")[0] ?? "0", 10);
    if (count > 20) {
      throw new Error("A Feat cannot roll more than 20 damage dice.");
    }
  }

  const damageType =
    damageDice
      ? optionalText(formData, "damageType") ?? "Damage"
      : null;

  const musclesModifier = attr(formData, "musclesModifier", "Muscles");
  const reflexesModifier = attr(formData, "reflexesModifier", "Reflexes");
  const vigourModifier = attr(formData, "vigourModifier", "Vigour");
  const shrewdModifier = attr(formData, "shrewdModifier", "Shrewd");
  const brainsModifier = attr(formData, "brainsModifier", "Brains");
  const presenceModifier = attr(formData, "presenceModifier", "Presence");
  const warpingAffinityModifier = Math.max(0, Math.min(8, integer(formData, "warpingAffinityModifier", 0)));
  const warpsPerDayModifier = Math.max(0, Math.min(10, integer(formData, "warpsPerDayModifier", 0)));

  const hasLingeringModifier =
    maxHealthModifier !== 0 ||
    musclesModifier !== 0 ||
    reflexesModifier !== 0 ||
    vigourModifier !== 0 ||
    shrewdModifier !== 0 ||
    brainsModifier !== 0 ||
    presenceModifier !== 0 ||
    warpingAffinityModifier !== 0 ||
    warpsPerDayModifier !== 0;

  if (
    effectMode === "temporary" &&
    durationMinutes === 0 &&
    hasLingeringModifier
  ) {
    throw new Error(
      "Instantaneous Activated Feats may only change Current Health or deal Damage. Attribute and Maximum Health modifiers require a timed duration.",
    );
  }

  if (
    effectMode === "temporary" &&
    durationMinutes === 0 &&
    healthDelta === 0 &&
    !damageDice
  ) {
    throw new Error(
      "An Instantaneous Activated Feat must change Current Health or deal Damage.",
    );
  }

  let successDie: number | null = null;
  let successThreshold: number | null = null;
  let successAttribute: string | null = null;

  if (effectMode !== "passive") {
    const rawSuccessDie = optionalText(formData, "successDie");

    if (rawSuccessDie) {
      const parsedSuccessDie = Number.parseInt(rawSuccessDie, 10);

      if (![4, 6, 8, 10, 12, 20, 100].includes(parsedSuccessDie)) {
        throw new Error("Invalid Success Die.");
      }

      successDie = parsedSuccessDie;
      successThreshold = integer(formData, "successThreshold", 0);

      if (successThreshold < 1) {
        throw new Error("A Success Roll needs a threshold of at least 1.");
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

      successAttribute = requestedSuccessAttribute;
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
    warping_affinity_modifier: effectMode === "none" ? 0 : warpingAffinityModifier,
    warps_per_day_modifier: effectMode === "none" ? 0 : warpsPerDayModifier,
    sort_order: integer(formData, "sortOrder", 0),
  };
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
  await requireStaff();
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
  await requireStaff();
  const supabase = await createClient();

  try {
    const giftId = requiredText(formData, "giftId", "Gift ID");
    if (!isUuid(giftId)) throw new Error("Invalid Gift.");

    const { error } = await supabase
      .from("gifts")
      .update(giftValues(formData))
      .eq("id", giftId);

    if (error) throw new Error(error.message);

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
  const staff = await requireStaff();
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
  await requireStaff();
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
  await requireStaff();
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
