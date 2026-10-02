import "server-only";

import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";

type StripeEnvironment = "test" | "live";

function stripeEnvironment(): StripeEnvironment {
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

function currentProductId(product: {
  stripe_product_id_test?: string | null;
  stripe_product_id_live?: string | null;
}) {
  return stripeEnvironment() === "live"
    ? product.stripe_product_id_live
    : product.stripe_product_id_test;
}

function currentPriceId(price: {
  stripe_price_id_test?: string | null;
  stripe_price_id_live?: string | null;
}) {
  return stripeEnvironment() === "live"
    ? price.stripe_price_id_live
    : price.stripe_price_id_test;
}

export async function syncContributionProductToStripe(productId: string) {
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: product, error: productError } = await admin
    .from("support_contribution_products")
    .select(
      "id, slug, name, description, image_url, tax_code, is_active, stripe_product_id_test, stripe_product_id_live",
    )
    .eq("id", productId)
    .single();

  if (productError || !product) {
    throw new Error(productError?.message ?? "Contribution product not found.");
  }

  const taxCode = product.tax_code?.trim();
  if (!taxCode) {
    throw new Error(
      "A Stripe tax code is required before this Contribution product can be synced for Managed Payments.",
    );
  }

  const { data: prices, error: pricesError } = await admin
    .from("support_contribution_prices")
    .select(
      "id, product_id, currency, amount_minor, is_active, stripe_price_id_test, stripe_price_id_live",
    )
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true });

  if (pricesError) throw new Error(pricesError.message);

  let stripeProductId = currentProductId(product);

  try {
    const commonProduct = {
      name: product.name,
      description: product.description || undefined,
      active: product.is_active === true,
      tax_code: taxCode,
      metadata: {
        sepulchria_payment_type: "contribution",
        sepulchria_contribution_product_id: product.id,
        sepulchria_contribution_slug: product.slug,
      },
      ...(product.image_url?.trim()
        ? { images: [product.image_url.trim()] }
        : {}),
    };

    if (stripeProductId) {
      try {
        await stripe.products.update(stripeProductId, commonProduct);
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
      const created = await stripe.products.create(commonProduct);
      stripeProductId = created.id;
    }

    await admin
      .from("support_contribution_products")
      .update({
        ...(stripeEnvironment() === "live"
          ? { stripe_product_id_live: stripeProductId }
          : { stripe_product_id_test: stripeProductId }),
        stripe_sync_status: "synced",
        stripe_sync_error: null,
        stripe_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await admin
      .from("support_contribution_products")
      .update({
        stripe_sync_status: "error",
        stripe_sync_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    throw error;
  }

  for (const price of prices ?? []) {
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

      const matches =
        remote &&
        (typeof remote.product === "string" ? remote.product : remote.product.id) ===
          stripeProductId &&
        remote.currency.toUpperCase() === String(price.currency).toUpperCase() &&
        remote.unit_amount === Number(price.amount_minor) &&
        remote.tax_behavior === "inclusive";

      if (!matches) {
        if (remote?.active) {
          await stripe.prices.update(remote.id, { active: false });
        }

        const created = await stripe.prices.create({
          product: stripeProductId,
          currency: String(price.currency).toLowerCase(),
          unit_amount: Number(price.amount_minor),
          tax_behavior: "inclusive",
          active: price.is_active === true,
          nickname: `Sepulchria Contribution - ${product.name}`,
          metadata: {
            sepulchria_payment_type: "contribution",
            sepulchria_contribution_product_id: product.id,
            sepulchria_contribution_price_id: price.id,
          },
        });

        stripePriceId = created.id;
      } else if (remote) {
        await stripe.prices.update(remote.id, {
          active: price.is_active === true,
          nickname: `Sepulchria Contribution - ${product.name}`,
          metadata: {
            sepulchria_payment_type: "contribution",
            sepulchria_contribution_product_id: product.id,
            sepulchria_contribution_price_id: price.id,
          },
        });

        stripePriceId = remote.id;
      }

      await admin
        .from("support_contribution_prices")
        .update({
          ...(stripeEnvironment() === "live"
            ? { stripe_price_id_live: stripePriceId }
            : { stripe_price_id_test: stripePriceId }),
          stripe_sync_status: "synced",
          stripe_sync_error: null,
          stripe_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", price.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await admin
        .from("support_contribution_prices")
        .update({
          stripe_sync_status: "error",
          stripe_sync_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", price.id);

      throw error;
    }
  }

  return { stripeProductId };
}

export async function ensureContributionPriceReady(priceId: string) {
  const admin = createAdminClient();

  const { data: price, error } = await admin
    .from("support_contribution_prices")
    .select(
      "id, product_id, currency, amount_minor, is_active, stripe_price_id_test, stripe_price_id_live",
    )
    .eq("id", priceId)
    .eq("is_active", true)
    .single();

  if (error || !price) {
    throw new Error(error?.message ?? "Contribution price not found.");
  }

  await syncContributionProductToStripe(price.product_id);

  const { data: refreshed, error: refreshError } = await admin
    .from("support_contribution_prices")
    .select(
      "id, product_id, currency, amount_minor, stripe_price_id_test, stripe_price_id_live",
    )
    .eq("id", price.id)
    .single();

  if (refreshError || !refreshed) {
    throw new Error(refreshError?.message ?? "Unable to reload Contribution price.");
  }

  const stripePriceId = currentPriceId(refreshed);

  if (!stripePriceId) {
    throw new Error("Stripe Contribution price sync did not return a price ID.");
  }

  return {
    stripePriceId,
    productId: refreshed.product_id,
    amountMinor: Number(refreshed.amount_minor),
    currency: String(refreshed.currency).toUpperCase(),
  };
}

export async function createContributionCheckout(input: {
  stripePriceId: string;
  customerEmail: string;
  contributionId: string;
  contributionProductId: string;
  contributionPriceId: string;
  userId: string;
  characterId?: string | null;
}) {
  const stripe = stripeClient();

  const metadata: Record<string, string> = {
    sepulchria_payment_type: "contribution",
    contribution_id: input.contributionId,
    sepulchria_contribution_product_id: input.contributionProductId,
    sepulchria_contribution_price_id: input.contributionPriceId,
    sepulchria_user_id: input.userId,
  };

  if (input.characterId) {
    metadata.sepulchria_character_id = input.characterId;
  }

  const params = {
    mode: "payment",
    ui_mode: "embedded_page",
    redirect_on_completion: "never",
    submit_type: "donate",
    customer_email: input.customerEmail,
    client_reference_id: input.contributionId,
    line_items: [
      {
        price: input.stripePriceId,
        quantity: 1,
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
    },
    managed_payments: {
      enabled: true,
    },
  } as Stripe.Checkout.SessionCreateParams & {
    managed_payments: { enabled: true };
  };

  const session = await stripe.checkout.sessions.create(params);

  if (!session.client_secret) {
    throw new Error(
      "Stripe created a Contribution Checkout Session without a client secret.",
    );
  }

  return {
    clientSecret: session.client_secret,
    checkoutSessionId: session.id,
  };
}
