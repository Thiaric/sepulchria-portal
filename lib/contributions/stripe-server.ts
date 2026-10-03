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

export async function ensureContributionProductReady(productId: string) {
  const { stripeProductId } = await syncContributionProductToStripe(productId);

  if (!stripeProductId) {
    throw new Error(
      "Stripe Contribution product sync did not return a product ID.",
    );
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

function normalizedContributionEnvironment(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "live" || normalized === "production" ? "live" : "test";
}

function assertContributionEnvironment(value: string | null | undefined) {
  const recordEnvironment = normalizedContributionEnvironment(value);
  const currentEnvironment = stripeEnvironment();

  if (recordEnvironment !== currentEnvironment) {
    throw new Error(
      `This contribution belongs to the ${recordEnvironment} Stripe environment, but the current server is using ${currentEnvironment}.`,
    );
  }
}

export async function cancelPendingContributionOnStripe(contributionId: string) {
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: contribution, error } = await admin
    .from("support_contributions")
    .select(
      "id, status, amount_minor, stripe_environment, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id",
    )
    .eq("id", contributionId)
    .single();

  if (error || !contribution) {
    throw new Error(error?.message ?? "Contribution not found.");
  }

  if (contribution.status !== "pending") {
    throw new Error("Only pending contributions can be checked or cancelled.");
  }

  assertContributionEnvironment(contribution.stripe_environment);

  const sessionId = contribution.stripe_checkout_session_id?.trim() ?? "";

  if (!sessionId) {
    const { error: updateError } = await admin
      .from("support_contributions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id)
      .eq("status", "pending");

    if (updateError) throw new Error(updateError.message);
    return { result: "cancelled" as const };
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (session.payment_status === "paid") {
    const paymentIntent =
      session.payment_intent &&
      typeof session.payment_intent !== "string"
        ? session.payment_intent
        : null;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : paymentIntent?.id ??
          contribution.stripe_payment_intent_id ??
          null;

    const latestCharge = paymentIntent?.latest_charge;

    const chargeId =
      typeof latestCharge === "string"
        ? latestCharge
        : latestCharge?.id ??
          contribution.stripe_charge_id ??
          null;

    const amountMinor =
      typeof session.amount_total === "number"
        ? session.amount_total
        : Number(contribution.amount_minor);

    const now = new Date().toISOString();

    const { error: reconcileError } = await admin
      .from("support_contributions")
      .update({
        status: "paid",
        amount_minor: amountMinor,
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: chargeId,
        stripe_customer_id:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null,
        paid_at: now,
        updated_at: now,
      })
      .eq("id", contribution.id)
      .eq("status", "pending");

    if (reconcileError) throw new Error(reconcileError.message);
    return { result: "reconciled_paid" as const };
  }

  if (session.status === "open") {
    await stripe.checkout.sessions.expire(sessionId);
  } else if (session.status === "complete") {
    throw new Error(
      "This Checkout Session is complete but Stripe has not marked it paid. Check the Stripe payment before changing this record.",
    );
  }

  const { error: updateError } = await admin
    .from("support_contributions")
    .update({
      status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contribution.id)
    .eq("status", "pending");

  if (updateError) throw new Error(updateError.message);
  return { result: "cancelled" as const };
}

export async function refundContributionOnStripe(contributionId: string) {
  const admin = createAdminClient();
  const stripe = stripeClient();

  const { data: contribution, error } = await admin
    .from("support_contributions")
    .select(
      "id, status, stripe_environment, stripe_payment_intent_id, stripe_charge_id",
    )
    .eq("id", contributionId)
    .single();

  if (error || !contribution) {
    throw new Error(error?.message ?? "Contribution not found.");
  }

  if (
    contribution.status !== "paid" &&
    contribution.status !== "partially_refunded"
  ) {
    throw new Error("Only paid contributions can be refunded.");
  }

  assertContributionEnvironment(contribution.stripe_environment);

  const paymentIntentId = contribution.stripe_payment_intent_id?.trim() ?? "";
  const chargeId = contribution.stripe_charge_id?.trim() ?? "";

  if (!paymentIntentId && !chargeId) {
    throw new Error(
      "This contribution has no Stripe PaymentIntent or Charge ID to refund.",
    );
  }

  const refund = await stripe.refunds.create({
    ...(paymentIntentId
      ? { payment_intent: paymentIntentId }
      : { charge: chargeId }),
    metadata: {
      sepulchria_payment_type: "contribution",
      contribution_id: contribution.id,
      sepulchria_admin_refund: "true",
    },
  });

  if (refund.status === "failed" || refund.status === "canceled") {
    throw new Error(
      refund.failure_reason
        ? `Stripe refund failed: ${refund.failure_reason}`
        : `Stripe refund did not succeed (${refund.status}).`,
    );
  }

  if (refund.status === "succeeded") {
    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from("support_contributions")
      .update({
        status: "refunded",
        refunded_at: now,
        updated_at: now,
      })
      .eq("id", contribution.id);

    if (updateError) throw new Error(updateError.message);
  }

  return { refundId: refund.id, status: refund.status };
}

export async function retrieveContributionCheckoutSession(
  checkoutSessionId: string,
) {
  const id = checkoutSessionId.trim();

  if (!id) {
    throw new Error("Stripe Checkout Session ID is required.");
  }

  return stripeClient().checkout.sessions.retrieve(id, {
    expand: ["payment_intent"],
  });
}

export async function createContributionCheckout(input: {
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  contributionId: string;
  contributionProductId: string;
  contributionPriceId?: string | null;
  userId: string;
  characterId?: string | null;
}) {
  const stripe = stripeClient();

  const metadata: Record<string, string> = {
    sepulchria_payment_type: "contribution",
    contribution_id: input.contributionId,
    sepulchria_contribution_product_id: input.contributionProductId,
    sepulchria_user_id: input.userId,
  };

  if (input.contributionPriceId) {
    metadata.sepulchria_contribution_price_id = input.contributionPriceId;
  }

  if (input.characterId) {
    metadata.sepulchria_character_id = input.characterId;
  }

  if (!input.stripePriceId && !input.stripeProductId) {
    throw new Error(
      "Contribution checkout is missing its Stripe price or product.",
    );
  }

  const lineItems = input.stripePriceId
    ? [
        {
          price: input.stripePriceId,
          quantity: 1,
        },
      ]
    : [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: Math.trunc(input.amountMinor),
            tax_behavior: "inclusive" as const,
            product: input.stripeProductId!,
          },
          quantity: 1,
        },
      ];

  const params = {
    mode: "payment",
    ui_mode: "embedded_page",
    redirect_on_completion: "never",
    submit_type: "donate",
    customer_email: input.customerEmail,
    client_reference_id: input.contributionId,
    line_items: lineItems,
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
