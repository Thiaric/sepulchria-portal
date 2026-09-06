import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type PaddleEnvironment = "sandbox" | "production";

const REQUIRED_WEBHOOK_EVENTS = [
  "transaction.completed",
  "transaction.canceled",
  "transaction.payment_failed",
  "adjustment.created",
  "adjustment.updated",
] as const;

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export function paddleEnvironment(): PaddleEnvironment {
  const value = (process.env.PADDLE_ENVIRONMENT ?? "sandbox").trim().toLowerCase();
  return value === "production" || value === "live" ? "production" : "sandbox";
}

export function paddleApiBase() {
  return paddleEnvironment() === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

function paddleKey() {
  const value = process.env.PADDLE_API_KEY?.trim();
  if (!value) throw new Error("PADDLE_API_KEY is not configured.");
  return value;
}

async function paddleRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${paddleApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paddleKey()}`,
      "Content-Type": "application/json",
      "Paddle-Version": "1",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { detail?: string } }
    | null;

  if (!response.ok) {
    const detail =
      payload &&
      typeof payload === "object" &&
      "error" in payload
        ? payload.error?.detail
        : null;
    throw new Error(detail || `Paddle request failed with HTTP ${response.status}.`);
  }

  return payload as T;
}

async function logSync(
  admin: SupabaseAdmin,
  input: {
    entityType: "product" | "price" | "webhook" | "refund";
    entityId?: string | null;
    action: string;
    status: "success" | "error";
    paddleId?: string | null;
    message?: string | null;
  },
) {
  await admin.from("store_paddle_sync_log").insert({
    environment: paddleEnvironment(),
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    status: input.status,
    paddle_id: input.paddleId ?? null,
    message: input.message ?? null,
  });
}

function currentProductId(product: {
  paddle_product_id_sandbox?: string | null;
  paddle_product_id_live?: string | null;
}) {
  return paddleEnvironment() === "production"
    ? product.paddle_product_id_live
    : product.paddle_product_id_sandbox;
}

export function currentPriceId(price: {
  paddle_price_id?: string | null;
  paddle_price_id_sandbox?: string | null;
  paddle_price_id_live?: string | null;
}) {
  const environmentId =
    paddleEnvironment() === "production"
      ? price.paddle_price_id_live
      : price.paddle_price_id_sandbox;

  return environmentId || price.paddle_price_id || null;
}

function publicImageUrl(value: string | null | undefined) {
  const image = value?.trim();
  return image?.startsWith("https://") ? image : null;
}

export async function syncStoreProductToPaddle(
  productId: string,
  admin = createAdminClient(),
) {
  const { data: product, error: productError } = await admin
    .from("store_products")
    .select(
      "id, slug, name, description, image_url, is_active, paddle_product_id_sandbox, paddle_product_id_live",
    )
    .eq("id", productId)
    .single();

  if (productError || !product) {
    throw new Error(productError?.message ?? "Store product not found.");
  }

  const { data: prices, error: pricesError } = await admin
    .from("store_product_prices")
    .select(
      "id, product_id, currency, money_amount_minor, is_active, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live",
    )
    .eq("product_id", productId);

  if (pricesError) throw new Error(pricesError.message);

  let paddleProductId = currentProductId(product);

  try {
    const productPayload = {
  name: product.name,
  description: product.description || null,
  tax_category: "standard",
  image_url: publicImageUrl(product.image_url),
  custom_data: {
    sepulchria_store_product_id: product.id,
    sepulchria_store_slug: product.slug,
  },
};

    if (paddleProductId) {
  await paddleRequest<{ data: { id: string } }>(
    `/products/${paddleProductId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...productPayload,
        status: product.is_active ? "active" : "archived",
      }),
    },
  );
} else {
  const created = await paddleRequest<{ data: { id: string } }>(
    "/products",
    {
      method: "POST",
      body: JSON.stringify(productPayload),
    },
  );

  paddleProductId = created.data.id;
}

    await admin
      .from("store_products")
      .update({
        ...(paddleEnvironment() === "production"
          ? { paddle_product_id_live: paddleProductId }
          : { paddle_product_id_sandbox: paddleProductId }),
        paddle_sync_status: "synced",
        paddle_sync_error: null,
        paddle_synced_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    await logSync(admin, {
      entityType: "product",
      entityId: product.id,
      action: "sync",
      status: "success",
      paddleId: paddleProductId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin
      .from("store_products")
      .update({ paddle_sync_status: "error", paddle_sync_error: message })
      .eq("id", product.id);
    await logSync(admin, {
      entityType: "product",
      entityId: product.id,
      action: "sync",
      status: "error",
      paddleId: paddleProductId,
      message,
    });
    throw error;
  }

  for (const price of prices ?? []) {
    if (price.money_amount_minor === null || !price.currency) continue;

    const { data: overrides, error: overridesError } = await admin
      .from("store_price_region_overrides")
      .select("country_codes, currency, money_amount_minor")
      .eq("price_id", price.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (overridesError) throw new Error(overridesError.message);

    let paddlePriceId = currentPriceId(price);

    const pricePayload = {
      description: `Sepulchria Store · ${product.name} · ${price.currency}`,
      name: `${product.name} · ${price.currency}`,
      unit_price: {
        amount: String(price.money_amount_minor),
        currency_code: String(price.currency).toUpperCase(),
      },
      unit_price_overrides: (overrides ?? []).map((override) => ({
        country_codes: override.country_codes,
        unit_price: {
          amount: String(override.money_amount_minor),
          currency_code: String(override.currency).toUpperCase(),
        },
      })),
      tax_mode: "account_setting",
      quantity: { minimum: 1, maximum: 1 },
      status: price.is_active ? "active" : "archived",
      custom_data: {
        sepulchria_store_product_id: product.id,
        sepulchria_store_price_id: price.id,
      },
    };

    try {
      if (paddlePriceId) {
        await paddleRequest<{ data: { id: string } }>(
          `/prices/${paddlePriceId}`,
          { method: "PATCH", body: JSON.stringify(pricePayload) },
        );
      } else {
        const created = await paddleRequest<{ data: { id: string } }>(
          "/prices",
          {
            method: "POST",
            body: JSON.stringify({
              product_id: paddleProductId,
              ...pricePayload,
            }),
          },
        );
        paddlePriceId = created.data.id;
      }

      await admin
        .from("store_product_prices")
        .update({
          paddle_price_id: paddlePriceId,
          ...(paddleEnvironment() === "production"
            ? { paddle_price_id_live: paddlePriceId }
            : { paddle_price_id_sandbox: paddlePriceId }),
          paddle_sync_status: "synced",
          paddle_sync_error: null,
          paddle_synced_at: new Date().toISOString(),
        })
        .eq("id", price.id);

      await logSync(admin, {
        entityType: "price",
        entityId: price.id,
        action: "sync",
        status: "success",
        paddleId: paddlePriceId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await admin
        .from("store_product_prices")
        .update({ paddle_sync_status: "error", paddle_sync_error: message })
        .eq("id", price.id);
      await logSync(admin, {
        entityType: "price",
        entityId: price.id,
        action: "sync",
        status: "error",
        paddleId: paddlePriceId,
        message,
      });
      throw error;
    }
  }

  return { paddleProductId };
}

export async function syncAllStoreProductsToPaddle() {
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
      await syncStoreProductToPaddle(product.id, admin);
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

  const { data: price, error } = await admin
    .from("store_product_prices")
    .select(
      "id, product_id, currency, money_amount_minor, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live",
    )
    .eq("id", priceId)
    .single();

  if (error || !price) throw new Error(error?.message ?? "Store price not found.");
  if (price.money_amount_minor === null || !price.currency) {
    throw new Error("This Store price is not a real-money price.");
  }

  await syncStoreProductToPaddle(price.product_id, admin);

  const { data: refreshed, error: refreshError } = await admin
    .from("store_product_prices")
    .select(
      "id, currency, money_amount_minor, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live",
    )
    .eq("id", priceId)
    .single();

  if (refreshError || !refreshed) {
    throw new Error(refreshError?.message ?? "Unable to reload Store price.");
  }

  const paddlePriceId = currentPriceId(refreshed);
  if (!paddlePriceId) throw new Error("Paddle price sync did not return a price ID.");

  const remote = await paddleRequest<{
    data: {
      id: string;
      unit_price: { amount: string; currency_code: string };
      status: string;
    };
  }>(`/prices/${paddlePriceId}`);

  if (
    Number(remote.data.unit_price.amount) !== Number(refreshed.money_amount_minor) ||
    remote.data.unit_price.currency_code.toUpperCase() !==
      String(refreshed.currency).toUpperCase() ||
    remote.data.status !== "active"
  ) {
    throw new Error(
      "Paddle price validation failed after sync. Checkout was stopped before charging the customer.",
    );
  }

  return {
    paddlePriceId,
    amountMinor: Number(refreshed.money_amount_minor),
    currency: String(refreshed.currency).toUpperCase(),
  };
}

export async function archiveStorePaddlePrice(price: {
  paddle_price_id?: string | null;
  paddle_price_id_sandbox?: string | null;
  paddle_price_id_live?: string | null;
}) {
  const paddlePriceId = currentPriceId(price);
  if (!paddlePriceId) return;

  await paddleRequest(`/prices/${paddlePriceId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "archived" }),
  });
}

export async function archiveStorePaddleProduct(product: {
  paddle_product_id_sandbox?: string | null;
  paddle_product_id_live?: string | null;
}) {
  const paddleProductId = currentProductId(product);
  if (!paddleProductId) return;

  await paddleRequest(`/products/${paddleProductId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "archived" }),
  });
}

export async function getPaddleWebhookReadiness() {
  const webhookUrl =
    process.env.PADDLE_WEBHOOK_URL?.trim() ||
    "https://www.sepulchria.com/api/store/paddle/webhook";

  const payload = await paddleRequest<{
    data: Array<{
      id: string;
      destination: string;
      active: boolean;
      subscribed_events: Array<{ name: string } | string>;
    }>;
  }>("/notification-settings?per_page=200");

  const destination = payload.data.find(
    (row) => row.destination.replace(/\/+$/, "") === webhookUrl.replace(/\/+$/, ""),
  );

  const subscribed = new Set(
    (destination?.subscribed_events ?? []).map((event) =>
      typeof event === "string" ? event : event.name,
    ),
  );

  return {
    webhookUrl,
    destinationId: destination?.id ?? null,
    active: destination?.active === true,
    missingEvents: REQUIRED_WEBHOOK_EVENTS.filter((event) => !subscribed.has(event)),
  };
}

export async function ensurePaddleWebhookEvents() {
  const admin = createAdminClient();
  const readiness = await getPaddleWebhookReadiness();

  if (!readiness.destinationId) {
    throw new Error(
      `No Paddle notification destination exists for ${readiness.webhookUrl}. Create it once in Paddle, save its secret as PADDLE_WEBHOOK_SECRET, then use this button again.`,
    );
  }

  try {
    await paddleRequest(`/notification-settings/${readiness.destinationId}`, {
      method: "PATCH",
      body: JSON.stringify({
        active: true,
        destination: readiness.webhookUrl,
        subscribed_events: [...REQUIRED_WEBHOOK_EVENTS],
      }),
    });

    await logSync(admin, {
      entityType: "webhook",
      action: "configure_events",
      status: "success",
      paddleId: readiness.destinationId,
    });
  } catch (error) {
    await logSync(admin, {
      entityType: "webhook",
      action: "configure_events",
      status: "error",
      paddleId: readiness.destinationId,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function requestPaddleRefund(input: {
  orderId: string;
  amountMinor?: number | null;
  reason: string;
}) {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("store_orders")
    .select("id, paddle_transaction_id, total_money_minor, status")
    .eq("id", input.orderId)
    .single();

  if (error || !order) throw new Error(error?.message ?? "Store order not found.");
  if (!order.paddle_transaction_id) throw new Error("This order has no Paddle transaction.");
  if (!["fulfilled", "partially_refunded"].includes(order.status)) {
    throw new Error(`Order status ${order.status} cannot be refunded.`);
  }

  const fullAmount = Number(order.total_money_minor ?? 0);
  const requested = input.amountMinor ?? null;
  const fullRefund = requested === null || requested >= fullAmount;

  let body: Record<string, unknown> = {
    action: "refund",
    transaction_id: order.paddle_transaction_id,
    reason: input.reason || "Sepulchria Store administrator refund",
    type: "full",
  };

  if (!fullRefund) {
    if (!Number.isInteger(requested) || requested <= 0) {
      throw new Error("Partial refund amount must be a positive whole number.");
    }

    const transaction = await paddleRequest<{
      data: {
        details: {
          line_items: Array<{ id: string }>;
        };
      };
    }>(`/transactions/${order.paddle_transaction_id}`);

    const lineItem = transaction.data.details.line_items[0];
    if (!lineItem) throw new Error("Paddle transaction has no refundable line item.");

    body = {
      action: "refund",
      transaction_id: order.paddle_transaction_id,
      reason: input.reason || "Sepulchria Store administrator partial refund",
      type: "partial",
      items: [
        {
          item_id: lineItem.id,
          type: "partial",
          amount: String(requested),
        },
      ],
    };
  }

  try {
    const adjustment = await paddleRequest<{ data: { id: string; status: string } }>(
      "/adjustments",
      { method: "POST", body: JSON.stringify(body) },
    );

    await logSync(admin, {
      entityType: "refund",
      entityId: order.id,
      action: fullRefund ? "full_refund" : "partial_refund",
      status: "success",
      paddleId: adjustment.data.id,
      message: `Paddle refund status: ${adjustment.data.status}`,
    });

    return adjustment.data;
  } catch (error) {
    await logSync(admin, {
      entityType: "refund",
      entityId: order.id,
      action: fullRefund ? "full_refund" : "partial_refund",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
