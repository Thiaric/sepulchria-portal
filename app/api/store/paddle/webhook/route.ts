import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import {
  sendStoreOrderReceiptEmail,
  sendStoreRefundEmail,
} from "@/lib/store/store-email";
import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function verifySignature(rawBody: string, header: string, secret: string) {
  const parts = header.split(";").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("ts="))?.slice(3) ?? "";
  const signatures = parts.filter((part) => part.startsWith("h1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`, "utf8").digest("hex");
  return signatures.some((signature) => {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

type PaddleEvent = {
  event_type?: string;
  data?: {
    id?: string;
    customer_id?: string | null;
    transaction_id?: string | null;
    action?: string | null;
    status?: string | null;
    type?: string | null;
    custom_data?: { store_order_id?: string } | null;
    details?: { totals?: { total?: string | null } | null } | null;
  };
};

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 500 });

  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature") ?? "";
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid Paddle signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as PaddleEvent;
  const admin = createAdminClient();

  if (event.event_type === "transaction.canceled" || event.event_type === "transaction.payment_failed") {
    const transactionId = event.data?.id;
    const orderId = event.data?.custom_data?.store_order_id;
    const nextStatus = event.event_type === "transaction.canceled" ? "cancelled" : "failed";

    if (orderId || transactionId) {
      let query = admin.from("store_orders").update({
        status: nextStatus,
        ...(nextStatus === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
      });
      query = orderId ? query.eq("id", orderId) : query.eq("paddle_transaction_id", transactionId!);
      const { error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (event.event_type === "adjustment.created" || event.event_type === "adjustment.updated") {
    const adjustment = event.data;
    const transactionId = adjustment?.transaction_id;

    if (adjustment?.action !== "refund" || adjustment.status !== "approved" || !transactionId) {
      return NextResponse.json({ ok: true });
    }

    const { data: order, error } = await admin
      .from("store_orders")
      .select("id, status")
      .eq("paddle_transaction_id", transactionId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!order) return NextResponse.json({ ok: true });

    if (adjustment.type === "full") {
      if (order.status !== "refunded") {
        const { error: revokeError } = await admin.rpc(
          "revoke_store_order_entitlements",
          { p_order_id: order.id },
        );
        if (revokeError) {
          return NextResponse.json({ error: revokeError.message }, { status: 500 });
        }

        try {
          await sendStoreRefundEmail(order.id);
        } catch (emailError) {
          console.error("Refund approved, but Store refund email failed:", emailError);
        }
      }
    } else if (order.status !== "refunded") {
      const { error: partialError } = await admin
        .from("store_orders")
        .update({ status: "partially_refunded" })
        .eq("id", order.id);

      if (partialError) {
        return NextResponse.json({ error: partialError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (event.event_type !== "transaction.completed") {
    return NextResponse.json({ ok: true });
  }

  const transactionId = event.data?.id;
  const orderId = event.data?.custom_data?.store_order_id;
  if (!transactionId || !orderId) {
    return NextResponse.json(
      { error: "Paddle transaction is missing Store metadata." },
      { status: 400 },
    );
  }

  const { data: order, error: orderError } = await admin
    .from("store_orders")
    .select("id, character_id, user_id, status, paddle_transaction_id, subtotal_money_minor")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Store order not found." },
      { status: 404 },
    );
  }

  if (order.paddle_transaction_id && order.paddle_transaction_id !== transactionId) {
    return NextResponse.json(
      { error: "Paddle transaction does not match Store order." },
      { status: 409 },
    );
  }

  if (order.status === "fulfilled") {
    await admin.rpc("finalize_store_discount_redemption", { p_order_id: orderId });
    await admin.rpc("issue_store_post_purchase_offers", { p_order_id: orderId });
    return NextResponse.json({ ok: true });
  }

  const actualTotal = Number(event.data?.details?.totals?.total);
  const subtotal = Number(order.subtotal_money_minor ?? 0);
  const hasActualTotal = Number.isInteger(actualTotal) && actualTotal >= 0;
  const totalMoneyMinor = hasActualTotal ? actualTotal : subtotal;
  const discountMoneyMinor = Math.max(0, subtotal - totalMoneyMinor);

  const { error: paidError } = await admin
    .from("store_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paddle_transaction_id: transactionId,
      paddle_customer_id: event.data?.customer_id ?? null,
      total_money_minor: totalMoneyMinor,
      discount_money_minor: discountMoneyMinor,
    })
    .eq("id", orderId);

  if (paidError) return NextResponse.json({ error: paidError.message }, { status: 500 });

  const { error: fulfilError } = await admin.rpc("fulfil_store_order", { p_order_id: orderId });
  if (fulfilError) return NextResponse.json({ error: fulfilError.message }, { status: 500 });

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
      body: `You purchased ${item?.product_name_snapshot ?? "a Store product"}. Your unlock is available immediately.`,
      href: storeDestinationForCategory(item?.category_snapshot),
    });
  } catch (notificationError) {
    console.error(
      "Paddle Store purchase was fulfilled, but its notification could not be created:",
      notificationError,
    );
  }

  try {
    await sendStoreOrderReceiptEmail(orderId);
  } catch (emailError) {
    console.error("Store purchase was fulfilled, but receipt email failed:", emailError);
  }

  return NextResponse.json({ ok: true });
}
