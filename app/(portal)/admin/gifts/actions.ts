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

  const durationMinutes =
    effectMode === "temporary"
      ? integer(formData, "durationMinutes", 0)
      : null;

  if (effectMode === "temporary" && (!durationMinutes || durationMinutes <= 0)) {
    throw new Error("Temporary Feats need a duration greater than 0 minutes.");
  }

  return {
    name: requiredText(formData, "name", "Gift name"),
    description: optionalText(formData, "description") ?? "",
    is_active: checkbox(formData, "isActive"),
    is_general: checkbox(formData, "isGeneral"),
    effect_mode: effectMode,
    duration_minutes: durationMinutes,
    muscles_modifier: attr(formData, "musclesModifier", "Muscles"),
    reflexes_modifier: attr(formData, "reflexesModifier", "Reflexes"),
    vigour_modifier: attr(formData, "vigourModifier", "Vigour"),
    shrewd_modifier: attr(formData, "shrewdModifier", "Shrewd"),
    brains_modifier: attr(formData, "brainsModifier", "Brains"),
    presence_modifier: attr(formData, "presenceModifier", "Presence"),
    sort_order: integer(formData, "sortOrder", 0),
  };
}

async function replaceEligibility(
  giftId: string,
  raceIds: string[],
  roleIds: string[],
) {
  const supabase = await createClient();

  const [raceDelete, roleDelete] = await Promise.all([
    supabase.from("gift_races").delete().eq("gift_id", giftId),
    supabase.from("gift_order_jobs").delete().eq("gift_id", giftId),
  ]);

  const deleteError = raceDelete.error ?? roleDelete.error;
  if (deleteError) throw new Error(deleteError.message);

  if (raceIds.length) {
    const { error } = await supabase.from("gift_races").insert(
      raceIds.map((raceId) => ({
        gift_id: giftId,
        race_id: raceId,
      })),
    );
    if (error) throw new Error(`Unable to save Ancestry eligibility: ${error.message}`);
  }

  if (roleIds.length) {
    const { error } = await supabase.from("gift_order_jobs").insert(
      roleIds.map((roleId) => ({
        gift_id: giftId,
        order_job_id: roleId,
      })),
    );
    if (error) throw new Error(`Unable to save Order Role eligibility: ${error.message}`);
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

    if (!isUuid(giftId) || !isUuid(characterId)) {
      throw new Error("Invalid Gift or character.");
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

    await applyGiftOwnershipHealthEffects(
      assignment.id,
    );
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

    if (error) throw new Error(error.message);
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
