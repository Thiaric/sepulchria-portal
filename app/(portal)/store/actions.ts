"use server";

import { revalidatePath } from "next/cache";

import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { issueStorePostPurchaseOffersAndNotify } from "@/lib/store/post-purchase-offers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createManagedStoreCheckout,
  ensureStorePriceReadyForCheckout,
} from "@/lib/store/stripe-server";
import { createClient } from "@/lib/supabase/server";

export type StorePurchaseState = {
  ok: boolean;
  error: string | null;
  orderId: string | null;
};

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

export type StoreStripeState = {
  ok: boolean;
  error: string | null;
  clientSecret: string | null;
  checkoutSessionId: string | null;
};

export async function getStoreStripeCheckoutStatus(
  checkoutSessionId: string,
): Promise<{
  status: string | null;
  fulfilled: boolean;
}> {
  const sessionId = checkoutSessionId.trim();

  if (!sessionId) {
    return { status: null, fulfilled: false };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: null, fulfilled: false };
  }

  const { data: order, error } = await admin
    .from("store_orders")
    .select("status")
    .eq("user_id", user.id)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error || !order) {
    return { status: null, fulfilled: false };
  }

  return {
    status: order.status,
    fulfilled: order.status === "fulfilled",
  };
}

export async function startStoreStripeCheckout(
  _previousState: StoreStripeState,
  formData: FormData,
): Promise<StoreStripeState> {
  const productId = String(formData.get("productId") ?? "").trim();
  const priceId = String(formData.get("priceId") ?? "").trim();
  const discountCode = String(formData.get("discountCode") ?? "").trim();

  const failure = (error: string): StoreStripeState => ({
    ok: false,
    error,
    clientSecret: null,
    checkoutSessionId: null,
  });

  if (!productId) {
    return failure("Store product is missing.");
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return failure("Stripe is not configured yet.");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("You must be signed in.");
  }

  const customerEmail = user.email?.trim() ?? "";

  if (!customerEmail) {
    return failure(
      "Your account does not have an email address for the payment receipt.",
    );
  }

  const [characterResult, productResult, priceResult, grantsResult] =
    await Promise.all([
      admin
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("store_products")
        .select("id, slug, name, product_type, category, is_active")
        .eq("id", productId)
        .maybeSingle(),
      admin
        .from("store_product_prices")
        .select("id, currency, money_amount_minor, is_active")
        .eq("product_id", productId)
        .eq("id", priceId)
        .eq("is_active", true)
        .not("money_amount_minor", "is", null)
        .maybeSingle(),
      admin
        .from("store_product_grants")
        .select(
          "grant_type, portal_skin_id, cosmetic_item_id, music_track_id, feature_key, quantity",
        )
        .eq("product_id", productId),
    ]);

  if (characterResult.error || !characterResult.data) {
    return failure(
      characterResult.error?.message ?? "Character not found.",
    );
  }

  if (
    productResult.error ||
    !productResult.data ||
    productResult.data.is_active !== true
  ) {
    return failure(
      productResult.error?.message ??
        "This Store product is not available.",
    );
  }

  if (priceResult.error || !priceResult.data) {
    return failure(
      priceResult.error?.message ??
        "This product does not have an active Stripe price.",
    );
  }

  if (grantsResult.error || !(grantsResult.data ?? []).length) {
    return failure(
      grantsResult.error?.message ??
        "This Store product has no fulfilment grants.",
    );
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
      return failure(result.error.message);
    }
  }

  const ownedSkinIds = new Set(
    (skinEntitlementsResult.data ?? []).map((entry) => entry.skin_id),
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
    if (grant.grant_type === "portal_skin" && grant.portal_skin_id) {
      return ownedSkinIds.has(grant.portal_skin_id);
    }

    if (grant.grant_type === "cosmetic" && grant.cosmetic_item_id) {
      return ownedCosmeticIds.has(grant.cosmetic_item_id);
    }

    if (grant.grant_type === "music" && grant.music_track_id) {
      return ownedMusicIds.has(grant.music_track_id);
    }

    if (grant.grant_type === "feature" && grant.feature_key) {
      return ownedFeatures.has(grant.feature_key);
    }

    return false;
  };

  const missingGrants = allGrants.filter(
    (grant) => !grantIsOwned(grant),
  );

  if (missingGrants.length === 0) {
    return failure(
      "You already own everything included in this product.",
    );
  }

  const bundleItemCount =
    product.product_type === "bundle" ? allGrants.length : 0;
  const ownedBundleItemCount =
    product.product_type === "bundle"
      ? allGrants.length - missingGrants.length
      : 0;

  const baseMoneyMinor = Number(price.money_amount_minor ?? 0);

  const ownershipDiscountMoneyMinor =
    bundleItemCount > 0 && ownedBundleItemCount > 0
      ? Math.round(
          (baseMoneyMinor * ownedBundleItemCount) /
            bundleItemCount,
        )
      : 0;

  const ownershipAdjustedSubtotalMoneyMinor = Math.max(
    0,
    baseMoneyMinor - ownershipDiscountMoneyMinor,
  );

  let syncedStripePriceId: string;

  try {
    const synced = await ensureStorePriceReadyForCheckout(price.id);
    syncedStripePriceId = synced.stripePriceId;
  } catch (error) {
    return failure(
      error instanceof Error
        ? error.message
        : "Stripe price synchronization failed.",
    );
  }

  type StoreMoneyDiscount = {
    discount_code_id: string;
    user_discount_code_id: string | null;
    discount_type: "percentage" | "fixed_money";
    discount_value: number;
    discount_money_minor: number;
  };

  let discount: StoreMoneyDiscount | null = null;

  if (discountCode) {
    const { data: discountRows, error: discountError } =
      await admin.rpc("resolve_store_discount", {
        p_user_id: user.id,
        p_product_id: product.id,
        p_code: discountCode,
        p_payment_method: "stripe",
        p_subtotal_money_minor:
          ownershipAdjustedSubtotalMoneyMinor,
        p_subtotal_remnants: 0,
        p_currency: price.currency,
      });

    if (discountError) {
      return failure(discountError.message);
    }

    const row = Array.isArray(discountRows)
      ? discountRows[0] ?? null
      : discountRows;

    if (!row) {
      return failure("Discount code is invalid or expired.");
    }

    discount = row as StoreMoneyDiscount;
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
    ownershipDiscountMoneyMinor + codeDiscountMoneyMinor,
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
      payment_method: "stripe",
      currency: price.currency,
      subtotal_money_minor: baseMoneyMinor,
      discount_money_minor: discountMoneyMinor,
      total_money_minor: expectedTotalMoneyMinor,
      subtotal_remnants: 0,
      discount_remnants: 0,
      total_remnants: 0,
      discount_code_id: discount?.discount_code_id ?? null,
      user_discount_code_id:
        discount?.user_discount_code_id ?? null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return failure(
      orderError?.message ?? "Unable to create Store order.",
    );
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
    return failure(
      itemError?.message ?? "Unable to create Store order item.",
    );
  }

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
    return failure(snapshotError.message);
  }

  const discountDescription = [
    ownershipDiscountMoneyMinor > 0
      ? `Bundle ownership ${ownedBundleItemCount}/${bundleItemCount}`
      : null,
    discount ? `Store code ${discountCode.toUpperCase()}` : null,
  ]
    .filter(Boolean)
    .join(" + ");

  try {
    const checkout = await createManagedStoreCheckout({
      stripePriceId: syncedStripePriceId,
      customerEmail,
      currency: String(price.currency).toUpperCase(),
      discountMoneyMinor,
      orderId: order.id,
      productId: product.id,
      userId: user.id,
      characterId: character.id,
      discountDescription,
    });

    const { error: linkError } = await admin
      .from("store_orders")
      .update({
        stripe_checkout_session_id:
          checkout.checkoutSessionId,
      })
      .eq("id", order.id);

    if (linkError) {
      await admin
        .from("store_orders")
        .update({ status: "failed" })
        .eq("id", order.id);

      return failure(linkError.message);
    }

    return {
      ok: true,
      error: null,
      clientSecret: checkout.clientSecret,
      checkoutSessionId: checkout.checkoutSessionId,
    };
  } catch (error) {
    await admin
      .from("store_orders")
      .update({ status: "failed" })
      .eq("id", order.id);

    return failure(
      error instanceof Error
        ? error.message
        : "Stripe could not create the checkout.",
    );
  }
}
