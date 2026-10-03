"use server";

import {
  createContributionCheckout,
  ensureContributionPriceReady,
  ensureContributionProductReady,
  retrieveContributionCheckoutSession,
} from "@/lib/contributions/stripe-server";
import { sendContributionThankYouEmail } from "@/lib/contributions/contribution-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ContributionStripeState = {
  ok: boolean;
  error: string | null;
  clientSecret: string | null;
  checkoutSessionId: string | null;
  amountMinor: number | null;
};

function failure(error: string): ContributionStripeState {
  return {
    ok: false,
    error,
    clientSecret: null,
    checkoutSessionId: null,
    amountMinor: null,
  };
}

function parseCustomAmountMinor(raw: string) {
  const normalized = raw.trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;

  return Math.round(amount * 100);
}

export async function getContributionCheckoutStatus(
  checkoutSessionId: string,
): Promise<{ status: string | null; paid: boolean }> {
  const sessionId = checkoutSessionId.trim();
  if (!sessionId) return { status: null, paid: false };

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: null, paid: false };

  const { data: contribution, error } = await admin
    .from("support_contributions")
    .select(
      "id, status, amount_minor, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id",
    )
    .eq("user_id", user.id)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error || !contribution) {
    return { status: null, paid: false };
  }

  const alreadyPaid =
    contribution.status === "paid" ||
    contribution.status === "partially_refunded" ||
    contribution.status === "refunded";

  if (alreadyPaid) {
    return { status: contribution.status, paid: true };
  }

  try {
    const session = await retrieveContributionCheckoutSession(sessionId);

    if (
      session.metadata?.sepulchria_payment_type !== "contribution" ||
      session.metadata?.contribution_id !== contribution.id ||
      session.metadata?.sepulchria_user_id !== user.id
    ) {
      return { status: contribution.status, paid: false };
    }

    if (session.payment_status !== "paid") {
      return { status: contribution.status, paid: false };
    }

    const paymentIntent =
      session.payment_intent &&
      typeof session.payment_intent !== "string"
        ? session.payment_intent
        : null;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : paymentIntent?.id ?? null;

    const latestCharge = paymentIntent?.latest_charge;

    const chargeId =
      typeof latestCharge === "string"
        ? latestCharge
        : latestCharge?.id ?? contribution.stripe_charge_id ?? null;

    const amountMinor =
      typeof session.amount_total === "number"
        ? session.amount_total
        : Number(contribution.amount_minor);

    const { error: updateError } = await admin
      .from("support_contributions")
      .update({
        status: "paid",
        amount_minor: amountMinor,
        stripe_payment_intent_id:
          paymentIntentId ?? contribution.stripe_payment_intent_id ?? null,
        stripe_charge_id: chargeId,
        stripe_customer_id:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    if (updateError) {
      console.error(
        "Unable to reconcile paid Contribution from Stripe Checkout Session:",
        updateError,
      );
      return { status: contribution.status, paid: false };
    }

    try {
      await sendContributionThankYouEmail(contribution.id);
    } catch (emailError) {
      console.error(
        "Contribution was reconciled as paid, but thank-you email failed:",
        emailError,
      );
    }

    return { status: "paid", paid: true };
  } catch (stripeError) {
    console.error(
      "Unable to verify Contribution Checkout Session directly with Stripe:",
      stripeError,
    );

    return { status: contribution.status, paid: false };
  }
}


export async function startContributionCheckout(
  _previousState: ContributionStripeState,
  formData: FormData,
): Promise<ContributionStripeState> {
  const priceId = String(formData.get("priceId") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim();
  const pricingMode = String(formData.get("pricingMode") ?? "").trim();

  if (!priceId && !productId) {
    return failure("Choose a Contribution option.");
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return failure("Stripe is not configured yet.");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return failure("You must be signed in.");

  const customerEmail = user.email?.trim() ?? "";
  if (!customerEmail) {
    return failure(
      "Your account does not have an email address for the contribution receipt.",
    );
  }

  const { data: character } = await admin
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_system", false)
    .maybeSingle();

  let ready:
    | {
        pricingMode: "fixed";
        productId: string;
        priceId: string;
        amountMinor: number;
        currency: string;
        stripePriceId: string;
        stripeProductId: null;
      }
    | {
        pricingMode: "custom";
        productId: string;
        priceId: null;
        amountMinor: number;
        currency: string;
        stripePriceId: null;
        stripeProductId: string;
      };

  try {
    if (pricingMode === "custom") {
      if (!productId) {
        return failure("Choose a Contribution option.");
      }

      const { data: product, error: productError } = await admin
        .from("support_contribution_products")
        .select(
          "id, pricing_mode, custom_min_amount_minor, custom_max_amount_minor, is_active",
        )
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (productError || !product || product.pricing_mode !== "custom") {
        return failure("That custom Contribution option is not available.");
      }

      const amountMinor = parseCustomAmountMinor(
        String(formData.get("customAmount") ?? ""),
      );

      const minimum = Number(product.custom_min_amount_minor ?? 100);
      const maximum = Number(product.custom_max_amount_minor ?? 50000);

      if (
        amountMinor === null ||
        amountMinor < minimum ||
        amountMinor > maximum
      ) {
        return failure(
          `Choose an amount between £${(minimum / 100).toFixed(2)} and £${(
            maximum / 100
          ).toFixed(2)}.`,
        );
      }

      const productReady = await ensureContributionProductReady(product.id);

      ready = {
        pricingMode: "custom",
        productId: product.id,
        priceId: null,
        amountMinor,
        currency: "GBP",
        stripePriceId: null,
        stripeProductId: productReady.stripeProductId,
      };
    } else {
      if (!priceId) {
        return failure("Choose a Contribution option.");
      }

      const fixed = await ensureContributionPriceReady(priceId);

      ready = {
        pricingMode: "fixed",
        productId: fixed.productId,
        priceId,
        amountMinor: fixed.amountMinor,
        currency: fixed.currency,
        stripePriceId: fixed.stripePriceId,
        stripeProductId: null,
      };
    }
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error));
  }

  const { data: contribution, error: insertError } = await admin
    .from("support_contributions")
    .insert({
      user_id: user.id,
      character_id: character?.id ?? null,
      customer_email: customerEmail,
      product_id: ready.productId,
      price_id: ready.priceId,
      amount_minor: ready.amountMinor,
      currency: ready.currency,
      status: "pending",
      stripe_environment: (
        process.env.STRIPE_ENVIRONMENT ?? "sandbox"
      )
        .trim()
        .toLowerCase(),
    })
    .select("id")
    .single();

  if (insertError || !contribution) {
    return failure(
      insertError?.message ?? "Unable to start the contribution.",
    );
  }

  try {
    const checkout = await createContributionCheckout({
      stripePriceId: ready.stripePriceId,
      stripeProductId: ready.stripeProductId,
      amountMinor: ready.amountMinor,
      currency: ready.currency,
      customerEmail,
      contributionId: contribution.id,
      contributionProductId: ready.productId,
      contributionPriceId: ready.priceId,
      userId: user.id,
      characterId: character?.id ?? null,
    });

    const { error: updateError } = await admin
      .from("support_contributions")
      .update({
        stripe_checkout_session_id: checkout.checkoutSessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    if (updateError) throw new Error(updateError.message);

    return {
      ok: true,
      error: null,
      clientSecret: checkout.clientSecret,
      checkoutSessionId: checkout.checkoutSessionId,
      amountMinor: ready.amountMinor,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await admin
      .from("support_contributions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    return failure(message);
  }
}

export type ContributionHistoryEntry = {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

export type ContributionHistoryResult = {
  email: string | null;
  entries: ContributionHistoryEntry[];
};

export async function getMyContributionHistory(): Promise<ContributionHistoryResult> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { email: null, entries: [] };
  }

  const email = user.email?.trim() ?? "";

  if (!email) {
    return { email: null, entries: [] };
  }

  const { data, error } = await admin
    .from("support_contributions")
    .select("id, amount_minor, currency, status, created_at, paid_at")
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return {
    email,
    entries: (data ?? []).map((row) => ({
      id: String(row.id),
      amountMinor: Number(row.amount_minor),
      currency: String(row.currency ?? "GBP").toUpperCase(),
      status: String(row.status ?? "pending"),
      createdAt: String(row.created_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
    })),
  };
}

