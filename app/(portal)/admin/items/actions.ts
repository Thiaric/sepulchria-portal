"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const QUALITIES = ["poor", "average", "fine", "superior", "flawless", "peerless"] as const;
const TRANSFER_POLICIES = ["free", "restricted", "bound"] as const;
const USE_BEHAVIOURS = ["reusable", "consumable", "limited_charges"] as const;
const TARGET_MODES = ["self", "other", "either"] as const;
const TRIGGER_TYPES = ["owned", "equipped", "use"] as const;

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

function integer(formData: FormData, name: string, fallback: number | null = 0) {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fail(message: string): never {
  const params = new URLSearchParams();
  params.set("error", message);
  redirect(`/admin/items?${params.toString()}`);
}

function refresh() {
  revalidatePath("/admin/items");
  revalidatePath("/character");
  revalidatePath("/characters");
}

async function validateSubcategory(categoryId: string, subcategoryId: string | null) {
  if (!subcategoryId) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_subcategories")
    .select("category_id")
    .eq("id", subcategoryId)
    .maybeSingle();

  if (error || !data || data.category_id !== categoryId) {
    throw new Error("The selected subcategory does not belong to the selected core category.");
  }
}

async function itemValues(formData: FormData) {
  const name = requiredText(formData, "name", "Item name");
  const rawSlug = optionalText(formData, "slug");
  const slug = slugify(rawSlug ?? name);
  if (!slug) throw new Error("A valid item slug is required.");

  const categoryId = requiredText(formData, "categoryId", "Core category");
  if (!isUuid(categoryId)) throw new Error("Invalid core category.");

  const subcategoryId = optionalText(formData, "subcategoryId");
  if (subcategoryId && !isUuid(subcategoryId)) {
    throw new Error("Invalid subcategory.");
  }
  await validateSubcategory(categoryId, subcategoryId);

  const quality = requiredText(formData, "quality", "Quality");
  if (!QUALITIES.includes(quality as (typeof QUALITIES)[number])) {
    throw new Error("Invalid quality.");
  }

  const transferPolicy = requiredText(formData, "transferPolicy", "Transfer policy");
  if (!TRANSFER_POLICIES.includes(transferPolicy as (typeof TRANSFER_POLICIES)[number])) {
    throw new Error("Invalid transfer policy.");
  }

  const stackable = checkbox(formData, "stackable");
  const maxStack = stackable ? integer(formData, "maxStack", null) : null;
  if (maxStack !== null && maxStack < 1) {
    throw new Error("Maximum stack must be at least 1.");
  }

  const isUsable = checkbox(formData, "isUsable");

  let useBehaviour: string | null = null;
  let targetMode: string | null = null;
  let maxCharges: number | null = null;
  let cooldownMinutes: number | null = null;

  if (isUsable) {
    useBehaviour = requiredText(formData, "useBehaviour", "Use behaviour");
    targetMode = requiredText(formData, "targetMode", "Target mode");

    if (!USE_BEHAVIOURS.includes(useBehaviour as (typeof USE_BEHAVIOURS)[number])) {
      throw new Error("Invalid use behaviour.");
    }
    if (!TARGET_MODES.includes(targetMode as (typeof TARGET_MODES)[number])) {
      throw new Error("Invalid target mode.");
    }

    cooldownMinutes = integer(formData, "cooldownMinutes", null);
    if (cooldownMinutes !== null && cooldownMinutes < 0) {
      throw new Error("Cooldown cannot be negative.");
    }

    if (useBehaviour === "limited_charges") {
      maxCharges = integer(formData, "maxCharges", null);
      if (maxCharges === null || maxCharges < 1) {
        throw new Error("Limited-charge items need at least 1 charge.");
      }
    }
  }

  const referenceValue = integer(formData, "referenceValue", null);
  if (referenceValue !== null && referenceValue < 0) {
    throw new Error("Reference value cannot be negative.");
  }

  const supabase = await createClient();
  const { data: category, error: categoryError } = await supabase
    .from("item_categories")
    .select("slug")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError || !category) {
    throw new Error("Unable to verify the item category.");
  }

  const containerCapacity =
    category.slug === "container"
      ? integer(formData, "containerCapacity", null)
      : null;

  if (containerCapacity !== null && containerCapacity < 1) {
    throw new Error("Container capacity must be at least 1 slot.");
  }

  return {
    name,
    slug,
    description: optionalText(formData, "description") ?? "",
    image_url: optionalText(formData, "imageUrl"),
    category_id: categoryId,
    subcategory_id: subcategoryId,
    quality,
    transfer_policy: transferPolicy,
    is_quest_item: checkbox(formData, "isQuestItem"),
    is_active: checkbox(formData, "isActive"),
    stackable,
    max_stack: maxStack,
    reference_value: referenceValue,
    is_usable: isUsable,
    use_behaviour: useBehaviour,
    max_charges: maxCharges,
    target_mode: targetMode,
    cooldown_minutes: cooldownMinutes,
    container_capacity: containerCapacity,
    sort_order: integer(formData, "sortOrder", 0) ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function createSubcategory(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const categoryId = requiredText(formData, "categoryId", "Core category");
    const name = requiredText(formData, "name", "Subcategory name");
    const slug = slugify(optionalText(formData, "slug") ?? name);

    if (!isUuid(categoryId) || !slug) throw new Error("Invalid subcategory.");

    const { error } = await supabase.from("item_subcategories").insert({
      category_id: categoryId,
      name,
      slug,
      description: optionalText(formData, "description") ?? "",
      sort_order: integer(formData, "sortOrder", 0) ?? 0,
      is_active: checkbox(formData, "isActive"),
    });

    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to create subcategory.");
  }

  refresh();
}

export async function updateSubcategory(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const id = requiredText(formData, "subcategoryId", "Subcategory");
    if (!isUuid(id)) throw new Error("Invalid subcategory.");

    const categoryId = requiredText(formData, "categoryId", "Core category");
    const name = requiredText(formData, "name", "Subcategory name");
    const slug = slugify(optionalText(formData, "slug") ?? name);

    const { error } = await supabase
      .from("item_subcategories")
      .update({
        category_id: categoryId,
        name,
        slug,
        description: optionalText(formData, "description") ?? "",
        sort_order: integer(formData, "sortOrder", 0) ?? 0,
        is_active: checkbox(formData, "isActive"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to update subcategory.");
  }

  refresh();
}

export async function deleteSubcategory(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const id = requiredText(formData, "subcategoryId", "Subcategory");
    if (!isUuid(id)) throw new Error("Invalid subcategory.");

    const { error } = await supabase
      .from("item_subcategories")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to delete subcategory.");
  }

  refresh();
}

export async function createItem(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const values = await itemValues(formData);
    const { error } = await supabase.from("items").insert(values);
    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to create item.");
  }

  refresh();
}

export async function updateItem(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const itemId = requiredText(formData, "itemId", "Item");
    if (!isUuid(itemId)) throw new Error("Invalid item.");

    const values = await itemValues(formData);
    const { error } = await supabase.from("items").update(values).eq("id", itemId);
    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to update item.");
  }

  refresh();
}

export async function deleteItem(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const itemId = requiredText(formData, "itemId", "Item");
    if (!isUuid(itemId)) throw new Error("Invalid item.");

    const [standardResult, instanceResult] = await Promise.all([
      supabase
        .from("character_items")
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId),
      supabase
        .from("character_item_instances")
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId),
    ]);

    const countError = standardResult.error ?? instanceResult.error;
    if (countError) throw new Error(countError.message);

    const ownedCount = (standardResult.count ?? 0) + (instanceResult.count ?? 0);
    if (ownedCount > 0) {
      throw new Error(
        `This item is already represented in ${ownedCount} inventory record${
          ownedCount === 1 ? "" : "s"
        }. Deactivate it instead of deleting it.`,
      );
    }

    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to delete item.");
  }

  refresh();
}

function effectValues(formData: FormData) {
  const triggerType = requiredText(formData, "triggerType", "Trigger");
  if (!TRIGGER_TYPES.includes(triggerType as (typeof TRIGGER_TYPES)[number])) {
    throw new Error("Invalid effect trigger.");
  }

  const effectMode =
    triggerType === "use"
      ? requiredText(formData, "effectMode", "Effect mode")
      : "passive";

  if (triggerType === "use" && !["instant", "temporary"].includes(effectMode)) {
    throw new Error("Use effects must be Instant or Temporary.");
  }

  const durationMinutes =
    effectMode === "temporary"
      ? integer(formData, "durationMinutes", null)
      : null;

  if (effectMode === "temporary" && (durationMinutes === null || durationMinutes < 1)) {
    throw new Error("Temporary effects need a duration greater than 0 minutes.");
  }

  const mod = (name: string, label: string) => {
    const value = integer(formData, name, 0) ?? 0;
    if (value < -100 || value > 100) {
      throw new Error(`${label} modifier must be between -100 and 100.`);
    }
    return value;
  };

  const instantUse = triggerType === "use" && effectMode === "instant";

  return {
    trigger_type: triggerType,
    effect_mode: effectMode,
    duration_minutes: durationMinutes,
    muscles_modifier: instantUse ? 0 : mod("musclesModifier", "Muscles"),
    reflexes_modifier: instantUse ? 0 : mod("reflexesModifier", "Reflexes"),
    vigour_modifier: instantUse ? 0 : mod("vigourModifier", "Vigour"),
    shrewd_modifier: instantUse ? 0 : mod("shrewdModifier", "Shrewd"),
    brains_modifier: instantUse ? 0 : mod("brainsModifier", "Brains"),
    presence_modifier: instantUse ? 0 : mod("presenceModifier", "Presence"),
    health_delta: triggerType === "use" ? mod("healthDelta", "Health") : 0,
    max_health_modifier: instantUse ? 0 : mod("maxHealthModifier", "Maximum Health"),
    allow_duplicate_stacking: checkbox(formData, "allowDuplicateStacking"),
    sort_order: integer(formData, "sortOrder", 0) ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function createItemEffect(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const itemId = requiredText(formData, "itemId", "Item");
    if (!isUuid(itemId)) throw new Error("Invalid item.");

    const { error } = await supabase.from("item_effects").insert({
      item_id: itemId,
      ...effectValues(formData),
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to create item effect.");
  }

  refresh();
}

export async function updateItemEffect(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const effectId = requiredText(formData, "effectId", "Effect");
    if (!isUuid(effectId)) throw new Error("Invalid item effect.");

    const { error } = await supabase
      .from("item_effects")
      .update(effectValues(formData))
      .eq("id", effectId);

    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to update item effect.");
  }

  refresh();
}

export async function deleteItemEffect(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const effectId = requiredText(formData, "effectId", "Effect");
    if (!isUuid(effectId)) throw new Error("Invalid item effect.");

    const { error } = await supabase
      .from("item_effects")
      .delete()
      .eq("id", effectId);

    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to delete item effect.");
  }

  refresh();
}
