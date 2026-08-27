"use server";



import { redirect } from "next/navigation";
import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const QUALITIES = ["poor", "average", "fine", "superior", "flawless", "peerless"] as const;
const TRANSFER_POLICIES = ["free", "restricted", "bound"] as const;
const USE_BEHAVIOURS = ["reusable", "consumable", "limited_charges"] as const;
const TARGET_MODES = ["self", "other", "either"] as const;
const RESOLUTION_MODES = ["automatic", "fixed", "opposed"] as const;
const COUNTER_OPTIONS = [
  "dodge",
  "defend",
  "resist_vigour",
  "resist_shrewd",
  "resist_brains",
  "resist_presence",
] as const;
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
  revalidatePath("/crafting");
  revalidatePath("/admin/crafting-recipes");
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
type NewRecipeIngredient = {
  itemId: string;
  quantity: number;
  sortOrder: number;
};

type NewRecipeBundle = {
  resultQuantity: number;
  recipeDocumentReferenceValue: number | null;
  bookCategoryId: string;
  ingredients: NewRecipeIngredient[];
};

async function newRecipeBundleValues(
  formData: FormData,
): Promise<NewRecipeBundle | null> {
  if (!checkbox(formData, "alsoCreateRecipe")) {
    return null;
  }

  const rawResultQuantity =
    integer(
      formData,
      "craftingResultQuantity",
      1,
    );

  if (
    rawResultQuantity === null ||
    rawResultQuantity < 1
  ) {
    throw new Error(
      "Crafted result quantity must be at least 1.",
    );
  }

  const recipeDocumentReferenceValue =
    integer(
      formData,
      "recipeDocumentReferenceValue",
      null,
    );

  if (
    recipeDocumentReferenceValue !== null &&
    recipeDocumentReferenceValue < 0
  ) {
    throw new Error(
      "Recipe document reference value cannot be negative.",
    );
  }

  const itemIds =
    formData
      .getAll(
        "craftingIngredientItemId",
      )
      .map(
        (value) =>
          typeof value === "string"
            ? value.trim()
            : "",
      );

  const quantities =
    formData
      .getAll(
        "craftingIngredientQuantity",
      )
      .map(
        (value) =>
          typeof value === "string"
            ? value.trim()
            : "",
      );

  const ingredients:
    NewRecipeIngredient[] = [];

  for (
    let index = 0;
    index < itemIds.length;
    index += 1
  ) {
    const itemId =
      itemIds[index] ?? "";

    const rawQuantity =
      quantities[index] ?? "";

    if (
      !itemId &&
      !rawQuantity
    ) {
      continue;
    }

    if (!isUuid(itemId)) {
      throw new Error(
        `Crafting ingredient ${index + 1} is invalid.`,
      );
    }

    const parsedQuantity =
      Number.parseInt(
        rawQuantity,
        10,
      );

    if (
      !Number.isFinite(
        parsedQuantity,
      ) ||
      parsedQuantity < 1
    ) {
      throw new Error(
        `Crafting ingredient ${index + 1} quantity must be at least 1.`,
      );
    }

    ingredients.push({
      itemId,
      quantity:
        parsedQuantity,
      sortOrder: index,
    });
  }

  if (!ingredients.length) {
    throw new Error(
      "A crafting recipe needs at least one Ingredient.",
    );
  }

  const uniqueIds =
    new Set(
      ingredients.map(
        (ingredient) =>
          ingredient.itemId,
      ),
    );

  if (
    uniqueIds.size !==
    ingredients.length
  ) {
    throw new Error(
      "The same crafting Ingredient cannot be added twice. Increase its quantity instead.",
    );
  }

  const supabase =
    await createClient();

  const [
    ingredientCategoryResult,
    bookCategoryResult,
    ingredientItemsResult,
  ] = await Promise.all([
    supabase
      .from("item_categories")
      .select("id")
      .eq(
        "slug",
        "ingredient",
      )
      .maybeSingle(),

    supabase
      .from("item_categories")
      .select("id")
      .eq(
        "slug",
        "book-document",
      )
      .maybeSingle(),

    supabase
      .from("items")
      .select(
        "id, category_id",
      )
      .in(
        "id",
        [...uniqueIds],
      ),
  ]);

  if (
    ingredientCategoryResult.error ||
    !ingredientCategoryResult.data
  ) {
    throw new Error(
      "The Ingredient Item category could not be found.",
    );
  }

  const ingredientCategoryId =
    ingredientCategoryResult.data.id;

  if (
    bookCategoryResult.error ||
    !bookCategoryResult.data
  ) {
    throw new Error(
      "The Book / Document Item category could not be found.",
    );
  }

  if (
    ingredientItemsResult.error
  ) {
    throw new Error(
      ingredientItemsResult.error.message,
    );
  }

  if (
    (ingredientItemsResult.data ?? [])
      .length !==
    uniqueIds.size
  ) {
    throw new Error(
      "One or more crafting Ingredients could not be found.",
    );
  }

  if (
    (ingredientItemsResult.data ?? [])
      .some(
        (item) =>
          item.category_id !==
          ingredientCategoryId,
      )
  ) {
    throw new Error(
      "Only Items in the Ingredient category can be used in a crafting recipe.",
    );
  }

  return {
    resultQuantity:
      rawResultQuantity,
    recipeDocumentReferenceValue,
    bookCategoryId:
      bookCategoryResult.data.id,
    ingredients,
  };
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

  const teachesRecipeId =
    optionalText(
      formData,
      "teachesRecipeId",
    );

  if (
    teachesRecipeId &&
    !isUuid(teachesRecipeId)
  ) {
    throw new Error(
      "Invalid crafting recipe.",
    );
  }

  if (teachesRecipeId) {
    const supabase =
      await createClient();

    const {
      data: recipe,
      error: recipeError,
    } = await supabase
      .from("crafting_recipes")
      .select("id")
      .eq("id", teachesRecipeId)
      .maybeSingle();

    if (
      recipeError ||
      !recipe
    ) {
      throw new Error(
        "The selected crafting recipe could not be found.",
      );
    }
  }

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

  const resolutionMode =
    requiredText(formData, "resolutionMode", "Resolution mode");

  if (
    !RESOLUTION_MODES.includes(
      resolutionMode as (typeof RESOLUTION_MODES)[number],
    )
  ) {
    throw new Error("Invalid Resolution Mode.");
  }

  let isUsable =
    checkbox(formData, "isUsable");

let useBehaviour: string | null = null;
let targetMode: string | null = null;
let maxCharges: number | null = null;
let cooldownMinutes: number | null = null;

if (isUsable) {
  if (resolutionMode === "opposed") {
    targetMode = "other";
  } else {
    targetMode = requiredText(
      formData,
      "targetMode",
      "Target mode",
    );

    if (
      !TARGET_MODES.includes(
        targetMode as (typeof TARGET_MODES)[number],
      )
    ) {
      throw new Error("Invalid target mode.");
    }
  }

    useBehaviour = requiredText(formData, "useBehaviour", "Use behaviour");

    if (!USE_BEHAVIOURS.includes(useBehaviour as (typeof USE_BEHAVIOURS)[number])) {
      throw new Error("Invalid use behaviour.");
    }

    cooldownMinutes = integer(formData, "cooldownMinutes", null);
    if (cooldownMinutes !== null && cooldownMinutes < 0) {
      throw new Error("Cooldown cannot be negative.");
    }

    if (useBehaviour === "limited_charges") {
      if (stackable) {
        throw new Error(
          "Limited-charge Items cannot be Stackable because each copy needs its own charge state.",
        );
      }

      maxCharges = integer(formData, "maxCharges", null);
      if (maxCharges === null || maxCharges < 1) {
        throw new Error("Limited-charge items need at least 1 charge.");
      }
    }
  }

  if (teachesRecipeId) {
    isUsable = true;
    useBehaviour = "consumable";
    targetMode = "self";
    maxCharges = null;
    cooldownMinutes = null;
  }

  const referenceValue = integer(formData, "referenceValue", null);
  if (referenceValue !== null && referenceValue < 0) {
    throw new Error("Reference value cannot be negative.");
  }

  /*
   * RESOLUTION / SUCCESS MECHANICS
   *
   * automatic = no roll required.
   * fixed     = die + optional Attribute vs Admin threshold.
   * opposed   = die + optional Attribute vs the target's chosen Counter.
   */
  const rawCounterOptions = formData
    .getAll("counterOptions")
    .filter((value): value is string => typeof value === "string");

  const counterOptions = [
    ...new Set(
      rawCounterOptions.filter((value) =>
        COUNTER_OPTIONS.includes(
          value as (typeof COUNTER_OPTIONS)[number],
        ),
      ),
    ),
  ];

  if (rawCounterOptions.length !== counterOptions.length) {
    throw new Error("Invalid Counter option.");
  }

  let successDie: number | null = null;
  let successThreshold: number | null = null;
  let successAttribute: string | null = null;

  if (resolutionMode !== "automatic") {
    const rawSuccessDie = requiredText(
      formData,
      "successDie",
      "Success Die",
    );
    const parsedSuccessDie = Number.parseInt(rawSuccessDie, 10);

    if (![4, 6, 8, 10, 12, 20, 100].includes(parsedSuccessDie)) {
      throw new Error("Invalid Success Die.");
    }

    successDie = parsedSuccessDie;

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

    if (resolutionMode === "fixed") {
      successThreshold = integer(formData, "successThreshold", 0);

      if (successThreshold === null || successThreshold < 1) {
        throw new Error(
          "Fixed DC Items need a Success Threshold of at least 1.",
        );
      }
    }

    if (
      resolutionMode === "opposed" &&
      counterOptions.length === 0
    ) {
      throw new Error(
        "Opposed Items need at least one allowed Counter.",
      );
    }
  }

  if (
    isUsable &&
    resolutionMode === "opposed" &&
    targetMode !== "other"
  ) {
    targetMode = "other";
  }

  const damageDice = optionalText(formData, "damageDice");

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
      throw new Error("An Item cannot roll more than 20 damage dice.");
    }
  }

  const damageType = damageDice
    ? optionalText(formData, "damageType") ?? "Damage"
    : null;

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
    success_die: successDie,
    success_threshold: successThreshold,
    success_attribute: successAttribute,
    resolution_mode: resolutionMode,
    counter_options: counterOptions,
    damage_dice: damageDice,
    damage_type: damageType,
    container_capacity: containerCapacity,
    teaches_recipe_id: teachesRecipeId,
    sort_order: integer(formData, "sortOrder", 0) ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function createSubcategory(formData: FormData) {
  await requireAdminSection("items");
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
  await requireAdminSection("items");
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
  await requireAdminSection("items");
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
  await requireAdminSection("items");
  const supabase = await createClient();

  let createdItemId:
    string | null = null;

  let createdRecipeId:
    string | null = null;

  try {
    const values =
      await itemValues(formData);

    const recipeBundle =
      await newRecipeBundleValues(
        formData,
      );

    const {
      data: createdItem,
      error: itemError,
    } = await supabase
      .from("items")
      .insert(values)
      .select(
        "id, name, slug, description, image_url, is_active, sort_order",
      )
      .single();

    if (
      itemError ||
      !createdItem
    ) {
      throw new Error(
        itemError?.message ??
          "Unable to create Item.",
      );
    }

    createdItemId =
      createdItem.id;

    if (recipeBundle) {
      const {
        data: recipe,
        error: recipeError,
      } = await supabase
        .from(
          "crafting_recipes",
        )
        .insert({
          name:
            createdItem.name,
          slug:
            `craft-${createdItem.slug}`,
          description:
            createdItem.description ??
            "",
          result_item_id:
            createdItem.id,
          result_quantity:
            recipeBundle.resultQuantity,
          is_active:
            createdItem.is_active,
          sort_order:
            createdItem.sort_order ??
            0,
        })
        .select("id")
        .single();

      if (
        recipeError ||
        !recipe
      ) {
        throw new Error(
          recipeError?.message ??
            "Unable to create crafting recipe.",
        );
      }

      createdRecipeId =
        recipe.id;

      const {
        error:
          ingredientsError,
      } = await supabase
        .from(
          "crafting_recipe_ingredients",
        )
        .insert(
          recipeBundle.ingredients.map(
            (ingredient) => ({
              recipe_id:
                recipe.id,
              ingredient_item_id:
                ingredient.itemId,
              quantity:
                ingredient.quantity,
              sort_order:
                ingredient.sortOrder,
            }),
          ),
        );

      if (
        ingredientsError
      ) {
        throw new Error(
          ingredientsError.message,
        );
      }

      const {
        error:
          recipeItemError,
      } = await supabase
        .from("items")
        .insert({
          name:
            `Recipe: ${createdItem.name}`,
          slug:
            `recipe-${createdItem.slug}`,
          description:
            createdItem.description ??
            "",
          image_url:
            createdItem.image_url,
          category_id:
            recipeBundle.bookCategoryId,
          subcategory_id:
            null,
          quality:
            "average",
          transfer_policy:
            "free",
          is_quest_item:
            false,
          is_active:
            createdItem.is_active,
          stackable:
            true,
          max_stack:
            99,
          reference_value:
            recipeBundle.recipeDocumentReferenceValue,
          is_usable:
            true,
          use_behaviour:
            "consumable",
          max_charges:
            null,
          target_mode:
            "self",
          cooldown_minutes:
            null,
          success_die:
            null,
          success_threshold:
            null,
          success_attribute:
            null,
          resolution_mode:
            "automatic",
          counter_options:
            [],
          damage_dice:
            null,
          damage_type:
            null,
          container_capacity:
            null,
          teaches_recipe_id:
            recipe.id,
          sort_order:
            createdItem.sort_order ??
            0,
        });

      if (
        recipeItemError
      ) {
        throw new Error(
          recipeItemError.message,
        );
      }
    }
  } catch (error) {
    if (createdRecipeId) {
      await supabase
        .from(
          "crafting_recipes",
        )
        .delete()
        .eq(
          "id",
          createdRecipeId,
        );
    }

    if (createdItemId) {
      await supabase
        .from("items")
        .delete()
        .eq(
          "id",
          createdItemId,
        );
    }

    fail(
      error instanceof Error
        ? error.message
        : "Unable to create item.",
    );
  }

  refresh();
}

export async function updateItem(formData: FormData) {
  await requireAdminSection("items");
  const supabase = await createClient();

  try {
    const itemId = requiredText(formData, "itemId", "Item");
    if (!isUuid(itemId)) throw new Error("Invalid item.");

    const values = await itemValues(formData);

    if (values.stackable) {
      const {
        data: existingItem,
        error: existingItemError,
      } = await supabase
        .from("items")
        .select("is_equippable")
        .eq("id", itemId)
        .maybeSingle();

      if (existingItemError || !existingItem) {
        throw new Error(
          existingItemError?.message ?? "Unable to verify Item equipment state.",
        );
      }

      if (existingItem.is_equippable) {
        throw new Error(
          "Equippable Items cannot be Stackable. Disable Equippable first.",
        );
      }
    }

    const { error } = await supabase.from("items").update(values).eq("id", itemId);
    if (error) throw new Error(error.message);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Unable to update item.");
  }

  refresh();
}

export async function deleteItem(formData: FormData) {
  await requireAdminSection("items");
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
    warping_affinity_modifier: instantUse ? 0 : Math.max(0, Math.min(8, integer(formData, "warpingAffinityModifier", 0) ?? 0)),
    warps_per_day_modifier: instantUse ? 0 : Math.max(0, Math.min(10, integer(formData, "warpsPerDayModifier", 0) ?? 0)),
    allow_duplicate_stacking: checkbox(formData, "allowDuplicateStacking"),
    sort_order: integer(formData, "sortOrder", 0) ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function createItemEffect(formData: FormData) {
  await requireAdminSection("items");
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
  await requireAdminSection("items");
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
  await requireAdminSection("items");
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
