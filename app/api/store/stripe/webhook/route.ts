import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import {
  sendStoreOrderReceiptEmail,
  sendStoreRefundEmail,
} from "@/lib/store/store-email";
import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { issueStorePostPurchaseOffersAndNotify } from "@/lib/store/post-purchase-offers";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(key);
}

async function fulfilPaidOrder(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const orderId = session.metadata?.store_order_id;
  if (!orderId) {
    return NextResponse.json(
      { error: "Stripe Checkout Session is missing Store metadata." },
      { status: 400 },
    );
  }

  const { data: order, error: orderError } = await admin
    .from("store_orders")
    .select(
      "id, character_id, user_id, status, stripe_checkout_session_id, subtotal_money_minor",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Store order not found." },
      { status: 404 },
    );
  }

  if (
    order.stripe_checkout_session_id &&
    order.stripe_checkout_session_id !== session.id
  ) {
    return NextResponse.json(
      { error: "Stripe Checkout Session does not match Store order." },
      { status: 409 },
    );
  }

  if (order.status === "fulfilled") {
    await admin.rpc("finalize_store_discount_redemption", {
      p_order_id: orderId,
    });

    try {
      await issueStorePostPurchaseOffersAndNotify({
        orderId,
        characterId: order.character_id,
        userId: order.user_id,
      });
    } catch (offerError) {
      console.error(
        "Store order was already fulfilled, but post-purchase rewards could not be processed:",
        offerError,
      );
    }

    return NextResponse.json({ ok: true });
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
    } catch (error) {
      console.error(
        "Stripe payment succeeded, but PaymentIntent lookup failed:",
        error,
      );
    }
  }

  const subtotal = Number(order.subtotal_money_minor ?? 0);
  const actualTotal =
    typeof session.amount_total === "number"
      ? session.amount_total
      : subtotal;

  const totalMoneyMinor = Math.max(0, actualTotal);
  const discountMoneyMinor = Math.max(0, subtotal - totalMoneyMinor);

  const { error: paidError } = await admin
    .from("store_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null,
      total_money_minor: totalMoneyMinor,
      discount_money_minor: discountMoneyMinor,
    })
    .eq("id", orderId);

  if (paidError) {
    return NextResponse.json(
      { error: paidError.message },
      { status: 500 },
    );
  }

  const { error: fulfilError } = await admin.rpc(
    "fulfil_store_order",
    { p_order_id: orderId },
  );

  if (fulfilError) {
    return NextResponse.json(
      { error: fulfilError.message },
      { status: 500 },
    );
  }

  try {
    await issueStorePostPurchaseOffersAndNotify({
      orderId,
      characterId: order.character_id,
      userId: order.user_id,
    });
  } catch (offerError) {
    console.error(
      "Store purchase was fulfilled, but post-purchase rewards could not be processed:",
      offerError,
    );
  }

  const { data: item } = await admin
    .from("store_order_items")
    .select("product_name_snapshot, category_snapshot")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  try {
    await createPremiumFeatureGrantNotification({
      characterId: order.character_id,
      createdBy: order.user_id,
      title: "Store purchase complete",
      body: `You purchased ${
        item?.product_name_snapshot ?? "a Store product"
      }. Your unlock is available immediately.`,
      href: storeDestinationForCategory(item?.category_snapshot),
    });
  } catch (notificationError) {
    console.error(
      "Stripe Store purchase was fulfilled, but its notification could not be created:",
      notificationError,
    );
  }

  try {
    await sendStoreOrderReceiptEmail(orderId);
  } catch (emailError) {
    console.error(
      "Store purchase was fulfilled, but receipt email failed:",
      emailError,
    );
  }

  return NextResponse.json({ ok: true });
}

async function handleRefund(
  admin: ReturnType<typeof createAdminClient>,
  chargeId: string | null,
  paymentIntentId: string | null,
  fullyRefunded: boolean,
) {
  if (!chargeId && !paymentIntentId) {
    return NextResponse.json({ ok: true });
  }

  let query = admin
    .from("store_orders")
    .select("id, status");

  query = chargeId
    ? query.eq("stripe_charge_id", chargeId)
    : query.eq("stripe_payment_intent_id", paymentIntentId!);

  const { data: order, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json({ ok: true });
  }

  if (fullyRefunded) {
    if (order.status !== "refunded") {
      const { error: revokeError } = await admin.rpc(
        "revoke_store_order_entitlements",
        { p_order_id: order.id },
      );

      if (revokeError) {
        return NextResponse.json(
          { error: revokeError.message },
          { status: 500 },
        );
      }

      try {
        await sendStoreRefundEmail(order.id);
      } catch (emailError) {
        console.error(
          "Refund approved, but Store refund email failed:",
          emailError,
        );
      }
    }
  } else if (order.status !== "refunded") {
    const { error: partialError } = await admin
      .from("store_orders")
      .update({ status: "partially_refunded" })
      .eq("id", order.id);

    if (partialError) {
      return NextResponse.json(
        { error: partialError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret is not configured." },
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

    if (
      event.type === "checkout.session.completed" &&
      session.payment_status !== "paid"
    ) {
      return NextResponse.json({ ok: true });
    }

    return fulfilPaidOrder(admin, session);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.store_order_id;

    if (orderId) {
      const { error } = await admin
        .from("store_orders")
        .update({ status: "failed" })
        .eq("id", orderId);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    return handleRefund(
      admin,
      charge.id,
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null,
      charge.refunded === true,
    );
  }

  if (
    event.type === "refund.created" ||
    event.type === "refund.updated"
  ) {
    const refund = event.data.object as Stripe.Refund;

    if (refund.status !== "succeeded") {
      return NextResponse.json({ ok: true });
    }

    const chargeId =
      typeof refund.charge === "string"
        ? refund.charge
        : refund.charge?.id ?? null;

    const paymentIntentId =
      typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : refund.payment_intent?.id ?? null;

    // charge.refunded is the authoritative full/partial state event.
    // These refund events are accepted to keep the destination healthy.
    if (!chargeId && !paymentIntentId) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
