import "server-only";

import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

export type StripeEnvironment = "test" | "live";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const STORE_STRIPE_TAX_CODE = "txcd_10201000";

export function stripeEnvironment(): StripeEnvironment {
  const value = (process.env.STRIPE_ENVIRONMENT ?? "sandbox").trim().toLowerCase();
  return value === "live" || value === "production" ? "live" : "test";
}

function stripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("STRIPE_SECRET_KEY is not configured.");

  if (stripeEnvironment() === "test" && !value.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_ENVIRONMENT is sandbox/test but STRIPE_SECRET_KEY is not a test key.",
    );
  }

  if (stripeEnvironment() === "live" && !value.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_ENVIRONMENT is live/production but STRIPE_SECRET_KEY is not a live key.",
    );
  }

  return value;
}

function stripeClient() {
  return new Stripe(stripeSecretKey());
}

function storeSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "https://sepulchria.com";

  return value.replace(/\/+$/, "");
}

async function logSync(
  admin: SupabaseAdmin,
  input: {
    entityType: "product" | "price";
    entityId?: string | null;
    action: string;
    status: "success" | "error";
    stripeId?: string | null;
    message?: string | null;
  },
) {
  await admin.from("store_stripe_sync_log").insert({
    environment: stripeEnvironment(),
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    status: input.status,
    stripe_id: input.stripeId ?? null,
    message: input.message ?? null,
  });
}

function currentProductId(product: {
  stripe_product_id_test?: string | null;
  stripe_product_id_live?: string | null;
}) {
  return stripeEnvironment() === "live"
    ? product.stripe_product_id_live
    : product.stripe_product_id_test;
}

export function currentPriceId(price: {
  stripe_price_id_test?: string | null;
  stripe_price_id_live?: string | null;
}) {
  return stripeEnvironment() === "live"
    ? price.stripe_price_id_live
    : price.stripe_price_id_test;
}

function remoteProductId(value: Stripe.Price["product"]) {
  return typeof value === "string" ? value : value.id;
}

export async function syncStoreProductToStripe(
  productId: string,
  admin = createAdminClient(),
) {
  const stripe = stripeClient();

  const { data: product, error: productError } = await admin
    .from("store_products")
    .select(
      "id, slug, name, description, image_url, is_active, stripe_product_id_test, stripe_product_id_live",
    )
    .eq("id", productId)
    .single();

  if (productError || !product) {
    throw new Error(productError?.message ?? "Store product not found.");
  }

  const { data: prices, error: pricesError } = await admin
    .from("store_product_prices")
    .select(
      "id, product_id, currency, money_amount_minor, is_active, stripe_price_id_test, stripe_price_id_live",
    )
    .eq("product_id", productId);

  if (pricesError) throw new Error(pricesError.message);

  let stripeProductId = currentProductId(product);

  try {
    if (stripeProductId) {
      try {
        await stripe.products.update(stripeProductId, {
          name: product.name,
          description: product.description || undefined,
          active: product.is_active === true,
          tax_code: STORE_STRIPE_TAX_CODE,
          metadata: {
            sepulchria_store_product_id: product.id,
            sepulchria_store_slug: product.slug,
          },
        });
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code === "resource_missing"
        ) {
          stripeProductId = null;
        } else {
          throw error;
        }
      }
    }

    if (!stripeProductId) {
      const created = await stripe.products.create({
        name: product.name,
        description: product.description || undefined,
        active: product.is_active === true,
        tax_code: STORE_STRIPE_TAX_CODE,
        metadata: {
          sepulchria_store_product_id: product.id,
          sepulchria_store_slug: product.slug,
        },
      });

      stripeProductId = created.id;
    }

    await admin
      .from("store_products")
      .update({
        ...(stripeEnvironment() === "live"
          ? { stripe_product_id_live: stripeProductId }
          : { stripe_product_id_test: stripeProductId }),
        stripe_sync_status: "synced",
        stripe_sync_error: null,
        stripe_synced_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    await logSync(admin, {
      entityType: "product",
      entityId: product.id,
      action: "sync",
      status: "success",
      stripeId: stripeProductId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await admin
      .from("store_products")
      .update({
        stripe_sync_status: "error",
        stripe_sync_error: message,
      })
      .eq("id", product.id);

    await logSync(admin, {
      entityType: "product",
      entityId: product.id,
      action: "sync",
      status: "error",
      stripeId: stripeProductId,
      message,
    });

    throw error;
  }

  if (!stripeProductId) {
    throw new Error("Stripe product sync did not return a product ID.");
  }

  for (const price of prices ?? []) {
    if (price.money_amount_minor === null || !price.currency) continue;

    let stripePriceId = currentPriceId(price);

    try {
      let remote: Stripe.Price | null = null;

      if (stripePriceId) {
        try {
          remote = await stripe.prices.retrieve(stripePriceId);
        } catch (error) {
          if (
            error instanceof Stripe.errors.StripeInvalidRequestError &&
            error.code === "resource_missing"
          ) {
            stripePriceId = null;
          } else {
            throw error;
          }
        }
      }

      const desiredCurrency = String(price.currency).toLowerCase();
      const desiredAmount = Number(price.money_amount_minor);

      const matches =
        remote &&
        remote.unit_amount === desiredAmount &&
        remote.currency.toLowerCase() === desiredCurrency &&
        remoteProductId(remote.product) === stripeProductId;

      if (!matches) {
        if (remote?.active) {
          await stripe.prices.update(remote.id, { active: false });
        }

        const created = await stripe.prices.create({
          product: stripeProductId,
          currency: desiredCurrency,
          unit_amount: desiredAmount,
          active: price.is_active === true,
          nickname: `Sepulchria Store · ${product.name}`,
          metadata: {
            sepulchria_store_product_id: product.id,
            sepulchria_store_price_id: price.id,
          },
        });

        stripePriceId = created.id;
      } else if (remote) {
        await stripe.prices.update(remote.id, {
          active: price.is_active === true,
          nickname: `Sepulchria Store · ${product.name}`,
          metadata: {
            sepulchria_store_product_id: product.id,
            sepulchria_store_price_id: price.id,
          },
        });

        stripePriceId = remote.id;
      }

      await admin
        .from("store_product_prices")
        .update({
          ...(stripeEnvironment() === "live"
            ? { stripe_price_id_live: stripePriceId }
            : { stripe_price_id_test: stripePriceId }),
          stripe_sync_status: "synced",
          stripe_sync_error: null,
          stripe_synced_at: new Date().toISOString(),
        })
        .eq("id", price.id);

      await logSync(admin, {
        entityType: "price",
        entityId: price.id,
        action: matches ? "sync" : "replace_price",
        status: "success",
        stripeId: stripePriceId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await admin
        .from("store_product_prices")
        .update({
          stripe_sync_status: "error",
          stripe_sync_error: message,
        })
        .eq("id", price.id);

      await logSync(admin, {
        entityType: "price",
        entityId: price.id,
        action: "sync",
        status: "error",
        stripeId: stripePriceId,
        message,
      });

      throw error;
    }
  }

  return { stripeProductId };
}

export async function syncAllStoreProductsToStripe() {
  const admin = createAdminClient();

  const { data: products, error } = await admin
    .from("store_products")
    .select("id")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  let synced = 0;
  const errors: string[] = [];

  for (const product of products ?? []) {
    try {
      await syncStoreProductToStripe(product.id, admin);
      synced += 1;
    } catch (error) {
      errors.push(
        `${product.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { synced, failed: errors.length, errors };
}

export async function ensureStorePriceReadyForCheckout(priceId: string) {
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: price, error } = await admin
    .from("store_product_prices")
    .select(
      "id, product_id, currency, money_amount_minor, stripe_price_id_test, stripe_price_id_live",
    )
    .eq("id", priceId)
    .single();

  if (error || !price) {
    throw new Error(error?.message ?? "Store price not found.");
  }

  if (price.money_amount_minor === null || !price.currency) {
    throw new Error("This Store price is not a real-money price.");
  }

  await syncStoreProductToStripe(price.product_id, admin);

  const { data: refreshed, error: refreshError } = await admin
    .from("store_product_prices")
    .select(
      "id, currency, money_amount_minor, stripe_price_id_test, stripe_price_id_live",
    )
    .eq("id", priceId)
    .single();

  if (refreshError || !refreshed) {
    throw new Error(refreshError?.message ?? "Unable to reload Store price.");
  }

  const stripePriceId = currentPriceId(refreshed);

  if (!stripePriceId) {
    throw new Error("Stripe price sync did not return a price ID.");
  }

  const remote = await stripe.prices.retrieve(stripePriceId);

  if (
    remote.unit_amount !== Number(refreshed.money_amount_minor) ||
    remote.currency.toUpperCase() !== String(refreshed.currency).toUpperCase() ||
    remote.active !== true
  ) {
    throw new Error(
      "Stripe price validation failed after sync. Checkout was stopped before charging the customer.",
    );
  }

  return {
    stripePriceId,
    amountMinor: Number(refreshed.money_amount_minor),
    currency: String(refreshed.currency).toUpperCase(),
  };
}

export async function requestStripeRefund(input: {
  orderId: string;
  amountMinor?: number | null;
  reason?: string | null;
}) {
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: order, error } = await admin
    .from("store_orders")
    .select(
      "id, payment_method, total_money_minor, stripe_payment_intent_id, stripe_charge_id",
    )
    .eq("id", input.orderId)
    .single();

  if (error || !order) {
    throw new Error(error?.message ?? "Store order not found.");
  }

  if (order.payment_method !== "stripe") {
    throw new Error("Only Stripe orders can be refunded through Stripe.");
  }

  if (!order.stripe_payment_intent_id && !order.stripe_charge_id) {
    throw new Error(
      "This order does not contain a Stripe PaymentIntent or Charge ID.",
    );
  }

  const amount =
    input.amountMinor === null || input.amountMinor === undefined
      ? undefined
      : Math.trunc(input.amountMinor);

  if (amount !== undefined && amount <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  if (
    amount !== undefined &&
    amount > Number(order.total_money_minor ?? 0)
  ) {
    throw new Error("Refund amount cannot exceed the order total.");
  }

  try {
    const refund = await stripe.refunds.create({
      ...(order.stripe_payment_intent_id
        ? { payment_intent: order.stripe_payment_intent_id }
        : { charge: order.stripe_charge_id }),
      ...(amount !== undefined ? { amount } : {}),
      reason: "requested_by_customer",
      metadata: {
        sepulchria_store_order_id: order.id,
        sepulchria_refund_note:
          input.reason?.trim() || "Customer request",
      },
    });

    await admin.from("store_stripe_sync_log").insert({
      environment: stripeEnvironment(),
      entity_type: "refund",
      entity_id: order.id,
      action: "create",
      status: "success",
      stripe_id: refund.id,
      message: input.reason?.trim() || null,
    });

    return refund;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    await admin.from("store_stripe_sync_log").insert({
      environment: stripeEnvironment(),
      entity_type: "refund",
      entity_id: order.id,
      action: "create",
      status: "error",
      stripe_id: null,
      message,
    });

    throw error;
  }
}

export async function createManagedStoreCheckout(input: {
  stripePriceId: string;
  customerEmail: string;
  currency: string;
  discountMoneyMinor: number;
  orderId: string;
  productId: string;
  userId: string;
  characterId: string;
  discountDescription?: string | null;
}) {
  const stripe = stripeClient();

  let couponId: string | null = null;

  if (input.discountMoneyMinor > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: Math.trunc(input.discountMoneyMinor),
      currency: input.currency.toLowerCase(),
      duration: "once",
      name: input.discountDescription?.trim() || "Sepulchria Store discount",
      metadata: {
        sepulchria_store_order_id: input.orderId,
      },
    });

    couponId = coupon.id;
  }

  const params = {
    mode: "payment",
    line_items: [
      {
        price: input.stripePriceId,
        quantity: 1,
      },
    ],
    ...(couponId
      ? {
          discounts: [
            {
              coupon: couponId,
            },
          ],
        }
      : {}),
    customer_email: input.customerEmail,
    success_url:
      `${storeSiteUrl()}/store?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${storeSiteUrl()}/store?stripe=cancelled`,
    metadata: {
      store_order_id: input.orderId,
      store_product_id: input.productId,
      sepulchria_user_id: input.userId,
      sepulchria_character_id: input.characterId,
    },
    managed_payments: {
      enabled: true,
    },
  } as Stripe.Checkout.SessionCreateParams & {
    managed_payments: { enabled: true };
  };

  const session = await stripe.checkout.sessions.create(params);

  if (!session.url) {
    throw new Error("Stripe created a Checkout Session without a checkout URL.");
  }

  return {
    checkoutUrl: session.url,
    checkoutSessionId: session.id,
    couponId,
  };
}
