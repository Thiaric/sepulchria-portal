"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
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

function integer(formData: FormData, name: string, fallback: number | null = 0) {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function nullableBoolean(formData: FormData, name: string) {
  const value = optionalText(formData, name);
  if (!value || value === "inherit") return null;
  if (value === "yes") return true;
  if (value === "no") return false;
  throw new Error("Invalid boolean override.");
}

function returnPath(formData: FormData) {
  const value = optionalText(formData, "returnTo");
  return value && value.startsWith("/admin/")
    ? value
    : "/admin/items/vault";
}

function fail(formData: FormData, message: string): never {
  if (formData.get("liveAction") === "1") {
    throw new Error(message);
  }

  const params = new URLSearchParams();
  params.set("error", message);
  redirect(`${returnPath(formData)}?${params.toString()}`);
}

function refreshCharacter(characterId: string) {
  revalidatePath(`/admin/characters/${characterId}`);
  revalidatePath(`/admin/characters/${characterId}/inventory`);
  revalidatePath("/character");
  revalidatePath("/characters");
}

function refreshVault() {
  revalidatePath("/admin/items/vault");
  revalidatePath("/admin/items");
}

async function getItem(itemId: string) {
  if (!isUuid(itemId)) throw new Error("Invalid Item.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(`
      id,
      name,
      stackable,
      max_stack,
      use_behaviour,
      max_charges,
      category:item_categories(slug)
    `)
    .eq("id", itemId)
    .maybeSingle();

  if (error || !data) throw new Error("Item not found.");

  const category = Array.isArray(data.category)
    ? data.category[0] ?? null
    : data.category;

  return {
    ...data,
    categorySlug: category?.slug ?? null,
  };
}

function uniqueOverrides(formData: FormData) {
  const quality = optionalText(formData, "qualityOverride");
  if (
    quality &&
    !["poor", "average", "fine", "superior", "flawless", "peerless"].includes(quality)
  ) {
    throw new Error("Invalid quality override.");
  }

  const transfer = optionalText(formData, "transferPolicyOverride");
  if (transfer && !["free", "restricted", "bound"].includes(transfer)) {
    throw new Error("Invalid transfer-policy override.");
  }

  return {
    custom_name: optionalText(formData, "customName"),
    custom_description: optionalText(formData, "customDescription"),
    custom_image_url: optionalText(formData, "customImageUrl"),
    quality_override: quality,
    transfer_policy_override: transfer,
    is_quest_item_override: nullableBoolean(formData, "questOverride"),
    notes: optionalText(formData, "notes"),
  };
}

export async function grantStandardItem(formData: FormData) {
  const staff = await requireStaff();
  const supabase = await createClient();

  let characterId = "";

  try {
    characterId = requiredText(formData, "characterId", "Character");
    const itemId = requiredText(formData, "itemId", "Item");

    if (!isUuid(characterId)) throw new Error("Invalid character.");

    const item = await getItem(itemId);

    

    const quantity = integer(formData, "quantity", 1) ?? 1;
    if (quantity < 1 || quantity > 9999) {
      throw new Error("Quantity must be between 1 and 9999.");
    }

    const containerId = optionalText(formData, "containerInstanceId");
    if (containerId && !isUuid(containerId)) {
      throw new Error("Invalid container.");
    }

    if (item.categorySlug === "container") {
      if (containerId) {
        throw new Error(
          "A Container cannot be granted inside another Container from this panel.",
        );
      }

      for (let index = 0; index < quantity; index += 1) {
        const { error } = await supabase
          .from("character_item_instances")
          .insert({
            item_id: itemId,
            owner_character_id: characterId,
            charges_remaining:
              item.use_behaviour === "limited_charges"
                ? item.max_charges
                : null,
            vault_status: "owned",
            acquisition_source: "staff",
            assigned_by: staff.userId,
          });

        if (error) throw new Error(error.message);
      }
    } else if (!item.stackable) {
      const rows = Array.from({ length: quantity }).map(() => ({
        character_id: characterId,
        item_id: itemId,
        quantity: 1,
        container_instance_id: containerId,
        acquisition_source: "staff",
        assigned_by: staff.userId,
      }));

      const { error } = await supabase.from("character_items").insert(rows);
      if (error) throw new Error(error.message);
    } else {
      let existingQuery = supabase
        .from("character_items")
        .select("id, quantity")
        .eq("character_id", characterId)
        .eq("item_id", itemId);

      existingQuery = containerId
        ? existingQuery.eq("container_instance_id", containerId)
        : existingQuery.is("container_instance_id", null);

      const { data: existing, error: existingError } =
        await existingQuery.order("acquired_at", { ascending: true });

      if (existingError) throw new Error(existingError.message);

      let remaining = quantity;

      for (const row of existing ?? []) {
        if (remaining <= 0) break;

        if (item.max_stack === null) {
          const { error } = await supabase
            .from("character_items")
            .update({ quantity: row.quantity + remaining })
            .eq("id", row.id);

          if (error) throw new Error(error.message);
          remaining = 0;
          break;
        }

        const free = Math.max(0, item.max_stack - row.quantity);
        if (!free) continue;

        const add = Math.min(free, remaining);

        const { error } = await supabase
          .from("character_items")
          .update({ quantity: row.quantity + add })
          .eq("id", row.id);

        if (error) throw new Error(error.message);
        remaining -= add;
      }

      while (remaining > 0) {
        const stackSize =
          item.max_stack === null
            ? remaining
            : Math.min(item.max_stack, remaining);

        const { error } = await supabase.from("character_items").insert({
          character_id: characterId,
          item_id: itemId,
          quantity: stackSize,
          container_instance_id: containerId,
          acquisition_source: "staff",
          assigned_by: staff.userId,
        });

        if (error) throw new Error(error.message);
        remaining -= stackSize;
      }
    }

    if (item.categorySlug !== "container") {
      const { error: normalizeError } = await supabase.rpc(
        "normalize_character_inventory_stacks_staff",
        {
          p_character_id: characterId,
        },
      );

      if (normalizeError) {
        throw new Error(
          "Item granted, but stacks could not be consolidated: " +
            normalizeError.message,
        );
      }
    }
  } catch (error) {
    fail(
      formData,
      error instanceof Error ? error.message : "Unable to grant Item.",
    );
  }

  refreshCharacter(characterId);
}

export async function removeStandardItem(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  let characterId = "";

  try {
    const rowId = requiredText(formData, "rowId", "Inventory record");
    if (!isUuid(rowId)) throw new Error("Invalid Inventory record.");

    const { data: row, error } = await supabase
      .from("character_items")
      .select("character_id, quantity")
      .eq("id", rowId)
      .maybeSingle();

    if (error || !row) throw new Error("Inventory record not found.");

    characterId = row.character_id;
    const quantity = integer(formData, "quantity", 1) ?? 1;

    if (quantity < 1) throw new Error("Removal quantity must be at least 1.");

    if (quantity >= row.quantity) {
      const { error: deleteError } = await supabase
        .from("character_items")
        .delete()
        .eq("id", rowId);

      if (deleteError) throw new Error(deleteError.message);
    } else {
      const { error: updateError } = await supabase
        .from("character_items")
        .update({ quantity: row.quantity - quantity })
        .eq("id", rowId);

      if (updateError) throw new Error(updateError.message);
    }

    const { error: normalizeError } = await supabase.rpc(
      "normalize_character_inventory_stacks_staff",
      {
        p_character_id: characterId,
      },
    );

    if (normalizeError) {
      throw new Error(
        "Item removed, but remaining stacks could not be consolidated: " +
          normalizeError.message,
      );
    }
  } catch (error) {
    fail(
      formData,
      error instanceof Error ? error.message : "Unable to remove Item.",
    );
  }

  refreshCharacter(characterId);
}

export async function moveStandardItem(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  let characterId = "";

  try {
    const rowId = requiredText(formData, "rowId", "Inventory record");
    if (!isUuid(rowId)) throw new Error("Invalid Inventory record.");

    const { data: row, error } = await supabase
      .from("character_items")
      .select("character_id")
      .eq("id", rowId)
      .maybeSingle();

    if (error || !row) throw new Error("Inventory record not found.");
    characterId = row.character_id;

    const containerId = optionalText(formData, "containerInstanceId");
    if (containerId && !isUuid(containerId)) {
      throw new Error("Invalid container.");
    }

    const { error: updateError } = await supabase
      .from("character_items")
      .update({ container_instance_id: containerId })
      .eq("id", rowId);

    if (updateError) throw new Error(updateError.message);
  } catch (error) {
    fail(
      formData,
      error instanceof Error ? error.message : "Unable to move Item.",
    );
  }

  refreshCharacter(characterId);
}

export async function createUniqueItemForCharacter(formData: FormData) {
  const staff = await requireStaff();
  const supabase = await createClient();

  let characterId = "";

  try {
    characterId = requiredText(formData, "characterId", "Character");
    const itemId = requiredText(formData, "itemId", "Item");

    if (!isUuid(characterId)) throw new Error("Invalid character.");

    const item = await getItem(itemId);
    const containerId = optionalText(formData, "containerInstanceId");

    if (containerId && !isUuid(containerId)) {
      throw new Error("Invalid container.");
    }

    const { data: instance, error } = await supabase
      .from("character_item_instances")
      .insert({
        item_id: itemId,
        owner_character_id: characterId,
        ...uniqueOverrides(formData),
        charges_remaining:
          item.use_behaviour === "limited_charges" ? item.max_charges : null,
        container_instance_id: containerId,
        vault_status: "owned",
        acquisition_source: "staff",
        assigned_by: staff.userId,
      })
      .select("id")
      .single();

    if (error || !instance) {
      throw new Error(error?.message ?? "Unique Item could not be created.");
    }

    const { error: historyError } = await supabase
      .from("item_instance_history")
      .insert({
        item_instance_id: instance.id,
        to_character_id: characterId,
        actor_user_id: staff.userId,
        event_type: "created_and_granted",
        details: "Created as an individual Item instance and granted by staff.",
      });

    if (historyError) throw new Error(historyError.message);
  } catch (error) {
    fail(
      formData,
      error instanceof Error ? error.message : "Unable to create Unique Item.",
    );
  }

  refreshCharacter(characterId);
  refreshVault();
}

export async function updateUniqueItem(formData: FormData) {
  const staff = await requireStaff();
  const supabase = await createClient();

  let characterId = "";

  try {
    const instanceId = requiredText(formData, "instanceId", "Unique Item");
    if (!isUuid(instanceId)) throw new Error("Invalid Unique Item.");

    const { data: current, error } = await supabase
      .from("character_item_instances")
      .select("owner_character_id")
      .eq("id", instanceId)
      .maybeSingle();

    if (error || !current?.owner_character_id) {
      throw new Error("Owned Unique Item not found.");
    }

    characterId = current.owner_character_id;

    const containerId = optionalText(formData, "containerInstanceId");
    if (containerId && !isUuid(containerId)) {
      throw new Error("Invalid container.");
    }

    const { error: updateError } = await supabase
      .from("character_item_instances")
      .update({
        ...uniqueOverrides(formData),
        container_instance_id: containerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceId);

    if (updateError) throw new Error(updateError.message);

    await supabase.from("item_instance_history").insert({
      item_instance_id: instanceId,
      actor_user_id: staff.userId,
      event_type: "admin_updated",
      details: "Individual Item details were updated by staff.",
    });
  } catch (error) {
    fail(
      formData,
      error instanceof Error ? error.message : "Unable to update Unique Item.",
    );
  }

  refreshCharacter(characterId);
}

async function assertContainerEmpty(instanceId: string) {
  const supabase = await createClient();

  const [standardChildren, uniqueChildren] = await Promise.all([
    supabase
      .from("character_items")
      .select("id", { count: "exact", head: true })
      .eq("container_instance_id", instanceId),
    supabase
      .from("character_item_instances")
      .select("id", { count: "exact", head: true })
      .eq("container_instance_id", instanceId),
  ]);

  const error = standardChildren.error ?? uniqueChildren.error;
  if (error) throw new Error(error.message);

  const count = (standardChildren.count ?? 0) + (uniqueChildren.count ?? 0);

  if (count > 0) {
    throw new Error("Empty this container before moving or destroying it.");
  }
}

export async function sendUniqueItemToVault(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();
  let characterId = "";
  try {
    const instanceId = requiredText(formData, "instanceId", "Unique Item");
    if (!isUuid(instanceId)) throw new Error("Invalid Unique Item.");
    const { data, error } = await supabase.rpc("admin_vault_send_unique_item", { p_instance_id: instanceId });
    if (error) throw new Error(error.message);
    if (typeof data !== "string" || !isUuid(data)) throw new Error("Unable to identify the previous Item owner.");
    characterId = data;
  } catch (error) {
    fail(formData, error instanceof Error ? error.message : "Unable to move Unique Item.");
  }
  refreshCharacter(characterId);
  refreshVault();
}

export async function createUniqueItemInVault(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();
  try {
    const itemId = requiredText(formData, "itemId", "Item");
    if (!isUuid(itemId)) throw new Error("Invalid Item.");
    const o = uniqueOverrides(formData);
    const { error } = await supabase.rpc("admin_vault_create_unique_item", {
      p_item_id: itemId, p_custom_name: o.custom_name, p_custom_description: o.custom_description,
      p_custom_image_url: o.custom_image_url, p_quality_override: o.quality_override,
      p_transfer_policy_override: o.transfer_policy_override, p_is_quest_item_override: o.is_quest_item_override,
      p_notes: o.notes,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    fail(formData, error instanceof Error ? error.message : "Unable to create Vault Item.");
  }
  refreshVault();
}

export async function assignVaultItemToCharacter(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();
  let characterId = "";
  try {
    const instanceId = requiredText(formData, "instanceId", "Vault Item");
    characterId = requiredText(formData, "characterId", "Character");
    if (!isUuid(instanceId) || !isUuid(characterId)) throw new Error("Invalid Vault Item or character.");
    const { error } = await supabase.rpc("admin_vault_assign_unique_item", {
      p_instance_id: instanceId, p_character_id: characterId,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    fail(formData, error instanceof Error ? error.message : "Unable to assign Vault Item.");
  }
  refreshCharacter(characterId);
  refreshVault();
}

export async function destroyVaultItem(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();

  try {
    const instanceId = requiredText(formData, "instanceId", "Vault Item");
    const reason = requiredText(formData, "destructionReason", "Destruction reason");

    if (!isUuid(instanceId)) throw new Error("Invalid Vault Item.");
    if (reason.length > 1000) {
      throw new Error("Destruction reason must be 1000 characters or fewer.");
    }

    const { error } = await supabase.rpc(
      "admin_vault_destroy_unique_item",
      {
        p_instance_id: instanceId,
        p_reason: reason,
      },
    );

    if (error) throw new Error(error.message);
  } catch (error) {
    fail(
      formData,
      error instanceof Error ? error.message : "Unable to destroy Vault Item.",
    );
  }

  refreshVault();
}
