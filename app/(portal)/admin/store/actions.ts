"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

const STORE_PATH = "/admin/store";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const value = str(formData, key);
  return value || null;
}

function intOrNull(formData: FormData, key: string) {
  const raw = str(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${key} must be a whole number.`);
  return value;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function refresh() {
  revalidatePath(STORE_PATH);
}

export async function createStoreProduct(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const category = str(formData, "category");
  const { error } = await admin.from("store_products").insert({
    slug: str(formData, "slug").toLowerCase(),
    name: str(formData, "name"),
    description: str(formData, "description"),
    image_url: nullableStr(formData, "image_url"),
    category,
    product_type: category === "bundle" ? "bundle" : "single",
    is_active: bool(formData, "is_active"),
    is_featured: bool(formData, "is_featured"),
    sort_order: intOrNull(formData, "sort_order") ?? 0,
  });

  if (error) throw new Error(`Unable to create store product: ${error.message}`);
  refresh();
}

export async function updateStoreProduct(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();
  const category = str(formData, "category");

  const { error } = await admin
    .from("store_products")
    .update({
      slug: str(formData, "slug").toLowerCase(),
      name: str(formData, "name"),
      description: str(formData, "description"),
      image_url: nullableStr(formData, "image_url"),
      category,
      product_type: category === "bundle" ? "bundle" : "single",
      is_active: bool(formData, "is_active"),
      is_featured: bool(formData, "is_featured"),
      sort_order: intOrNull(formData, "sort_order") ?? 0,
    })
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to update store product: ${error.message}`);
  refresh();
}

export async function deleteStoreProduct(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const { error } = await admin
    .from("store_products")
    .delete()
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to delete store product: ${error.message}`);
  refresh();
}

export async function saveStorePrice(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const productId = str(formData, "product_id");
  const currency = nullableStr(formData, "currency")?.toUpperCase() ?? null;
  const moneyAmountMinor = intOrNull(formData, "money_amount_minor");
  const remnantsAmount = intOrNull(formData, "remnants_amount");

  if (moneyAmountMinor === null && remnantsAmount === null) {
    throw new Error("Enter a real-money price, a Remnant price, or both.");
  }
  if (moneyAmountMinor !== null && !currency) {
    throw new Error("Currency is required for a real-money price.");
  }

  if (currency) {
    await admin.from("store_product_prices")
      .delete()
      .eq("product_id", productId)
      .eq("currency", currency);
  }

  if (remnantsAmount !== null) {
    await admin.from("store_product_prices")
      .delete()
      .eq("product_id", productId)
      .not("remnants_amount", "is", null);
  }

  const { error } = await admin.from("store_product_prices").insert({
    product_id: productId,
    currency,
    money_amount_minor: moneyAmountMinor,
    remnants_amount: remnantsAmount,
    paddle_price_id: nullableStr(formData, "paddle_price_id"),
    is_active: true,
  });

  if (error) throw new Error(`Unable to save store price: ${error.message}`);
  refresh();
}

export async function deleteStorePrice(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const { error } = await admin
    .from("store_product_prices")
    .delete()
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to delete store price: ${error.message}`);
  refresh();
}

export async function addStoreGrant(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const grantType = str(formData, "grant_type");
  const target = str(formData, "target");

  const row = {
    product_id: str(formData, "product_id"),
    grant_type: grantType,
    portal_skin_id: grantType === "portal_skin" ? target : null,
    cosmetic_item_id: grantType === "cosmetic" ? target : null,
    feature_key: grantType === "feature" ? target : null,
  };

  const { error } = await admin.from("store_product_grants").insert(row);
  if (error) throw new Error(`Unable to add product grant: ${error.message}`);
  refresh();
}

export async function deleteStoreGrant(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const { error } = await admin
    .from("store_product_grants")
    .delete()
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to remove product grant: ${error.message}`);
  refresh();
}

export async function createStoreDiscount(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const discountType = str(formData, "discount_type");
  const scopeType = str(formData, "scope_type");

  const { error } = await admin.from("store_discount_codes").insert({
    code: nullableStr(formData, "code")?.toUpperCase() ?? null,
    name: str(formData, "name"),
    description: str(formData, "description"),
    discount_type: discountType,
    discount_value: intOrNull(formData, "discount_value"),
    currency:
      discountType === "fixed_money"
        ? (nullableStr(formData, "currency")?.toUpperCase() ?? "GBP")
        : null,
    scope_type: scopeType,
    scope_category:
      scopeType === "category" ? nullableStr(formData, "scope_category") : null,
    max_redemptions: intOrNull(formData, "max_redemptions"),
    max_redemptions_per_user:
      intOrNull(formData, "max_redemptions_per_user") ?? 1,
    is_public: bool(formData, "is_public"),
    is_active: bool(formData, "is_active"),
    starts_at: nullableStr(formData, "starts_at"),
    ends_at: nullableStr(formData, "ends_at"),
  });

  if (error) throw new Error(`Unable to create discount: ${error.message}`);
  refresh();
}

export async function toggleStoreDiscount(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const { error } = await admin
    .from("store_discount_codes")
    .update({ is_active: str(formData, "next") === "true" })
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to update discount: ${error.message}`);
  refresh();
}
