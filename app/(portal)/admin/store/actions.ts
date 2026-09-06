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

function storeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function refresh() {
  revalidatePath(STORE_PATH);
}

function catalogueProductSlug(prefix: string, value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) {
    throw new Error(`Unable to build Store slug for ${prefix}.`);
  }

  return `${prefix}-${base}`;
}

export async function syncExistingPremiumCatalogueToStore() {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const [
    skinsResult,
    cosmeticsResult,
    musicResult,
  ] = await Promise.all([
    admin
      .from("portal_skins")
      .select(
        "id, slug, name, description, preview_image_url, is_default, is_active, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    admin
      .from("cosmetic_items")
      .select(
        "id, slug, name, description, category, preview_image_url, asset_url, is_active, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    admin
      .from("music_tracks")
      .select(
        "id, track_key, name, description, is_active, is_personal_selectable, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  for (const result of [
    skinsResult,
    cosmeticsResult,
    musicResult,
  ]) {
    if (result.error) {
      throw new Error(
        `Unable to read premium catalogue: ${result.error.message}`,
      );
    }
  }

  async function upsertProduct(input: {
    slug: string;
    name: string;
    description: string;
    imageUrl: string | null;
    category:
      | "skin"
      | "cosmetic"
      | "music"
      | "friend_list"
      | "private_location";
    isActive: boolean;
    sortOrder: number;
  }) {
    const { data, error } = await admin
      .from("store_products")
      .upsert(
        {
          slug: input.slug,
          name: input.name,
          description: input.description,
          image_url: input.imageUrl,
          product_type: "single",
          category: input.category,
          is_active: input.isActive,
          is_featured: false,
          sort_order: input.sortOrder,
        },
        {
          onConflict: "slug",
        },
      )
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `Unable to sync Store product "${input.name}": ${
          error?.message ?? "No product returned."
        }`,
      );
    }

    return String(data.id);
  }

  async function ensureGrant(input: {
    productId: string;
    grantType:
      | "portal_skin"
      | "cosmetic"
      | "music"
      | "feature";
    portalSkinId?: string;
    cosmeticItemId?: string;
    musicTrackId?: string;
    featureKey?: "friend_list" | "private_chat";
  }) {
    let query = admin
      .from("store_product_grants")
      .select("id")
      .eq("product_id", input.productId)
      .eq("grant_type", input.grantType);

    if (input.portalSkinId) {
      query = query.eq("portal_skin_id", input.portalSkinId);
    }

    if (input.cosmeticItemId) {
      query = query.eq("cosmetic_item_id", input.cosmeticItemId);
    }

    if (input.musicTrackId) {
      query = query.eq("music_track_id", input.musicTrackId);
    }

    if (input.featureKey) {
      query = query.eq("feature_key", input.featureKey);
    }

    const { data: existing, error: existingError } =
      await query.maybeSingle();

    if (existingError) {
      throw new Error(
        `Unable to check Store grant: ${existingError.message}`,
      );
    }

    if (existing) {
      return;
    }

    const { error } = await admin
      .from("store_product_grants")
      .insert({
        product_id: input.productId,
        grant_type: input.grantType,
        portal_skin_id: input.portalSkinId ?? null,
        cosmetic_item_id: input.cosmeticItemId ?? null,
        music_track_id: input.musicTrackId ?? null,
        feature_key: input.featureKey ?? null,
      });

    if (error) {
      throw new Error(
        `Unable to create Store grant: ${error.message}`,
      );
    }
  }

  for (const skin of skinsResult.data ?? []) {
    if (skin.is_default === true) {
      continue;
    }

    const productId = await upsertProduct({
      slug: catalogueProductSlug(
        "skin",
        String(skin.slug),
      ),
      name: String(skin.name),
      description: skin.description ?? "",
      imageUrl: skin.preview_image_url ?? null,
      category: "skin",
      isActive: skin.is_active === true,
      sortOrder: 1000 + Number(skin.sort_order ?? 0),
    });

    await ensureGrant({
      productId,
      grantType: "portal_skin",
      portalSkinId: String(skin.id),
    });
  }

  for (const cosmetic of cosmeticsResult.data ?? []) {
    const productId = await upsertProduct({
      slug: catalogueProductSlug(
        "cosmetic",
        String(cosmetic.slug),
      ),
      name: String(cosmetic.name),
      description: cosmetic.description ?? "",
      imageUrl:
        cosmetic.preview_image_url ??
        cosmetic.asset_url ??
        null,
      category: "cosmetic",
      isActive: cosmetic.is_active === true,
      sortOrder:
        2000 + Number(cosmetic.sort_order ?? 0),
    });

    await ensureGrant({
      productId,
      grantType: "cosmetic",
      cosmeticItemId: String(cosmetic.id),
    });
  }

  for (const track of musicResult.data ?? []) {
    const productId = await upsertProduct({
      slug: catalogueProductSlug(
        "music",
        String(track.track_key),
      ),
      name: String(track.name),
      description: track.description ?? "",
      imageUrl: null,
      category: "music",
      isActive:
        track.is_active === true &&
        track.is_personal_selectable === true,
      sortOrder:
        3000 + Number(track.sort_order ?? 0),
    });

    await ensureGrant({
      productId,
      grantType: "music",
      musicTrackId: String(track.id),
    });
  }

  const friendListProductId =
    await upsertProduct({
      slug: "friend-list",
      name: "Friend List",
      description:
        "Unlock your character's Friend List and relationship features.",
      imageUrl: "/icons/friends.png",
      category: "friend_list",
      isActive: true,
      sortOrder: 4000,
    });

  await ensureGrant({
    productId: friendListProductId,
    grantType: "feature",
    featureKey: "friend_list",
  });

  const privateLocationProductId =
    await upsertProduct({
      slug: "private-location",
      name: "Private Location",
      description:
        "Unlock the ability to create and manage an invitation-only Private Location.",
      imageUrl: "/icons/private.png",
      category: "private_location",
      isActive: true,
      sortOrder: 4010,
    });

  await ensureGrant({
    productId: privateLocationProductId,
    grantType: "feature",
    featureKey: "private_chat",
  });

  refresh();
}

export async function createStoreProduct(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const category = str(formData, "category");
  const slug = storeSlug(str(formData, "slug"));

  if (!slug) {
    throw new Error("Enter a valid Store product slug.");
  }

  const { error } = await admin.from("store_products").insert({
    slug,
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
  const slug = storeSlug(str(formData, "slug"));

  if (!slug) {
    throw new Error("Enter a valid Store product slug.");
  }

  const { error } = await admin
    .from("store_products")
    .update({
      slug,
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
  const requestedCurrency =
    nullableStr(formData, "currency")?.toUpperCase() ?? null;
  const moneyAmountMinor = intOrNull(formData, "money_amount_minor");
  const remnantsAmount = intOrNull(formData, "remnants_amount");
  const requestedPaddlePriceId =
    nullableStr(formData, "paddle_price_id");

  if (moneyAmountMinor === null && remnantsAmount === null) {
    throw new Error("Enter a real-money price, a Remnant price, or both.");
  }

  const currency =
    moneyAmountMinor !== null
      ? requestedCurrency
      : null;

  const paddlePriceId =
    moneyAmountMinor !== null
      ? requestedPaddlePriceId
      : null;

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
    paddle_price_id: paddlePriceId,
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
    music_track_id: grantType === "music" ? target : null,
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

  const { data: discount, error } = await admin.from("store_discount_codes").insert({
    code: nullableStr(formData, "code")?.toUpperCase() ?? null,
    name: str(formData, "name"),
    description: str(formData, "description"),
    discount_type: discountType,
    discount_value: intOrNull(formData, "discount_value"),
    currency: discountType === "fixed_money" ? (nullableStr(formData, "currency")?.toUpperCase() ?? "GBP") : null,
    scope_type: scopeType,
    scope_category: scopeType === "category" ? nullableStr(formData, "scope_category") : null,
    max_redemptions: intOrNull(formData, "max_redemptions"),
    max_redemptions_per_user: intOrNull(formData, "max_redemptions_per_user") ?? 1,
    minimum_money_minor: intOrNull(formData, "minimum_money_minor"),
    minimum_remnants: intOrNull(formData, "minimum_remnants"),
    is_public: bool(formData, "is_public"),
    is_active: bool(formData, "is_active"),
    starts_at: nullableStr(formData, "starts_at"),
    ends_at: nullableStr(formData, "ends_at"),
  }).select("id").single();

  if (error || !discount) throw new Error(`Unable to create discount: ${error?.message ?? "No discount returned."}`);
  if (scopeType === "products") {
    const productIds = formData.getAll("product_ids").map((value) => String(value).trim()).filter(Boolean);
    if (!productIds.length) {
      await admin.from("store_discount_codes").delete().eq("id", discount.id);
      throw new Error("Select at least one product for a product-scoped discount.");
    }
    const { error: scopeError } = await admin.from("store_discount_code_products").insert(productIds.map((productId) => ({ discount_code_id: discount.id, product_id: productId })));
    if (scopeError) {
      await admin.from("store_discount_codes").delete().eq("id", discount.id);
      throw new Error(`Unable to save discount product scope: ${scopeError.message}`);
    }
  }
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


export async function createStorePostPurchaseOffer(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();
  const triggerProductId = nullableStr(formData, "trigger_product_id");
  const triggerCategory = nullableStr(formData, "trigger_category");
  if (!triggerProductId && !triggerCategory) throw new Error("Choose a trigger product or trigger category.");
  const { error } = await admin.from("store_post_purchase_offers").insert({
    name: str(formData, "name"), description: str(formData, "description"), trigger_product_id: triggerProductId, trigger_category: triggerCategory,
    discount_code_template_id: str(formData, "discount_code_template_id"), valid_for_days: intOrNull(formData, "valid_for_days") ?? 14,
    is_active: bool(formData, "is_active"), starts_at: nullableStr(formData, "starts_at"), ends_at: nullableStr(formData, "ends_at"),
  });
  if (error) throw new Error(`Unable to create post-purchase offer: ${error.message}`);
  refresh();
}

export async function toggleStorePostPurchaseOffer(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();
  const { error } = await admin.from("store_post_purchase_offers").update({ is_active: str(formData, "next") === "true" }).eq("id", str(formData, "id"));
  if (error) throw new Error(`Unable to update post-purchase offer: ${error.message}`);
  refresh();
}
