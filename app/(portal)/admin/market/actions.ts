"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function integer(formData: FormData, key: string, minimum = 0) {
  const value = Number(text(formData, key));
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${key} must be a whole number of at least ${minimum}.`);
  }
  return value;
}

function optionalInteger(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${key} must be a whole number of at least 0.`);
  }
  return value;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function refreshMarket() {
  revalidatePath("/admin/market");
  revalidatePath("/market");
}

export async function createMarketShop(formData: FormData) {
  await requireStaff();

  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  const description = text(formData, "description");
  const imageUrl = text(formData, "imageUrl") || null;
  const sortOrder = integer(formData, "sortOrder");
  const isActive = checkbox(formData, "isActive");

  if (name.length < 2 || !slug) {
    throw new Error("Shop name is required.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("market_shops").insert({
    name,
    slug,
    description,
    image_url: imageUrl,
    is_active: isActive,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("A Market shop with this slug already exists.");
    }
    throw new Error(error.message);
  }

  refreshMarket();
}

export async function updateMarketShop(formData: FormData) {
  await requireStaff();

  const shopId = text(formData, "shopId");
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  const description = text(formData, "description");
  const imageUrl = text(formData, "imageUrl") || null;
  const sortOrder = integer(formData, "sortOrder");
  const isActive = checkbox(formData, "isActive");

  if (!shopId) throw new Error("Shop is required.");
  if (name.length < 2 || !slug) throw new Error("Shop name is required.");

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("market_shops")
    .update({
      name,
      slug,
      description,
      image_url: imageUrl,
      is_active: isActive,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A Market shop with this slug already exists.");
    }
    throw new Error(error.message);
  }

  refreshMarket();
  revalidatePath(`/market/${slug}`);
}

export async function createMarketListing(formData: FormData) {
  await requireStaff();

  const shopId = text(formData, "shopId");
  const itemId = text(formData, "itemId");
  const buyPrice = integer(formData, "buyPrice");
  const sellPrice = optionalInteger(formData, "sellPrice");
  const stockMode = text(formData, "stockMode");
  const stockQuantity =
    stockMode === "finite"
      ? integer(formData, "stockQuantity")
      : null;
  const sortOrder = integer(formData, "sortOrder");
  const isActive = checkbox(formData, "isActive");

  if (!shopId || !itemId) {
    throw new Error("Shop and Item are required.");
  }

  if (!["finite", "unlimited"].includes(stockMode)) {
    throw new Error("Invalid stock mode.");
  }

  const supabase = createAdminClient();

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, name, is_active")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) throw new Error(itemError.message);
  if (!item) throw new Error("Item not found.");
  if (!item.is_active) {
    throw new Error("Inactive Items cannot be added to Market stock.");
  }

  const { error } = await supabase.from("market_listings").insert({
    shop_id: shopId,
    item_id: itemId,
    buy_price: buyPrice,
    sell_price: sellPrice,
    stock_mode: stockMode,
    stock_quantity: stockQuantity,
    is_active: isActive,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("This Item is already listed in this shop.");
    }
    throw new Error(error.message);
  }

  refreshMarket();
}

export async function updateMarketListing(formData: FormData) {
  await requireStaff();

  const listingId = text(formData, "listingId");
  const buyPrice = integer(formData, "buyPrice");
  const sellPrice = optionalInteger(formData, "sellPrice");
  const stockMode = text(formData, "stockMode");
  const stockQuantity =
    stockMode === "finite"
      ? integer(formData, "stockQuantity")
      : null;
  const sortOrder = integer(formData, "sortOrder");
  const isActive = checkbox(formData, "isActive");

  if (!listingId) throw new Error("Listing is required.");

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("market_listings")
    .update({
      buy_price: buyPrice,
      sell_price: sellPrice,
      stock_mode: stockMode,
      stock_quantity: stockQuantity,
      is_active: isActive,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  refreshMarket();
}

export async function deactivateMarketListing(formData: FormData) {
  await requireStaff();

  const listingId = text(formData, "listingId");
  if (!listingId) throw new Error("Listing is required.");

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("market_listings")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  refreshMarket();
}
