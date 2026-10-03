import { NextResponse } from "next/server";
import Stripe from "stripe";

import { sendContributionThankYouEmail } from "@/lib/contributions/contribution-email";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(key);
}

function isContributionSession(session: Stripe.Checkout.Session) {
  return session.metadata?.sepulchria_payment_type === "contribution";
}

async function markContributionPaid(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  if (!isContributionSession(session)) {
    return NextResponse.json({ ok: true });
  }

  const contributionId = session.metadata?.contribution_id;

  if (!contributionId) {
    return NextResponse.json(
      {
        error:
          "Contribution Checkout Session is missing contribution_id metadata.",
      },
      { status: 400 },
    );
  }

  const { data: contribution, error } = await admin
    .from("support_contributions")
    .select("id, status, amount_minor, stripe_checkout_session_id")
    .eq("id", contributionId)
    .maybeSingle();

  if (error || !contribution) {
    return NextResponse.json(
      { error: error?.message ?? "Contribution not found." },
      { status: 404 },
    );
  }

  if (
    contribution.stripe_checkout_session_id &&
    contribution.stripe_checkout_session_id !== session.id
  ) {
    return NextResponse.json(
      { error: "Stripe Checkout Session does not match contribution." },
      { status: 409 },
    );
  }

  if (
    contribution.status === "paid" ||
    contribution.status === "refunded" ||
    contribution.status === "partially_refunded"
  ) {
    try {
      await sendContributionThankYouEmail(contributionId);
      return NextResponse.json({ ok: true });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : String(emailError);

      console.error(
        "Contribution is already recorded, but thank-you email retry failed:",
        emailError,
      );

      return NextResponse.json(
        { error: `Contribution email failed: ${message}` },
        { status: 500 },
      );
    }
  }

  let paymentIntentId: string | null = null;
  let chargeId: string | null = null;

  if (typeof session.payment_intent === "string") {
    paymentIntentId = session.payment_intent;

    try {
      const paymentIntent = await stripeClient().paymentIntents.retrieve(
        paymentIntentId,
      );

      chargeId =
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id ?? null;
    } catch (lookupError) {
      console.error(
        "Contribution payment succeeded, but PaymentIntent lookup failed:",
        lookupError,
      );
    }
  }

  const amountMinor =
    typeof session.amount_total === "number"
      ? session.amount_total
      : Number(contribution.amount_minor);

  const { error: updateError } = await admin
    .from("support_contributions")
    .update({
      status: "paid",
      amount_minor: amountMinor,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contributionId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  try {
    await sendContributionThankYouEmail(contributionId);
  } catch (emailError) {
    const message =
      emailError instanceof Error ? emailError.message : String(emailError);

    console.error(
      "Contribution was recorded, but thank-you email failed:",
      emailError,
    );

    return NextResponse.json(
      { error: `Contribution email failed: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function handleContributionRefund(
  admin: ReturnType<typeof createAdminClient>,
  chargeId: string | null,
  paymentIntentId: string | null,
  fullyRefunded: boolean,
) {
  if (!chargeId && !paymentIntentId) {
    return NextResponse.json({ ok: true });
  }

  let query = admin
    .from("support_contributions")
    .select("id, status");

  query = chargeId
    ? query.eq("stripe_charge_id", chargeId)
    : query.eq("stripe_payment_intent_id", paymentIntentId!);

  const { data: contribution, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!contribution) {
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await admin
    .from("support_contributions")
    .update({
      status: fullyRefunded ? "refunded" : "partially_refunded",
      refunded_at: fullyRefunded ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contribution.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const secret =
    process.env.STRIPE_CONTRIBUTIONS_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: "Contribution webhook secret is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 401 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      secret,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    if (!isContributionSession(session)) {
      return NextResponse.json({ ok: true });
    }

    if (
      event.type === "checkout.session.completed" &&
      session.payment_status !== "paid"
    ) {
      return NextResponse.json({ ok: true });
    }

    return markContributionPaid(admin, session);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (!isContributionSession(session)) {
      return NextResponse.json({ ok: true });
    }

    const contributionId = session.metadata?.contribution_id;

    if (contributionId) {
      const { error: updateError } = await admin
        .from("support_contributions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", contributionId)
        .eq("status", "pending");

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;

    return handleContributionRefund(
      admin,
      charge.id,
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null,
      charge.refunded === true,
    );
  }

  return NextResponse.json({ ok: true });
}
