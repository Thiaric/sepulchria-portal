"use server";

import { revalidatePath } from "next/cache";

import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { createAdminClient } from "@/lib/supabase/admin";
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
    { p_product_id: productId },
  );

  if (error) return { ok: false, error: error.message, orderId: null };

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
    orderId: typeof data === "string" ? data : String(data ?? ""),
  };
}

export async function startStorePaddleCheckout(
  _previousState: StorePaddleState,
  formData: FormData,
): Promise<StorePaddleState> {
  const productId = String(formData.get("productId") ?? "").trim();
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
        .eq("is_active", true)
        .not("money_amount_minor", "is", null)
        .not("paddle_price_id", "is", null)
        .limit(1)
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

  const { data: order, error: orderError } = await admin
    .from("store_orders")
    .insert({
      user_id: user.id,
      character_id: character.id,
      status: "pending",
      payment_method: "paddle",
      currency: price.currency,
      subtotal_money_minor: price.money_amount_minor,
      discount_money_minor: 0,
      total_money_minor: price.money_amount_minor,
      subtotal_remnants: 0,
      discount_remnants: 0,
      total_remnants: 0,
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
      unit_money_minor_snapshot: price.money_amount_minor,
      total_money_minor_snapshot: price.money_amount_minor,
      unit_remnants_snapshot: null,
      total_remnants_snapshot: null,
    })
    .select("id")
    .single();

  if (itemError || !item) {
    await admin.from("store_orders").delete().eq("id", order.id);
    return { ok: false, error: itemError?.message ?? "Unable to create Store order item.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const snapshots = (grantsResult.data ?? []).map((grant) => ({
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
      items: [{ price_id: price.paddle_price_id, quantity: 1 }],
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
