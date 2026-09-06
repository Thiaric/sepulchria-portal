import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type StoreEmailKind = "receipt" | "refund";

async function logEmail(input: {
  orderId: string;
  kind: StoreEmailKind;
  recipient: string;
  status: "sent" | "skipped" | "error";
  providerMessageId?: string | null;
  error?: string | null;
}) {
  const admin = createAdminClient();
  await admin.from("store_email_log").insert({
    order_id: input.orderId,
    kind: input.kind,
    recipient: input.recipient,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error: input.error ?? null,
  });
}

export async function sendStoreEmail(input: {
  orderId: string;
  kind: StoreEmailKind;
  recipient: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.STORE_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    await logEmail({
      orderId: input.orderId,
      kind: input.kind,
      recipient: input.recipient,
      status: "skipped",
      error: "RESEND_API_KEY or STORE_EMAIL_FROM is not configured.",
    });
    return { sent: false, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.recipient],
        subject: input.subject,
        html: input.html,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    if (!response.ok) {
      throw new Error(payload?.message || `Email provider returned HTTP ${response.status}.`);
    }

    await logEmail({
      orderId: input.orderId,
      kind: input.kind,
      recipient: input.recipient,
      status: "sent",
      providerMessageId: payload?.id ?? null,
    });

    return { sent: true, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logEmail({
      orderId: input.orderId,
      kind: input.kind,
      recipient: input.recipient,
      status: "error",
      error: message,
    });
    throw error;
  }
}

export async function sendStoreOrderReceiptEmail(orderId: string) {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("store_orders")
    .select(
      "id, user_id, payment_method, currency, total_money_minor, total_remnants, status, paid_at, created_at",
    )
    .eq("id", orderId)
    .single();

  if (error || !order) throw new Error(error?.message ?? "Store order not found.");

  const { data: userData } = await admin.auth.admin.getUserById(order.user_id);
  const email = userData.user?.email?.trim();
  if (!email) return;

  const { data: items } = await admin
    .from("store_order_items")
    .select("product_name_snapshot, quantity")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const names = (items ?? [])
    .map((item) =>
      Number(item.quantity ?? 1) > 1
        ? `${item.product_name_snapshot} ×${item.quantity}`
        : item.product_name_snapshot,
    )
    .join(", ");

  const amount =
    order.payment_method === "paddle"
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: order.currency || "GBP",
        }).format(Number(order.total_money_minor ?? 0) / 100)
      : `${Number(order.total_remnants ?? 0)} Remnants`;

  await sendStoreEmail({
    orderId,
    kind: "receipt",
    recipient: email,
    subject: "Your Sepulchria Store receipt",
    html: `
      <h1>Sepulchria Store</h1>
      <p>Thank you for your purchase.</p>
      <p><strong>Order:</strong> ${order.id}</p>
      <p><strong>Items:</strong> ${names || "Sepulchria Store purchase"}</p>
      <p><strong>Total:</strong> ${amount}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p>You can review this order in your Sepulchria Store purchase history.</p>
    `,
  });
}

export async function sendStoreRefundEmail(orderId: string) {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("store_orders")
    .select("id, user_id, currency, total_money_minor")
    .eq("id", orderId)
    .single();

  if (error || !order) return;

  const { data: userData } = await admin.auth.admin.getUserById(order.user_id);
  const email = userData.user?.email?.trim();
  if (!email) return;

  const amount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: order.currency || "GBP",
  }).format(Number(order.total_money_minor ?? 0) / 100);

  await sendStoreEmail({
    orderId,
    kind: "refund",
    recipient: email,
    subject: "Your Sepulchria Store refund",
    html: `
      <h1>Sepulchria Store refund</h1>
      <p>Your refund for order <strong>${order.id}</strong> has been approved.</p>
      <p>Original order total: <strong>${amount}</strong></p>
      <p>Paddle will return approved funds to the original payment method.</p>
    `,
  });
}
