"use server";

import { revalidatePath } from "next/cache";

import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { issueStorePostPurchaseOffersAndNotify } from "@/lib/store/post-purchase-offers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureStorePriceReadyForCheckout } from "@/lib/store/paddle-server";
import { createClient } from "@/lib/supabase/server";

export type StorePurchaseState = {
  ok: boolean;
  error: string | null;
  orderId: string | null;
};

export type StorePaddleState = {
  ok: boolean;
  error: string | null;
  checkoutUrl: string | null;
  transactionId: string | null;
  customerEmail: string | null;
};

function paddleApiBase() {
  return process.env.PADDLE_ENVIRONMENT === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

export async function purchaseStoreProductWithRemnants(
  _previousState: StorePurchaseState,
  formData: FormData,
): Promise<StorePurchaseState> {
  const productId = String(formData.get("productId") ?? "").trim();
  const discountCode = String(formData.get("discountCode") ?? "").trim();
  if (!productId) return { ok: false, error: "Store product is missing.", orderId: null };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in.", orderId: null };

  const [characterResult, productResult] = await Promise.all([
    supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("store_products").select("name, category").eq("id", productId).maybeSingle(),
  ]);

  if (characterResult.error || !characterResult.data) {
    return { ok: false, error: characterResult.error?.message ?? "Character not found.", orderId: null };
  }

  const { data, error } = await supabase.rpc(
    "purchase_store_product_with_remnants",
    { p_product_id: productId, p_discount_code: discountCode || null },
  );

  if (error) return { ok: false, error: error.message, orderId: null };

  const completedOrderId =
    typeof data === "string" ? data : String(data ?? "");

  if (completedOrderId) {
    try {
      await issueStorePostPurchaseOffersAndNotify({
        orderId: completedOrderId,
        characterId: characterResult.data.id,
        userId: user.id,
      });
    } catch (offerError) {
      console.error(
        "Remnants Store purchase succeeded, but post-purchase rewards could not be processed:",
        offerError,
      );
    }
  }

  try {
    await createPremiumFeatureGrantNotification({
      characterId: characterResult.data.id,
      createdBy: user.id,
      title: "Store purchase complete",
      body: `You purchased ${productResult.data?.name ?? "a Store product"} with Remnants. Your unlock is available immediately.`,
      href: storeDestinationForCategory(productResult.data?.category),
    });
  } catch (notificationError) {
    console.error(
      "Store purchase succeeded, but its notification could not be created:",
      notificationError,
    );
  }

  for (const path of [
    "/store",
    "/appearance",
    "/cosmetics",
    "/friends",
    "/private-locations",
    "/character",
    "/game",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/", "layout");

  return {
    ok: true,
    error: null,
    orderId: completedOrderId,
  };
}

export async function startStorePaddleCheckout(
  _previousState: StorePaddleState,
  formData: FormData,
): Promise<StorePaddleState> {
  const productId = String(formData.get("productId") ?? "").trim();
  const priceId = String(formData.get("priceId") ?? "").trim();
  const discountCode = String(formData.get("discountCode") ?? "").trim();
  const apiKey = process.env.PADDLE_API_KEY;

  if (!productId) {
    return { ok: false, error: "Store product is missing.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  if (!apiKey) {
    return { ok: false, error: "Paddle is not configured yet.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const customerEmail = user.email?.trim() ?? "";
  if (!customerEmail) {
    return {
      ok: false,
      error: "Your account does not have an email address for Paddle receipts.",
      checkoutUrl: null,
      transactionId: null,
      customerEmail: null,
    };
  }

  const [characterResult, productResult, priceResult, grantsResult] =
    await Promise.all([
      admin.from("characters").select("id").eq("user_id", user.id).maybeSingle(),
      admin.from("store_products")
        .select("id, slug, name, product_type, category, is_active")
        .eq("id", productId)
        .maybeSingle(),
      admin.from("store_product_prices")
        .select("id, currency, money_amount_minor, paddle_price_id, is_active")
        .eq("product_id", productId)
        .eq("id", priceId)
        .eq("is_active", true)
        .not("money_amount_minor", "is", null)
        .maybeSingle(),
      admin.from("store_product_grants")
        .select("grant_type, portal_skin_id, cosmetic_item_id, music_track_id, feature_key, quantity")
        .eq("product_id", productId),
    ]);

  if (characterResult.error || !characterResult.data) {
    return { ok: false, error: characterResult.error?.message ?? "Character not found.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }
  if (productResult.error || !productResult.data || productResult.data.is_active !== true) {
    return { ok: false, error: productResult.error?.message ?? "This Store product is not available.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }
  if (priceResult.error || !priceResult.data) {
    return { ok: false, error: priceResult.error?.message ?? "This product does not have an active Paddle price.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }
  if (grantsResult.error || !(grantsResult.data ?? []).length) {
    return { ok: false, error: grantsResult.error?.message ?? "This Store product has no fulfilment grants.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const product = productResult.data;
  const price = priceResult.data;
  const character = characterResult.data;
  const allGrants = grantsResult.data ?? [];

  const [
    skinEntitlementsResult,
    cosmeticEntitlementsResult,
    musicEntitlementsResult,
    featureEntitlementsResult,
  ] = await Promise.all([
    admin
      .from("user_portal_skin_entitlements")
      .select("skin_id")
      .eq("user_id", user.id)
      .eq("enabled", true),
    admin
      .from("character_cosmetic_entitlements")
      .select("cosmetic_item_id")
      .eq("character_id", character.id)
      .eq("enabled", true),
    admin
      .from("character_music_entitlements")
      .select("music_track_id")
      .eq("character_id", character.id)
      .eq("enabled", true),
    admin
      .from("character_feature_entitlements")
      .select("feature_key")
      .eq("character_id", character.id)
      .eq("enabled", true),
  ]);

  for (const result of [
    skinEntitlementsResult,
    cosmeticEntitlementsResult,
    musicEntitlementsResult,
    featureEntitlementsResult,
  ]) {
    if (result.error) {
      return {
        ok: false,
        error: result.error.message,
        checkoutUrl: null,
        transactionId: null,
        customerEmail: null,
      };
    }
  }

  const ownedSkinIds = new Set(
    (skinEntitlementsResult.data ?? []).map(
      (entry) => entry.skin_id,
    ),
  );
  const ownedCosmeticIds = new Set(
    (cosmeticEntitlementsResult.data ?? []).map(
      (entry) => entry.cosmetic_item_id,
    ),
  );
  const ownedMusicIds = new Set(
    (musicEntitlementsResult.data ?? []).map(
      (entry) => entry.music_track_id,
    ),
  );
  const ownedFeatures = new Set(
    (featureEntitlementsResult.data ?? []).map(
      (entry) => entry.feature_key,
    ),
  );

  const grantIsOwned = (grant: (typeof allGrants)[number]) => {
    if (
      grant.grant_type === "portal_skin" &&
      grant.portal_skin_id
    ) {
      return ownedSkinIds.has(grant.portal_skin_id);
    }

    if (
      grant.grant_type === "cosmetic" &&
      grant.cosmetic_item_id
    ) {
      return ownedCosmeticIds.has(grant.cosmetic_item_id);
    }

    if (
      grant.grant_type === "music" &&
      grant.music_track_id
    ) {
      return ownedMusicIds.has(grant.music_track_id);
    }

    if (
      grant.grant_type === "feature" &&
      grant.feature_key
    ) {
      return ownedFeatures.has(grant.feature_key);
    }

    return false;
  };

  const missingGrants = allGrants.filter(
    (grant) => !grantIsOwned(grant),
  );

  if (missingGrants.length === 0) {
    return {
      ok: false,
      error: "You already own everything included in this product.",
      checkoutUrl: null,
      transactionId: null,
      customerEmail: null,
    };
  }

  const bundleItemCount =
    product.product_type === "bundle"
      ? allGrants.length
      : 0;
  const ownedBundleItemCount =
    product.product_type === "bundle"
      ? allGrants.length - missingGrants.length
      : 0;

  const baseMoneyMinor = Number(
    price.money_amount_minor ?? 0,
  );

  const ownershipDiscountMoneyMinor =
    bundleItemCount > 0 &&
    ownedBundleItemCount > 0
      ? Math.round(
          (baseMoneyMinor * ownedBundleItemCount) /
            bundleItemCount,
        )
      : 0;

  const ownershipAdjustedSubtotalMoneyMinor =
    Math.max(
      0,
      baseMoneyMinor - ownershipDiscountMoneyMinor,
    );

  let syncedPaddlePriceId: string;
  try {
    const synced = await ensureStorePriceReadyForCheckout(price.id);
    syncedPaddlePriceId = synced.paddlePriceId;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Paddle price synchronization failed.",
      checkoutUrl: null,
      transactionId: null,
      customerEmail: null,
    };
  }

  let discount: { discount_code_id: string; user_discount_code_id: string | null; discount_type: "percentage" | "fixed_money"; discount_value: number; discount_money_minor: number } | null = null;
  if (discountCode) {
    const { data: discountRows, error: discountError } = await admin.rpc("resolve_store_discount", {
      p_user_id: user.id,
      p_product_id: product.id,
      p_code: discountCode,
      p_payment_method: "paddle",
      p_subtotal_money_minor: ownershipAdjustedSubtotalMoneyMinor,
      p_subtotal_remnants: 0,
      p_currency: price.currency,
    });
    if (discountError) return { ok: false, error: discountError.message, checkoutUrl: null, transactionId: null, customerEmail: null };
    const row = Array.isArray(discountRows) ? discountRows[0] ?? null : discountRows;
    if (!row) return { ok: false, error: "Discount code is invalid or expired.", checkoutUrl: null, transactionId: null, customerEmail: null };
    discount = row as {
      discount_code_id: string;
      user_discount_code_id: string | null;
      discount_type: "percentage" | "fixed_money";
      discount_value: number;
      discount_money_minor: number;
    };
  }
  const codeDiscountMoneyMinor = Math.min(
    ownershipAdjustedSubtotalMoneyMinor,
    Math.max(
      0,
      Number(discount?.discount_money_minor ?? 0),
    ),
  );

  const discountMoneyMinor = Math.min(
    baseMoneyMinor,
    ownershipDiscountMoneyMinor +
      codeDiscountMoneyMinor,
  );

  const expectedTotalMoneyMinor = Math.max(
    0,
    baseMoneyMinor - discountMoneyMinor,
  );

  const { data: order, error: orderError } = await admin
    .from("store_orders")
    .insert({
      user_id: user.id,
      character_id: character.id,
      status: "pending",
      payment_method: "paddle",
      currency: price.currency,
      subtotal_money_minor: baseMoneyMinor,
      discount_money_minor: discountMoneyMinor,
      total_money_minor: expectedTotalMoneyMinor,
      subtotal_remnants: 0,
      discount_remnants: 0,
      total_remnants: 0,
      discount_code_id: discount?.discount_code_id ?? null,
      user_discount_code_id: discount?.user_discount_code_id ?? null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message ?? "Unable to create Store order.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const { data: item, error: itemError } = await admin
    .from("store_order_items")
    .insert({
      order_id: order.id,
      product_id: product.id,
      product_slug_snapshot: product.slug,
      product_name_snapshot: product.name,
      product_type_snapshot: product.product_type,
      category_snapshot: product.category,
      quantity: 1,
      unit_money_minor_snapshot: baseMoneyMinor,
      total_money_minor_snapshot: baseMoneyMinor,
      unit_remnants_snapshot: null,
      total_remnants_snapshot: null,
    })
    .select("id")
    .single();

  if (itemError || !item) {
    await admin.from("store_orders").delete().eq("id", order.id);
    return { ok: false, error: itemError?.message ?? "Unable to create Store order item.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  // Snapshot only entitlements the buyer does not already own.
  // This also prevents a refund from touching a pre-owned entitlement.
  const snapshots = missingGrants.map((grant) => ({
    order_id: order.id,
    order_item_id: item.id,
    grant_type: grant.grant_type,
    portal_skin_id: grant.portal_skin_id,
    cosmetic_item_id: grant.cosmetic_item_id,
    music_track_id: grant.music_track_id,
    feature_key: grant.feature_key,
    quantity: grant.quantity,
  }));

  const { error: snapshotError } = await admin
    .from("store_order_grants")
    .insert(snapshots);

  if (snapshotError) {
    await admin.from("store_orders").delete().eq("id", order.id);
    return { ok: false, error: snapshotError.message, checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const response = await fetch(`${paddleApiBase()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Paddle-Version": "1",
    },
    body: JSON.stringify({
      items: [{ price_id: syncedPaddlePriceId, quantity: 1 }],
      ...(discountMoneyMinor > 0
        ? {
            currency_code: String(price.currency).toUpperCase(),
            discount: {
              type: "flat",
              description: [
                ownershipDiscountMoneyMinor > 0
                  ? `Bundle ownership ${ownedBundleItemCount}/${bundleItemCount}`
                  : null,
                discount
                  ? `Store code ${discountCode.toUpperCase()}`
                  : null,
              ]
                .filter(Boolean)
                .join(" + "),
              amount: String(discountMoneyMinor),
            },
          }
        : {}),
      custom_data: {
        store_order_id: order.id,
        store_product_id: product.id,
        sepulchria_user_id: user.id,
        sepulchria_character_id: character.id,
      },
      checkout: {
        url: process.env.PADDLE_CHECKOUT_URL?.trim() || null,
      },
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null) as
    | {
        data?: {
          id?: string;
          checkout?: { url?: string | null } | null;
        };
        error?: { detail?: string };
      }
    | null;

  if (!response.ok || !payload?.data?.id || !payload.data.checkout?.url) {
    await admin.from("store_orders").update({ status: "failed" }).eq("id", order.id);
    return {
      ok: false,
      error: payload?.error?.detail ?? "Paddle could not create the checkout.",
      checkoutUrl: null,
      transactionId: null,
      customerEmail: null,
    };
  }

  const { error: linkError } = await admin
    .from("store_orders")
    .update({ paddle_transaction_id: payload.data.id })
    .eq("id", order.id);

  if (linkError) {
    return { ok: false, error: linkError.message, checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  return {
    ok: true,
    error: null,
    checkoutUrl: payload.data.checkout.url,
    transactionId: payload.data.id,
    customerEmail,
  };
}
