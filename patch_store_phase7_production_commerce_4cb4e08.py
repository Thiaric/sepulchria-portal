from pathlib import Path
import re

SQL_TEXT = "-- Sepulchria Store — Phase 7 production commerce operations\n-- Targets repository state based on master commit 4cb4e08.\nbegin;\n\nalter table public.store_products\n  add column if not exists paddle_product_id_sandbox text,\n  add column if not exists paddle_product_id_live text,\n  add column if not exists paddle_sync_status text not null default 'not_synced',\n  add column if not exists paddle_sync_error text,\n  add column if not exists paddle_synced_at timestamptz;\n\nalter table public.store_product_prices\n  add column if not exists paddle_price_id_sandbox text,\n  add column if not exists paddle_price_id_live text,\n  add column if not exists paddle_sync_status text not null default 'not_synced',\n  add column if not exists paddle_sync_error text,\n  add column if not exists paddle_synced_at timestamptz;\n\nupdate public.store_product_prices\nset paddle_price_id_sandbox = paddle_price_id\nwhere paddle_price_id_sandbox is null\n  and paddle_price_id is not null;\n\nalter table public.store_orders\n  add column if not exists cancelled_at timestamptz,\n  add column if not exists refunded_at timestamptz;\n\nalter table public.store_orders\n  drop constraint if exists store_orders_status_check;\n\nalter table public.store_orders\n  add constraint store_orders_status_check\n  check (status in (\n    'pending',\n    'paid',\n    'fulfilled',\n    'failed',\n    'cancelled',\n    'partially_refunded',\n    'refunded'\n  ));\n\ncreate table if not exists public.store_price_region_overrides (\n  id uuid primary key default gen_random_uuid(),\n  price_id uuid not null references public.store_product_prices(id) on delete cascade,\n  country_codes text[] not null,\n  currency text not null,\n  money_amount_minor integer not null check (money_amount_minor >= 0),\n  is_active boolean not null default true,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);\n\ncreate index if not exists store_price_region_overrides_price_idx\n  on public.store_price_region_overrides(price_id);\n\ncreate table if not exists public.store_paddle_sync_log (\n  id uuid primary key default gen_random_uuid(),\n  environment text not null check (environment in ('sandbox','production')),\n  entity_type text not null check (entity_type in ('product','price','webhook','refund')),\n  entity_id uuid,\n  action text not null,\n  status text not null check (status in ('success','error')),\n  paddle_id text,\n  message text,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists store_paddle_sync_log_created_idx\n  on public.store_paddle_sync_log(created_at desc);\n\ncreate table if not exists public.store_email_log (\n  id uuid primary key default gen_random_uuid(),\n  order_id uuid references public.store_orders(id) on delete set null,\n  kind text not null check (kind in ('receipt','refund')),\n  recipient text not null,\n  status text not null check (status in ('sent','skipped','error')),\n  provider_message_id text,\n  error text,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists store_email_log_order_idx\n  on public.store_email_log(order_id, created_at desc);\n\nalter table public.store_price_region_overrides enable row level security;\nalter table public.store_paddle_sync_log enable row level security;\nalter table public.store_email_log enable row level security;\n\ncommit;\n"
PADDLE_SERVER = 'import "server-only";\n\nimport { createAdminClient } from "@/lib/supabase/admin";\n\nexport type PaddleEnvironment = "sandbox" | "production";\n\nconst REQUIRED_WEBHOOK_EVENTS = [\n  "transaction.completed",\n  "transaction.canceled",\n  "transaction.payment_failed",\n  "adjustment.created",\n  "adjustment.updated",\n] as const;\n\ntype SupabaseAdmin = ReturnType<typeof createAdminClient>;\n\nexport function paddleEnvironment(): PaddleEnvironment {\n  const value = (process.env.PADDLE_ENVIRONMENT ?? "sandbox").trim().toLowerCase();\n  return value === "production" || value === "live" ? "production" : "sandbox";\n}\n\nexport function paddleApiBase() {\n  return paddleEnvironment() === "sandbox"\n    ? "https://sandbox-api.paddle.com"\n    : "https://api.paddle.com";\n}\n\nfunction paddleKey() {\n  const value = process.env.PADDLE_API_KEY?.trim();\n  if (!value) throw new Error("PADDLE_API_KEY is not configured.");\n  return value;\n}\n\nasync function paddleRequest<T>(\n  path: string,\n  init: RequestInit = {},\n): Promise<T> {\n  const response = await fetch(`${paddleApiBase()}${path}`, {\n    ...init,\n    headers: {\n      Authorization: `Bearer ${paddleKey()}`,\n      "Content-Type": "application/json",\n      "Paddle-Version": "1",\n      ...(init.headers ?? {}),\n    },\n    cache: "no-store",\n  });\n\n  const payload = (await response.json().catch(() => null)) as\n    | T\n    | { error?: { detail?: string } }\n    | null;\n\n  if (!response.ok) {\n    const detail =\n      payload &&\n      typeof payload === "object" &&\n      "error" in payload\n        ? payload.error?.detail\n        : null;\n    throw new Error(detail || `Paddle request failed with HTTP ${response.status}.`);\n  }\n\n  return payload as T;\n}\n\nasync function logSync(\n  admin: SupabaseAdmin,\n  input: {\n    entityType: "product" | "price" | "webhook" | "refund";\n    entityId?: string | null;\n    action: string;\n    status: "success" | "error";\n    paddleId?: string | null;\n    message?: string | null;\n  },\n) {\n  await admin.from("store_paddle_sync_log").insert({\n    environment: paddleEnvironment(),\n    entity_type: input.entityType,\n    entity_id: input.entityId ?? null,\n    action: input.action,\n    status: input.status,\n    paddle_id: input.paddleId ?? null,\n    message: input.message ?? null,\n  });\n}\n\nfunction currentProductId(product: {\n  paddle_product_id_sandbox?: string | null;\n  paddle_product_id_live?: string | null;\n}) {\n  return paddleEnvironment() === "production"\n    ? product.paddle_product_id_live\n    : product.paddle_product_id_sandbox;\n}\n\nexport function currentPriceId(price: {\n  paddle_price_id?: string | null;\n  paddle_price_id_sandbox?: string | null;\n  paddle_price_id_live?: string | null;\n}) {\n  const environmentId =\n    paddleEnvironment() === "production"\n      ? price.paddle_price_id_live\n      : price.paddle_price_id_sandbox;\n\n  return environmentId || price.paddle_price_id || null;\n}\n\nfunction publicImageUrl(value: string | null | undefined) {\n  const image = value?.trim();\n  return image?.startsWith("https://") ? image : null;\n}\n\nexport async function syncStoreProductToPaddle(\n  productId: string,\n  admin = createAdminClient(),\n) {\n  const { data: product, error: productError } = await admin\n    .from("store_products")\n    .select(\n      "id, slug, name, description, image_url, is_active, paddle_product_id_sandbox, paddle_product_id_live",\n    )\n    .eq("id", productId)\n    .single();\n\n  if (productError || !product) {\n    throw new Error(productError?.message ?? "Store product not found.");\n  }\n\n  const { data: prices, error: pricesError } = await admin\n    .from("store_product_prices")\n    .select(\n      "id, product_id, currency, money_amount_minor, is_active, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live",\n    )\n    .eq("product_id", productId);\n\n  if (pricesError) throw new Error(pricesError.message);\n\n  let paddleProductId = currentProductId(product);\n\n  try {\n    const productPayload = {\n      name: product.name,\n      description: product.description || null,\n      tax_category: "standard",\n      image_url: publicImageUrl(product.image_url),\n      status: product.is_active ? "active" : "archived",\n      custom_data: {\n        sepulchria_store_product_id: product.id,\n        sepulchria_store_slug: product.slug,\n      },\n    };\n\n    if (paddleProductId) {\n      await paddleRequest<{ data: { id: string } }>(\n        `/products/${paddleProductId}`,\n        { method: "PATCH", body: JSON.stringify(productPayload) },\n      );\n    } else {\n      const created = await paddleRequest<{ data: { id: string } }>(\n        "/products",\n        { method: "POST", body: JSON.stringify(productPayload) },\n      );\n      paddleProductId = created.data.id;\n    }\n\n    await admin\n      .from("store_products")\n      .update({\n        ...(paddleEnvironment() === "production"\n          ? { paddle_product_id_live: paddleProductId }\n          : { paddle_product_id_sandbox: paddleProductId }),\n        paddle_sync_status: "synced",\n        paddle_sync_error: null,\n        paddle_synced_at: new Date().toISOString(),\n      })\n      .eq("id", product.id);\n\n    await logSync(admin, {\n      entityType: "product",\n      entityId: product.id,\n      action: "sync",\n      status: "success",\n      paddleId: paddleProductId,\n    });\n  } catch (error) {\n    const message = error instanceof Error ? error.message : String(error);\n    await admin\n      .from("store_products")\n      .update({ paddle_sync_status: "error", paddle_sync_error: message })\n      .eq("id", product.id);\n    await logSync(admin, {\n      entityType: "product",\n      entityId: product.id,\n      action: "sync",\n      status: "error",\n      paddleId: paddleProductId,\n      message,\n    });\n    throw error;\n  }\n\n  for (const price of prices ?? []) {\n    if (price.money_amount_minor === null || !price.currency) continue;\n\n    const { data: overrides, error: overridesError } = await admin\n      .from("store_price_region_overrides")\n      .select("country_codes, currency, money_amount_minor")\n      .eq("price_id", price.id)\n      .eq("is_active", true)\n      .order("created_at", { ascending: true });\n\n    if (overridesError) throw new Error(overridesError.message);\n\n    let paddlePriceId = currentPriceId(price);\n\n    const pricePayload = {\n      description: `Sepulchria Store · ${product.name} · ${price.currency}`,\n      name: `${product.name} · ${price.currency}`,\n      unit_price: {\n        amount: String(price.money_amount_minor),\n        currency_code: String(price.currency).toUpperCase(),\n      },\n      unit_price_overrides: (overrides ?? []).map((override) => ({\n        country_codes: override.country_codes,\n        unit_price: {\n          amount: String(override.money_amount_minor),\n          currency_code: String(override.currency).toUpperCase(),\n        },\n      })),\n      tax_mode: "account_setting",\n      quantity: { minimum: 1, maximum: 1 },\n      status: price.is_active ? "active" : "archived",\n      custom_data: {\n        sepulchria_store_product_id: product.id,\n        sepulchria_store_price_id: price.id,\n      },\n    };\n\n    try {\n      if (paddlePriceId) {\n        await paddleRequest<{ data: { id: string } }>(\n          `/prices/${paddlePriceId}`,\n          { method: "PATCH", body: JSON.stringify(pricePayload) },\n        );\n      } else {\n        const created = await paddleRequest<{ data: { id: string } }>(\n          "/prices",\n          {\n            method: "POST",\n            body: JSON.stringify({\n              product_id: paddleProductId,\n              ...pricePayload,\n            }),\n          },\n        );\n        paddlePriceId = created.data.id;\n      }\n\n      await admin\n        .from("store_product_prices")\n        .update({\n          paddle_price_id: paddlePriceId,\n          ...(paddleEnvironment() === "production"\n            ? { paddle_price_id_live: paddlePriceId }\n            : { paddle_price_id_sandbox: paddlePriceId }),\n          paddle_sync_status: "synced",\n          paddle_sync_error: null,\n          paddle_synced_at: new Date().toISOString(),\n        })\n        .eq("id", price.id);\n\n      await logSync(admin, {\n        entityType: "price",\n        entityId: price.id,\n        action: "sync",\n        status: "success",\n        paddleId: paddlePriceId,\n      });\n    } catch (error) {\n      const message = error instanceof Error ? error.message : String(error);\n      await admin\n        .from("store_product_prices")\n        .update({ paddle_sync_status: "error", paddle_sync_error: message })\n        .eq("id", price.id);\n      await logSync(admin, {\n        entityType: "price",\n        entityId: price.id,\n        action: "sync",\n        status: "error",\n        paddleId: paddlePriceId,\n        message,\n      });\n      throw error;\n    }\n  }\n\n  return { paddleProductId };\n}\n\nexport async function syncAllStoreProductsToPaddle() {\n  const admin = createAdminClient();\n  const { data: products, error } = await admin\n    .from("store_products")\n    .select("id")\n    .order("created_at", { ascending: true });\n\n  if (error) throw new Error(error.message);\n\n  let synced = 0;\n  const errors: string[] = [];\n\n  for (const product of products ?? []) {\n    try {\n      await syncStoreProductToPaddle(product.id, admin);\n      synced += 1;\n    } catch (error) {\n      errors.push(\n        `${product.id}: ${error instanceof Error ? error.message : String(error)}`,\n      );\n    }\n  }\n\n  return { synced, failed: errors.length, errors };\n}\n\nexport async function ensureStorePriceReadyForCheckout(priceId: string) {\n  const admin = createAdminClient();\n\n  const { data: price, error } = await admin\n    .from("store_product_prices")\n    .select(\n      "id, product_id, currency, money_amount_minor, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live",\n    )\n    .eq("id", priceId)\n    .single();\n\n  if (error || !price) throw new Error(error?.message ?? "Store price not found.");\n  if (price.money_amount_minor === null || !price.currency) {\n    throw new Error("This Store price is not a real-money price.");\n  }\n\n  await syncStoreProductToPaddle(price.product_id, admin);\n\n  const { data: refreshed, error: refreshError } = await admin\n    .from("store_product_prices")\n    .select(\n      "id, currency, money_amount_minor, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live",\n    )\n    .eq("id", priceId)\n    .single();\n\n  if (refreshError || !refreshed) {\n    throw new Error(refreshError?.message ?? "Unable to reload Store price.");\n  }\n\n  const paddlePriceId = currentPriceId(refreshed);\n  if (!paddlePriceId) throw new Error("Paddle price sync did not return a price ID.");\n\n  const remote = await paddleRequest<{\n    data: {\n      id: string;\n      unit_price: { amount: string; currency_code: string };\n      status: string;\n    };\n  }>(`/prices/${paddlePriceId}`);\n\n  if (\n    Number(remote.data.unit_price.amount) !== Number(refreshed.money_amount_minor) ||\n    remote.data.unit_price.currency_code.toUpperCase() !==\n      String(refreshed.currency).toUpperCase() ||\n    remote.data.status !== "active"\n  ) {\n    throw new Error(\n      "Paddle price validation failed after sync. Checkout was stopped before charging the customer.",\n    );\n  }\n\n  return {\n    paddlePriceId,\n    amountMinor: Number(refreshed.money_amount_minor),\n    currency: String(refreshed.currency).toUpperCase(),\n  };\n}\n\nexport async function archiveStorePaddlePrice(price: {\n  paddle_price_id?: string | null;\n  paddle_price_id_sandbox?: string | null;\n  paddle_price_id_live?: string | null;\n}) {\n  const paddlePriceId = currentPriceId(price);\n  if (!paddlePriceId) return;\n\n  await paddleRequest(`/prices/${paddlePriceId}`, {\n    method: "PATCH",\n    body: JSON.stringify({ status: "archived" }),\n  });\n}\n\nexport async function archiveStorePaddleProduct(product: {\n  paddle_product_id_sandbox?: string | null;\n  paddle_product_id_live?: string | null;\n}) {\n  const paddleProductId = currentProductId(product);\n  if (!paddleProductId) return;\n\n  await paddleRequest(`/products/${paddleProductId}`, {\n    method: "PATCH",\n    body: JSON.stringify({ status: "archived" }),\n  });\n}\n\nexport async function getPaddleWebhookReadiness() {\n  const webhookUrl =\n    process.env.PADDLE_WEBHOOK_URL?.trim() ||\n    "https://www.sepulchria.com/api/store/paddle/webhook";\n\n  const payload = await paddleRequest<{\n    data: Array<{\n      id: string;\n      destination: string;\n      active: boolean;\n      subscribed_events: Array<{ name: string } | string>;\n    }>;\n  }>("/notification-settings?per_page=200");\n\n  const destination = payload.data.find(\n    (row) => row.destination.replace(/\\/+$/, "") === webhookUrl.replace(/\\/+$/, ""),\n  );\n\n  const subscribed = new Set(\n    (destination?.subscribed_events ?? []).map((event) =>\n      typeof event === "string" ? event : event.name,\n    ),\n  );\n\n  return {\n    webhookUrl,\n    destinationId: destination?.id ?? null,\n    active: destination?.active === true,\n    missingEvents: REQUIRED_WEBHOOK_EVENTS.filter((event) => !subscribed.has(event)),\n  };\n}\n\nexport async function ensurePaddleWebhookEvents() {\n  const admin = createAdminClient();\n  const readiness = await getPaddleWebhookReadiness();\n\n  if (!readiness.destinationId) {\n    throw new Error(\n      `No Paddle notification destination exists for ${readiness.webhookUrl}. Create it once in Paddle, save its secret as PADDLE_WEBHOOK_SECRET, then use this button again.`,\n    );\n  }\n\n  try {\n    await paddleRequest(`/notification-settings/${readiness.destinationId}`, {\n      method: "PATCH",\n      body: JSON.stringify({\n        active: true,\n        destination: readiness.webhookUrl,\n        subscribed_events: [...REQUIRED_WEBHOOK_EVENTS],\n      }),\n    });\n\n    await logSync(admin, {\n      entityType: "webhook",\n      action: "configure_events",\n      status: "success",\n      paddleId: readiness.destinationId,\n    });\n  } catch (error) {\n    await logSync(admin, {\n      entityType: "webhook",\n      action: "configure_events",\n      status: "error",\n      paddleId: readiness.destinationId,\n      message: error instanceof Error ? error.message : String(error),\n    });\n    throw error;\n  }\n}\n\nexport async function requestPaddleRefund(input: {\n  orderId: string;\n  amountMinor?: number | null;\n  reason: string;\n}) {\n  const admin = createAdminClient();\n\n  const { data: order, error } = await admin\n    .from("store_orders")\n    .select("id, paddle_transaction_id, total_money_minor, status")\n    .eq("id", input.orderId)\n    .single();\n\n  if (error || !order) throw new Error(error?.message ?? "Store order not found.");\n  if (!order.paddle_transaction_id) throw new Error("This order has no Paddle transaction.");\n  if (!["fulfilled", "partially_refunded"].includes(order.status)) {\n    throw new Error(`Order status ${order.status} cannot be refunded.`);\n  }\n\n  const fullAmount = Number(order.total_money_minor ?? 0);\n  const requested = input.amountMinor ?? null;\n  const fullRefund = requested === null || requested >= fullAmount;\n\n  let body: Record<string, unknown> = {\n    action: "refund",\n    transaction_id: order.paddle_transaction_id,\n    reason: input.reason || "Sepulchria Store administrator refund",\n    type: "full",\n  };\n\n  if (!fullRefund) {\n    if (!Number.isInteger(requested) || requested <= 0) {\n      throw new Error("Partial refund amount must be a positive whole number.");\n    }\n\n    const transaction = await paddleRequest<{\n      data: {\n        details: {\n          line_items: Array<{ id: string }>;\n        };\n      };\n    }>(`/transactions/${order.paddle_transaction_id}`);\n\n    const lineItem = transaction.data.details.line_items[0];\n    if (!lineItem) throw new Error("Paddle transaction has no refundable line item.");\n\n    body = {\n      action: "refund",\n      transaction_id: order.paddle_transaction_id,\n      reason: input.reason || "Sepulchria Store administrator partial refund",\n      type: "partial",\n      items: [\n        {\n          item_id: lineItem.id,\n          type: "partial",\n          amount: String(requested),\n        },\n      ],\n    };\n  }\n\n  try {\n    const adjustment = await paddleRequest<{ data: { id: string; status: string } }>(\n      "/adjustments",\n      { method: "POST", body: JSON.stringify(body) },\n    );\n\n    await logSync(admin, {\n      entityType: "refund",\n      entityId: order.id,\n      action: fullRefund ? "full_refund" : "partial_refund",\n      status: "success",\n      paddleId: adjustment.data.id,\n      message: `Paddle refund status: ${adjustment.data.status}`,\n    });\n\n    return adjustment.data;\n  } catch (error) {\n    await logSync(admin, {\n      entityType: "refund",\n      entityId: order.id,\n      action: fullRefund ? "full_refund" : "partial_refund",\n      status: "error",\n      message: error instanceof Error ? error.message : String(error),\n    });\n    throw error;\n  }\n}\n'
EMAIL_SERVER = 'import "server-only";\n\nimport { createAdminClient } from "@/lib/supabase/admin";\n\ntype StoreEmailKind = "receipt" | "refund";\n\nasync function logEmail(input: {\n  orderId: string;\n  kind: StoreEmailKind;\n  recipient: string;\n  status: "sent" | "skipped" | "error";\n  providerMessageId?: string | null;\n  error?: string | null;\n}) {\n  const admin = createAdminClient();\n  await admin.from("store_email_log").insert({\n    order_id: input.orderId,\n    kind: input.kind,\n    recipient: input.recipient,\n    status: input.status,\n    provider_message_id: input.providerMessageId ?? null,\n    error: input.error ?? null,\n  });\n}\n\nexport async function sendStoreEmail(input: {\n  orderId: string;\n  kind: StoreEmailKind;\n  recipient: string;\n  subject: string;\n  html: string;\n}) {\n  const apiKey = process.env.RESEND_API_KEY?.trim();\n  const from = process.env.STORE_EMAIL_FROM?.trim();\n\n  if (!apiKey || !from) {\n    await logEmail({\n      orderId: input.orderId,\n      kind: input.kind,\n      recipient: input.recipient,\n      status: "skipped",\n      error: "RESEND_API_KEY or STORE_EMAIL_FROM is not configured.",\n    });\n    return { sent: false, skipped: true };\n  }\n\n  try {\n    const response = await fetch("https://api.resend.com/emails", {\n      method: "POST",\n      headers: {\n        Authorization: `Bearer ${apiKey}`,\n        "Content-Type": "application/json",\n      },\n      body: JSON.stringify({\n        from,\n        to: [input.recipient],\n        subject: input.subject,\n        html: input.html,\n      }),\n      cache: "no-store",\n    });\n\n    const payload = (await response.json().catch(() => null)) as\n      | { id?: string; message?: string }\n      | null;\n\n    if (!response.ok) {\n      throw new Error(payload?.message || `Email provider returned HTTP ${response.status}.`);\n    }\n\n    await logEmail({\n      orderId: input.orderId,\n      kind: input.kind,\n      recipient: input.recipient,\n      status: "sent",\n      providerMessageId: payload?.id ?? null,\n    });\n\n    return { sent: true, skipped: false };\n  } catch (error) {\n    const message = error instanceof Error ? error.message : String(error);\n    await logEmail({\n      orderId: input.orderId,\n      kind: input.kind,\n      recipient: input.recipient,\n      status: "error",\n      error: message,\n    });\n    throw error;\n  }\n}\n\nexport async function sendStoreOrderReceiptEmail(orderId: string) {\n  const admin = createAdminClient();\n\n  const { data: order, error } = await admin\n    .from("store_orders")\n    .select(\n      "id, user_id, payment_method, currency, total_money_minor, total_remnants, status, paid_at, created_at",\n    )\n    .eq("id", orderId)\n    .single();\n\n  if (error || !order) throw new Error(error?.message ?? "Store order not found.");\n\n  const { data: userData } = await admin.auth.admin.getUserById(order.user_id);\n  const email = userData.user?.email?.trim();\n  if (!email) return;\n\n  const { data: items } = await admin\n    .from("store_order_items")\n    .select("product_name_snapshot, quantity")\n    .eq("order_id", orderId)\n    .order("created_at", { ascending: true });\n\n  const names = (items ?? [])\n    .map((item) =>\n      Number(item.quantity ?? 1) > 1\n        ? `${item.product_name_snapshot} ×${item.quantity}`\n        : item.product_name_snapshot,\n    )\n    .join(", ");\n\n  const amount =\n    order.payment_method === "paddle"\n      ? new Intl.NumberFormat("en-GB", {\n          style: "currency",\n          currency: order.currency || "GBP",\n        }).format(Number(order.total_money_minor ?? 0) / 100)\n      : `${Number(order.total_remnants ?? 0)} Remnants`;\n\n  await sendStoreEmail({\n    orderId,\n    kind: "receipt",\n    recipient: email,\n    subject: "Your Sepulchria Store receipt",\n    html: `\n      <h1>Sepulchria Store</h1>\n      <p>Thank you for your purchase.</p>\n      <p><strong>Order:</strong> ${order.id}</p>\n      <p><strong>Items:</strong> ${names || "Sepulchria Store purchase"}</p>\n      <p><strong>Total:</strong> ${amount}</p>\n      <p><strong>Status:</strong> ${order.status}</p>\n      <p>You can review this order in your Sepulchria Store purchase history.</p>\n    `,\n  });\n}\n\nexport async function sendStoreRefundEmail(orderId: string) {\n  const admin = createAdminClient();\n\n  const { data: order, error } = await admin\n    .from("store_orders")\n    .select("id, user_id, currency, total_money_minor")\n    .eq("id", orderId)\n    .single();\n\n  if (error || !order) return;\n\n  const { data: userData } = await admin.auth.admin.getUserById(order.user_id);\n  const email = userData.user?.email?.trim();\n  if (!email) return;\n\n  const amount = new Intl.NumberFormat("en-GB", {\n    style: "currency",\n    currency: order.currency || "GBP",\n  }).format(Number(order.total_money_minor ?? 0) / 100);\n\n  await sendStoreEmail({\n    orderId,\n    kind: "refund",\n    recipient: email,\n    subject: "Your Sepulchria Store refund",\n    html: `\n      <h1>Sepulchria Store refund</h1>\n      <p>Your refund for order <strong>${order.id}</strong> has been approved.</p>\n      <p>Original order total: <strong>${amount}</strong></p>\n      <p>Paddle will return approved funds to the original payment method.</p>\n    `,\n  });\n}\n'
OPS_COMPONENT = 'import "server-only";\n\nimport {\n  configureStorePaddleWebhook,\n  deleteStoreRegionOverride,\n  refundStoreOrder,\n  saveStoreRegionOverride,\n  syncAllStorePaddle,\n  syncOneStoreProductPaddle,\n} from "@/app/(portal)/admin/store/actions";\nimport {\n  getPaddleWebhookReadiness,\n  paddleEnvironment,\n} from "@/lib/store/paddle-server";\nimport { createAdminClient } from "@/lib/supabase/admin";\n\nconst field =\n  "w-full min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none";\nconst label =\n  "mb-1 block text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756958))]";\nconst button =\n  "inline-flex items-center justify-center border border-[rgb(var(--sep-skin-c1,169_138_96))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c1,169_138_96))]";\nconst danger =\n  "inline-flex items-center justify-center border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300";\n\nfunction money(minor: number, currency: string) {\n  try {\n    return new Intl.NumberFormat("en-GB", {\n      style: "currency",\n      currency,\n    }).format(minor / 100);\n  } catch {\n    return `${currency} ${(minor / 100).toFixed(2)}`;\n  }\n}\n\nexport async function StoreCommerceOperationsAdmin() {\n  const admin = createAdminClient();\n  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();\n\n  const [\n    productsResult,\n    pricesResult,\n    overridesResult,\n    ordersResult,\n    logsResult,\n  ] = await Promise.all([\n    admin\n      .from("store_products")\n      .select("id, name, paddle_sync_status, paddle_sync_error, paddle_synced_at")\n      .order("name"),\n    admin\n      .from("store_product_prices")\n      .select(\n        "id, product_id, currency, money_amount_minor, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live, paddle_sync_status, paddle_sync_error, paddle_synced_at",\n      )\n      .not("money_amount_minor", "is", null)\n      .order("created_at"),\n    admin\n      .from("store_price_region_overrides")\n      .select("*")\n      .order("created_at"),\n    admin\n      .from("store_orders")\n      .select(\n        "id, status, payment_method, currency, total_money_minor, total_remnants, paddle_transaction_id, created_at, paid_at",\n      )\n      .gte("created_at", thirtyDaysAgo)\n      .order("created_at", { ascending: false }),\n    admin\n      .from("store_paddle_sync_log")\n      .select("*")\n      .order("created_at", { ascending: false })\n      .limit(30),\n  ]);\n\n  const error =\n    productsResult.error ??\n    pricesResult.error ??\n    overridesResult.error ??\n    ordersResult.error ??\n    logsResult.error;\n\n  if (error) throw new Error(error.message);\n\n  const products = productsResult.data ?? [];\n  const prices = pricesResult.data ?? [];\n  const overrides = overridesResult.data ?? [];\n  const orders = ordersResult.data ?? [];\n  const logs = logsResult.data ?? [];\n  const productById = new Map(products.map((product) => [product.id, product]));\n\n  let webhook:\n    | {\n        webhookUrl: string;\n        destinationId: string | null;\n        active: boolean;\n        missingEvents: readonly string[];\n      }\n    | null = null;\n  let webhookError: string | null = null;\n\n  try {\n    webhook = await getPaddleWebhookReadiness();\n  } catch (error) {\n    webhookError = error instanceof Error ? error.message : String(error);\n  }\n\n  const completed = orders.filter((order) =>\n    ["fulfilled", "partially_refunded", "refunded"].includes(order.status),\n  );\n  const failed = orders.filter((order) =>\n    ["failed", "cancelled"].includes(order.status),\n  );\n  const pending = orders.filter((order) => order.status === "pending");\n  const realMoneyByCurrency = new Map<string, number>();\n  let remnants = 0;\n\n  for (const order of completed) {\n    if (order.payment_method === "paddle" && order.currency) {\n      realMoneyByCurrency.set(\n        order.currency,\n        (realMoneyByCurrency.get(order.currency) ?? 0) +\n          Number(order.total_money_minor ?? 0),\n      );\n    } else if (order.payment_method === "remnants") {\n      remnants += Number(order.total_remnants ?? 0);\n    }\n  }\n\n  const env = paddleEnvironment();\n  const checks = [\n    ["API key", Boolean(process.env.PADDLE_API_KEY?.trim())],\n    ["Client token", Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim())],\n    ["Webhook secret", Boolean(process.env.PADDLE_WEBHOOK_SECRET?.trim())],\n    ["Checkout URL", Boolean(process.env.PADDLE_CHECKOUT_URL?.trim())],\n    ["Cron cleanup", Boolean(process.env.CRON_SECRET?.trim())],\n    ["Store email", Boolean(process.env.RESEND_API_KEY?.trim() && process.env.STORE_EMAIL_FROM?.trim())],\n    ["Webhook destination", Boolean(webhook?.destinationId)],\n    ["Required events", Boolean(webhook && webhook.active && webhook.missingEvents.length === 0)],\n  ] as const;\n\n  return (\n    <section className="mt-8 space-y-6">\n      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">\n        <div className="flex flex-wrap items-end justify-between gap-4">\n          <div>\n            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">\n              Production operations\n            </p>\n            <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">\n              Paddle sync & launch readiness\n            </h3>\n            <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">\n              Current environment: <strong>{env}</strong>. Sepulchria Store prices are the source of truth.\n            </p>\n          </div>\n          <div className="flex flex-wrap gap-2">\n            <form action={syncAllStorePaddle}>\n              <button className={button}>Sync all to Paddle</button>\n            </form>\n            <form action={configureStorePaddleWebhook}>\n              <button className={button}>Ensure webhook events</button>\n            </form>\n          </div>\n        </div>\n\n        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">\n          {checks.map(([name, ok]) => (\n            <div key={name} className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2">\n              <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">{name}</p>\n              <p className={`mt-1 text-xs ${ok ? "text-emerald-300" : "text-amber-300"}`}>\n                {ok ? "Ready" : "Needs setup"}\n              </p>\n            </div>\n          ))}\n        </div>\n\n        {webhookError ? (\n          <p className="mt-3 text-[10px] text-red-300">Webhook check: {webhookError}</p>\n        ) : webhook && webhook.missingEvents.length ? (\n          <p className="mt-3 text-[10px] text-amber-300">\n            Missing events: {webhook.missingEvents.join(", ")}\n          </p>\n        ) : null}\n\n        <div className="mt-5 space-y-2">\n          {products.map((product) => {\n            const productPrices = prices.filter((price) => price.product_id === product.id);\n            const synced = productPrices.length > 0 && productPrices.every((price) => {\n              const id =\n                env === "production"\n                  ? price.paddle_price_id_live\n                  : price.paddle_price_id_sandbox;\n              return Boolean(id) && price.paddle_sync_status === "synced";\n            });\n\n            return (\n              <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/25 px-3 py-2">\n                <div>\n                  <p className="text-xs text-[rgb(var(--sep-colour-d7c4a5))]">{product.name}</p>\n                  <p className={`mt-1 text-[8px] uppercase tracking-[0.12em] ${synced ? "text-emerald-300" : "text-amber-300"}`}>\n                    {productPrices.length ? (synced ? "Synced" : "Needs sync") : "No real-money price"}\n                  </p>\n                  {product.paddle_sync_error ? (\n                    <p className="mt-1 max-w-2xl text-[9px] text-red-300">{product.paddle_sync_error}</p>\n                  ) : null}\n                </div>\n                <form action={syncOneStoreProductPaddle}>\n                  <input type="hidden" name="product_id" value={product.id} />\n                  <button className={button}>Sync</button>\n                </form>\n              </div>\n            );\n          })}\n        </div>\n      </div>\n\n      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">\n        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">\n          Regional pricing & currencies\n        </h3>\n        <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">\n          Add Paddle location overrides. Country codes are ISO-2 values such as GB, US, FR, DE.\n        </p>\n\n        <div className="mt-4 space-y-4">\n          {prices.map((price) => (\n            <div key={price.id} className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3">\n              <p className="text-xs text-[rgb(var(--sep-colour-d7c4a5))]">\n                {productById.get(price.product_id)?.name ?? price.product_id} ·{" "}\n                {money(Number(price.money_amount_minor ?? 0), price.currency ?? "GBP")}\n              </p>\n\n              <div className="mt-2 space-y-1">\n                {overrides.filter((row) => row.price_id === price.id).map((row) => (\n                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-[rgb(var(--sep-colour-a99b89))]">\n                    <span>\n                      {row.country_codes.join(", ")} → {money(row.money_amount_minor, row.currency)}\n                    </span>\n                    <form action={deleteStoreRegionOverride}>\n                      <input type="hidden" name="id" value={row.id} />\n                      <input type="hidden" name="product_id" value={price.product_id} />\n                      <button className={danger}>Remove</button>\n                    </form>\n                  </div>\n                ))}\n              </div>\n\n              <form action={saveStoreRegionOverride} className="mt-3 grid gap-2 sm:grid-cols-4">\n                <input type="hidden" name="price_id" value={price.id} />\n                <input type="hidden" name="product_id" value={price.product_id} />\n                <label>\n                  <span className={label}>Countries</span>\n                  <input name="country_codes" placeholder="US, CA" required className={field} />\n                </label>\n                <label>\n                  <span className={label}>Currency</span>\n                  <input name="currency" placeholder="USD" maxLength={3} required className={field} />\n                </label>\n                <label>\n                  <span className={label}>Minor units</span>\n                  <input name="money_amount_minor" type="number" min="0" placeholder="499" required className={field} />\n                </label>\n                <div className="flex items-end">\n                  <button className={button}>Add & sync</button>\n                </div>\n              </form>\n            </div>\n          ))}\n        </div>\n      </div>\n\n      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">\n        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">\n          Store analytics · last 30 days\n        </h3>\n        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">\n          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Orders</p><p className="font-serif text-2xl">{orders.length}</p></div>\n          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Completed</p><p className="font-serif text-2xl">{completed.length}</p></div>\n          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Failed / cancelled</p><p className="font-serif text-2xl">{failed.length}</p></div>\n          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Pending</p><p className="font-serif text-2xl">{pending.length}</p></div>\n        </div>\n        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">\n          {[...realMoneyByCurrency].map(([currency, amount]) => (\n            <span key={currency}>{currency}: {money(amount, currency)}</span>\n          ))}\n          <span>Remnants: {remnants}</span>\n        </div>\n      </div>\n\n      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">\n        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">\n          Refunds\n        </h3>\n        <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">\n          Full refunds revoke paid Store entitlements after Paddle approves the refund. Partial refunds keep the entitlement.\n        </p>\n\n        <div className="mt-4 space-y-2">\n          {orders\n            .filter((order) =>\n              order.payment_method === "paddle" &&\n              order.paddle_transaction_id &&\n              ["fulfilled", "partially_refunded"].includes(order.status),\n            )\n            .slice(0, 20)\n            .map((order) => (\n              <form\n                key={order.id}\n                action={refundStoreOrder}\n                className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/25 p-3 md:grid-cols-[minmax(0,1fr)_150px_180px_auto]"\n              >\n                <div>\n                  <p className="text-[10px] text-[rgb(var(--sep-colour-d7c4a5))]">{order.id}</p>\n                  <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-756958))]">\n                    {money(Number(order.total_money_minor ?? 0), order.currency ?? "GBP")} · {order.status}\n                  </p>\n                </div>\n                <input type="hidden" name="order_id" value={order.id} />\n                <label>\n                  <span className={label}>Partial amount</span>\n                  <input name="amount_minor" type="number" min="1" placeholder="blank = full" className={field} />\n                </label>\n                <label>\n                  <span className={label}>Reason</span>\n                  <input name="reason" defaultValue="Customer request" className={field} />\n                </label>\n                <div className="flex items-end">\n                  <button className={danger}>Request refund</button>\n                </div>\n              </form>\n            ))}\n        </div>\n      </div>\n\n      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">\n        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">\n          Paddle audit log\n        </h3>\n        <div className="mt-3 space-y-1">\n          {logs.map((log) => (\n            <div key={log.id} className="grid gap-2 border-b border-[rgb(var(--sep-colour-60482e))]/20 py-2 text-[9px] text-[rgb(var(--sep-colour-a99b89))] md:grid-cols-[150px_100px_120px_minmax(0,1fr)]">\n              <time>{new Date(log.created_at).toLocaleString("en-GB")}</time>\n              <span>{log.environment}</span>\n              <span className={log.status === "success" ? "text-emerald-300" : "text-red-300"}>\n                {log.entity_type} · {log.status}\n              </span>\n              <span>{log.action}{log.message ? ` · ${log.message}` : ""}</span>\n            </div>\n          ))}\n        </div>\n      </div>\n    </section>\n  );\n}\n'
RECEIPT_PAGE = 'import Link from "next/link";\nimport { notFound, redirect } from "next/navigation";\n\nimport { createAdminClient } from "@/lib/supabase/admin";\nimport { createClient } from "@/lib/supabase/server";\n\nfunction money(minor: number, currency: string | null) {\n  if (!currency) return "—";\n  try {\n    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);\n  } catch {\n    return `${currency} ${(minor / 100).toFixed(2)}`;\n  }\n}\n\nexport default async function StoreReceiptPage({\n  params,\n}: {\n  params: Promise<{ id: string }>;\n}) {\n  const { id } = await params;\n  const supabase = await createClient();\n  const {\n    data: { user },\n  } = await supabase.auth.getUser();\n\n  if (!user) redirect("/auth/login");\n\n  const admin = createAdminClient();\n  const { data: order, error } = await admin\n    .from("store_orders")\n    .select("*")\n    .eq("id", id)\n    .eq("user_id", user.id)\n    .maybeSingle();\n\n  if (error) throw new Error(error.message);\n  if (!order) notFound();\n\n  const [{ data: items, error: itemsError }, { data: emails, error: emailsError }] =\n    await Promise.all([\n      admin\n        .from("store_order_items")\n        .select("*")\n        .eq("order_id", order.id)\n        .order("created_at"),\n      admin\n        .from("store_email_log")\n        .select("kind, status, created_at")\n        .eq("order_id", order.id)\n        .order("created_at", { ascending: false }),\n    ]);\n\n  if (itemsError || emailsError) {\n    throw new Error(itemsError?.message ?? emailsError?.message ?? "Unable to load receipt.");\n  }\n\n  const realMoney = order.payment_method === "paddle";\n  const subtotal = realMoney\n    ? money(Number(order.subtotal_money_minor ?? 0), order.currency)\n    : `${Number(order.subtotal_remnants ?? 0)} Remnants`;\n  const discount = realMoney\n    ? money(Number(order.discount_money_minor ?? 0), order.currency)\n    : `${Number(order.discount_remnants ?? 0)} Remnants`;\n  const total = realMoney\n    ? money(Number(order.total_money_minor ?? 0), order.currency)\n    : `${Number(order.total_remnants ?? 0)} Remnants`;\n\n  return (\n    <main className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">\n      <div className="mx-auto max-w-3xl border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">\n        <div className="flex flex-wrap items-start justify-between gap-4">\n          <div>\n            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">\n              Sepulchria Store\n            </p>\n            <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">\n              Receipt\n            </h1>\n          </div>\n          <Link\n            href="/store"\n            className="border border-[rgb(var(--sep-colour-60482e))]/45 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7c4a5))]"\n          >\n            Back to Store\n          </Link>\n        </div>\n\n        <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">\n          <p><span className="text-[rgb(var(--sep-colour-756958))]">Order:</span> {order.id}</p>\n          <p><span className="text-[rgb(var(--sep-colour-756958))]">Status:</span> {String(order.status).replaceAll("_", " ")}</p>\n          <p><span className="text-[rgb(var(--sep-colour-756958))]">Payment:</span> {realMoney ? "Paddle" : "Remnants"}</p>\n          <p><span className="text-[rgb(var(--sep-colour-756958))]">Date:</span> {new Date(order.paid_at ?? order.created_at).toLocaleString("en-GB")}</p>\n          {order.paddle_transaction_id ? (\n            <p className="sm:col-span-2 break-all">\n              <span className="text-[rgb(var(--sep-colour-756958))]">Paddle transaction:</span> {order.paddle_transaction_id}\n            </p>\n          ) : null}\n        </div>\n\n        <div className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4">\n          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Items</h2>\n          <div className="mt-3 space-y-2">\n            {(items ?? []).map((item) => (\n              <div key={item.id} className="flex justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/20 pb-2 text-xs">\n                <span>{item.product_name_snapshot}</span>\n                <span>×{item.quantity}</span>\n              </div>\n            ))}\n          </div>\n        </div>\n\n        <div className="mt-5 space-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 text-xs">\n          <div className="flex justify-between"><span>Subtotal</span><span>{subtotal}</span></div>\n          <div className="flex justify-between"><span>Discount</span><span>{discount}</span></div>\n          <div className="flex justify-between font-semibold text-[rgb(var(--sep-colour-ead5ac))]"><span>Total</span><span>{total}</span></div>\n        </div>\n\n        {(emails ?? []).length ? (\n          <div className="mt-5 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4">\n            <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">\n              Email records\n            </p>\n            {(emails ?? []).map((email, index) => (\n              <p key={`${email.kind}-${index}`} className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a99b89))]">\n                {email.kind} · {email.status} · {new Date(email.created_at).toLocaleString("en-GB")}\n              </p>\n            ))}\n          </div>\n        ) : null}\n      </div>\n    </main>\n  );\n}\n'
CRON_ROUTE = 'import { NextResponse } from "next/server";\n\nimport { createAdminClient } from "@/lib/supabase/admin";\n\nexport const runtime = "nodejs";\n\nexport async function GET(request: Request) {\n  const secret = process.env.CRON_SECRET?.trim();\n  const authorization = request.headers.get("authorization");\n\n  if (!secret || authorization !== `Bearer ${secret}`) {\n    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });\n  }\n\n  const admin = createAdminClient();\n  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();\n\n  const { data, error } = await admin\n    .from("store_orders")\n    .update({ status: "failed" })\n    .eq("status", "pending")\n    .lt("created_at", cutoff)\n    .select("id");\n\n  if (error) {\n    return NextResponse.json({ error: error.message }, { status: 500 });\n  }\n\n  return NextResponse.json({\n    ok: true,\n    abandonedOrdersClosed: data?.length ?? 0,\n  });\n}\n'
WEBHOOK_FULL = 'import { createHmac, timingSafeEqual } from "node:crypto";\nimport { NextResponse } from "next/server";\n\nimport { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";\nimport {\n  sendStoreOrderReceiptEmail,\n  sendStoreRefundEmail,\n} from "@/lib/store/store-email";\nimport { storeDestinationForCategory } from "@/lib/store/store-destination";\nimport { createAdminClient } from "@/lib/supabase/admin";\n\nexport const runtime = "nodejs";\n\nfunction verifySignature(rawBody: string, header: string, secret: string) {\n  const parts = header.split(";").map((part) => part.trim());\n  const timestamp = parts.find((part) => part.startsWith("ts="))?.slice(3) ?? "";\n  const signatures = parts.filter((part) => part.startsWith("h1=")).map((part) => part.slice(3));\n  if (!timestamp || !signatures.length) return false;\n  const ts = Number(timestamp);\n  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;\n  const expected = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`, "utf8").digest("hex");\n  return signatures.some((signature) => {\n    const a = Buffer.from(expected, "utf8");\n    const b = Buffer.from(signature, "utf8");\n    return a.length === b.length && timingSafeEqual(a, b);\n  });\n}\n\ntype PaddleEvent = {\n  event_type?: string;\n  data?: {\n    id?: string;\n    customer_id?: string | null;\n    transaction_id?: string | null;\n    action?: string | null;\n    status?: string | null;\n    type?: string | null;\n    custom_data?: { store_order_id?: string } | null;\n    details?: { totals?: { total?: string | null } | null } | null;\n  };\n};\n\nexport async function POST(request: Request) {\n  const secret = process.env.PADDLE_WEBHOOK_SECRET;\n  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 500 });\n\n  const rawBody = await request.text();\n  const signature = request.headers.get("paddle-signature") ?? "";\n  if (!verifySignature(rawBody, signature, secret)) {\n    return NextResponse.json({ error: "Invalid Paddle signature." }, { status: 401 });\n  }\n\n  const event = JSON.parse(rawBody) as PaddleEvent;\n  const admin = createAdminClient();\n\n  if (event.event_type === "transaction.canceled" || event.event_type === "transaction.payment_failed") {\n    const transactionId = event.data?.id;\n    const orderId = event.data?.custom_data?.store_order_id;\n    const nextStatus = event.event_type === "transaction.canceled" ? "cancelled" : "failed";\n\n    if (orderId || transactionId) {\n      let query = admin.from("store_orders").update({\n        status: nextStatus,\n        ...(nextStatus === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),\n      });\n      query = orderId ? query.eq("id", orderId) : query.eq("paddle_transaction_id", transactionId!);\n      const { error } = await query;\n      if (error) return NextResponse.json({ error: error.message }, { status: 500 });\n    }\n\n    return NextResponse.json({ ok: true });\n  }\n\n  if (event.event_type === "adjustment.created" || event.event_type === "adjustment.updated") {\n    const adjustment = event.data;\n    const transactionId = adjustment?.transaction_id;\n\n    if (adjustment?.action !== "refund" || adjustment.status !== "approved" || !transactionId) {\n      return NextResponse.json({ ok: true });\n    }\n\n    const { data: order, error } = await admin\n      .from("store_orders")\n      .select("id, status")\n      .eq("paddle_transaction_id", transactionId)\n      .maybeSingle();\n\n    if (error) return NextResponse.json({ error: error.message }, { status: 500 });\n    if (!order) return NextResponse.json({ ok: true });\n\n    if (adjustment.type === "full") {\n      if (order.status !== "refunded") {\n        const { error: revokeError } = await admin.rpc(\n          "revoke_store_order_entitlements",\n          { p_order_id: order.id },\n        );\n        if (revokeError) {\n          return NextResponse.json({ error: revokeError.message }, { status: 500 });\n        }\n\n        try {\n          await sendStoreRefundEmail(order.id);\n        } catch (emailError) {\n          console.error("Refund approved, but Store refund email failed:", emailError);\n        }\n      }\n    } else if (order.status !== "refunded") {\n      const { error: partialError } = await admin\n        .from("store_orders")\n        .update({ status: "partially_refunded" })\n        .eq("id", order.id);\n\n      if (partialError) {\n        return NextResponse.json({ error: partialError.message }, { status: 500 });\n      }\n    }\n\n    return NextResponse.json({ ok: true });\n  }\n\n  if (event.event_type !== "transaction.completed") {\n    return NextResponse.json({ ok: true });\n  }\n\n  const transactionId = event.data?.id;\n  const orderId = event.data?.custom_data?.store_order_id;\n  if (!transactionId || !orderId) {\n    return NextResponse.json(\n      { error: "Paddle transaction is missing Store metadata." },\n      { status: 400 },\n    );\n  }\n\n  const { data: order, error: orderError } = await admin\n    .from("store_orders")\n    .select("id, character_id, user_id, status, paddle_transaction_id, subtotal_money_minor")\n    .eq("id", orderId)\n    .maybeSingle();\n\n  if (orderError || !order) {\n    return NextResponse.json(\n      { error: orderError?.message ?? "Store order not found." },\n      { status: 404 },\n    );\n  }\n\n  if (order.paddle_transaction_id && order.paddle_transaction_id !== transactionId) {\n    return NextResponse.json(\n      { error: "Paddle transaction does not match Store order." },\n      { status: 409 },\n    );\n  }\n\n  if (order.status === "fulfilled") {\n    await admin.rpc("finalize_store_discount_redemption", { p_order_id: orderId });\n    await admin.rpc("issue_store_post_purchase_offers", { p_order_id: orderId });\n    return NextResponse.json({ ok: true });\n  }\n\n  const actualTotal = Number(event.data?.details?.totals?.total);\n  const subtotal = Number(order.subtotal_money_minor ?? 0);\n  const hasActualTotal = Number.isInteger(actualTotal) && actualTotal >= 0;\n  const totalMoneyMinor = hasActualTotal ? actualTotal : subtotal;\n  const discountMoneyMinor = Math.max(0, subtotal - totalMoneyMinor);\n\n  const { error: paidError } = await admin\n    .from("store_orders")\n    .update({\n      status: "paid",\n      paid_at: new Date().toISOString(),\n      paddle_transaction_id: transactionId,\n      paddle_customer_id: event.data?.customer_id ?? null,\n      total_money_minor: totalMoneyMinor,\n      discount_money_minor: discountMoneyMinor,\n    })\n    .eq("id", orderId);\n\n  if (paidError) return NextResponse.json({ error: paidError.message }, { status: 500 });\n\n  const { error: fulfilError } = await admin.rpc("fulfil_store_order", { p_order_id: orderId });\n  if (fulfilError) return NextResponse.json({ error: fulfilError.message }, { status: 500 });\n\n  const { data: item } = await admin\n    .from("store_order_items")\n    .select("product_name_snapshot, category_snapshot")\n    .eq("order_id", orderId)\n    .order("created_at", { ascending: true })\n    .limit(1)\n    .maybeSingle();\n\n  try {\n    await createPremiumFeatureGrantNotification({\n      characterId: order.character_id,\n      createdBy: order.user_id,\n      title: "Store purchase complete",\n      body: `You purchased ${item?.product_name_snapshot ?? "a Store product"}. Your unlock is available immediately.`,\n      href: storeDestinationForCategory(item?.category_snapshot),\n    });\n  } catch (notificationError) {\n    console.error(\n      "Paddle Store purchase was fulfilled, but its notification could not be created:",\n      notificationError,\n    );\n  }\n\n  try {\n    await sendStoreOrderReceiptEmail(orderId);\n  } catch (emailError) {\n    console.error("Store purchase was fulfilled, but receipt email failed:", emailError);\n  }\n\n  return NextResponse.json({ ok: true });\n}\n'

from pathlib import Path
import re

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Could not find expected {label}. Patch stopped.")
    return text.replace(old, new, 1)

Path("sepulchria_store_phase7_production_commerce.sql").write_text(SQL_TEXT, encoding="utf-8")
Path("lib/store").mkdir(parents=True, exist_ok=True)
Path("lib/store/paddle-server.ts").write_text(PADDLE_SERVER, encoding="utf-8")
Path("lib/store/store-email.ts").write_text(EMAIL_SERVER, encoding="utf-8")
Path("components/admin/store-commerce-operations.tsx").write_text(OPS_COMPONENT, encoding="utf-8")

receipt = Path("app/(portal)/store/orders/[id]/page.tsx")
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(RECEIPT_PAGE, encoding="utf-8")

cron = Path("app/api/cron/store-abandoned-checkouts/route.ts")
cron.parent.mkdir(parents=True, exist_ok=True)
cron.write_text(CRON_ROUTE, encoding="utf-8")

Path("app/api/store/paddle/webhook/route.ts").write_text(WEBHOOK_FULL, encoding="utf-8")

env_path = Path(".env.example")
env = env_path.read_text(encoding="utf-8")
if "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=" not in env:
    env += "\nNEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your-paddle-client-side-token\n"
if "PADDLE_WEBHOOK_URL=" not in env:
    env += "PADDLE_WEBHOOK_URL=https://www.sepulchria.com/api/store/paddle/webhook\n"
if "CRON_SECRET=" not in env:
    env += "\n# Vercel Cron protection\nCRON_SECRET=generate-a-long-random-secret\n"
if "RESEND_API_KEY=" not in env:
    env += "\n# Store-branded receipts/refund emails\nRESEND_API_KEY=your-resend-api-key\nSTORE_EMAIL_FROM=Sepulchria Store <store@sepulchria.com>\n"
env_path.write_text(env, encoding="utf-8")

vercel = Path("vercel.json")
if not vercel.exists():
    vercel.write_text(
        '{\n  "crons": [\n    { "path": "/api/cron/store-abandoned-checkouts", "schedule": "17 3 * * *" }\n  ]\n}\n',
        encoding="utf-8",
    )

proxy_path = Path("lib/supabase/proxy.ts")
proxy = proxy_path.read_text(encoding="utf-8")
if '"/api/cron/store-abandoned-checkouts",' not in proxy:
    proxy = replace_once(
        proxy,
        '  "/api/store/paddle/webhook",',
        '  "/api/store/paddle/webhook",\n  "/api/cron/store-abandoned-checkouts",',
        "cron public route",
    )
proxy_path.write_text(proxy, encoding="utf-8")

# Admin actions: imports + extra actions. Existing CRUD stays intact; save price
# is changed to auto-sync and ignore manual Paddle ID.
actions_path = Path("app/(portal)/admin/store/actions.ts")
actions = actions_path.read_text(encoding="utf-8")
if '@/lib/store/paddle-server' not in actions:
    actions = replace_once(
        actions,
        'import { createAdminClient } from "@/lib/supabase/admin";',
        'import { createAdminClient } from "@/lib/supabase/admin";\nimport { ensurePaddleWebhookEvents, requestPaddleRefund, syncAllStoreProductsToPaddle, syncStoreProductToPaddle } from "@/lib/store/paddle-server";',
        "admin Paddle imports",
    )

# Save-price function: keep existing shape, but Paddle ID becomes automatic and sync happens after insert.
actions = actions.replace(
    '  const requestedPaddlePriceId =\n    nullableStr(formData, "paddle_price_id");\n',
    '',
    1,
)
actions = actions.replace(
    '  const paddlePriceId =\n    moneyAmountMinor !== null\n      ? requestedPaddlePriceId\n      : null;\n\n',
    '',
    1,
)
actions = actions.replace(
    '    paddle_price_id: paddlePriceId,\n    is_active: true,',
    '    paddle_price_id: null,\n    paddle_sync_status: moneyAmountMinor !== null ? "not_synced" : "synced",\n    is_active: true,',
    1,
)
actions = actions.replace(
    '  if (error) throw new Error(`Unable to save store price: ${error.message}`);\n  refresh();',
    '  if (error) throw new Error(`Unable to save store price: ${error.message}`);\n  if (moneyAmountMinor !== null) await syncStoreProductToPaddle(productId);\n  refresh();',
    1,
)

# Product updates should trigger sync after successful update.
needle = '  if (error) throw new Error(`Unable to update store product: ${error.message}`);\n  refresh();'
if needle in actions:
    actions = actions.replace(
        needle,
        '  if (error) throw new Error(`Unable to update store product: ${error.message}`);\n  await syncStoreProductToPaddle(str(formData, "id"));\n  refresh();',
        1,
    )

if "export async function syncAllStorePaddle" not in actions:
    actions += '''

export async function syncOneStoreProductPaddle(formData: FormData) {
  await requireAdminSection("store");
  await syncStoreProductToPaddle(str(formData, "product_id"));
  refresh();
}

export async function syncAllStorePaddle() {
  await requireAdminSection("store");
  const result = await syncAllStoreProductsToPaddle();
  if (result.failed) {
    throw new Error(`Paddle sync completed with ${result.failed} failure(s): ${result.errors.join(" | ")}`);
  }
  refresh();
}

export async function configureStorePaddleWebhook() {
  await requireAdminSection("store");
  await ensurePaddleWebhookEvents();
  refresh();
}

export async function saveStoreRegionOverride(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();
  const priceId = str(formData, "price_id");
  const productId = str(formData, "product_id");
  const countryCodes = str(formData, "country_codes")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

  if (!countryCodes.length || countryCodes.some((code) => code.length !== 2)) {
    throw new Error("Enter ISO-2 country codes separated by commas.");
  }

  const currency = str(formData, "currency").toUpperCase();
  const amount = intOrNull(formData, "money_amount_minor");
  if (currency.length !== 3 || amount === null || amount < 0) {
    throw new Error("Enter a valid currency and regional price.");
  }

  const { error } = await admin.from("store_price_region_overrides").insert({
    price_id: priceId,
    country_codes: countryCodes,
    currency,
    money_amount_minor: amount,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  await syncStoreProductToPaddle(productId);
  refresh();
}

export async function deleteStoreRegionOverride(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();
  const { error } = await admin
    .from("store_price_region_overrides")
    .delete()
    .eq("id", str(formData, "id"));

  if (error) throw new Error(error.message);
  await syncStoreProductToPaddle(str(formData, "product_id"));
  refresh();
}

export async function refundStoreOrder(formData: FormData) {
  await requireAdminSection("store");
  const rawAmount = str(formData, "amount_minor");
  await requestPaddleRefund({
    orderId: str(formData, "order_id"),
    amountMinor: rawAmount ? Number(rawAmount) : null,
    reason: str(formData, "reason") || "Customer request",
  });
  refresh();
}
'''
actions_path.write_text(actions, encoding="utf-8")

admin_page_path = Path("app/(portal)/admin/store/page.tsx")
admin_page = admin_page_path.read_text(encoding="utf-8")
if "StoreCommerceOperationsAdmin" not in admin_page:
    admin_page = replace_once(
        admin_page,
        'import { StorePostPurchaseOffersAdmin } from "@/components/admin/store-post-purchase-offers";',
        'import { StorePostPurchaseOffersAdmin } from "@/components/admin/store-post-purchase-offers";\nimport { StoreCommerceOperationsAdmin } from "@/components/admin/store-commerce-operations";',
        "commerce ops import",
    )
if "<StoreCommerceOperationsAdmin />" not in admin_page:
    admin_page = replace_once(
        admin_page,
        '<section id="store-create-product"',
        '<StoreCommerceOperationsAdmin />\n\n        <section id="store-create-product"',
        "commerce ops render",
    )
admin_page = admin_page.replace(
    '<label>\n                            <span className={label}>Paddle Price ID</span>\n                            <input name="paddle_price_id" placeholder="later" className={field} />\n                          </label>',
    '<div className="border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-756958))]">Paddle IDs are created and maintained automatically.</div>',
    1,
)
admin_page_path.write_text(admin_page, encoding="utf-8")

# Checkout server action: select explicit Store price, sync/verify before transaction.
store_actions_path = Path("app/(portal)/store/actions.ts")
store_actions = store_actions_path.read_text(encoding="utf-8")
if "ensureStorePriceReadyForCheckout" not in store_actions:
    store_actions = replace_once(
        store_actions,
        'import { createAdminClient } from "@/lib/supabase/admin";',
        'import { createAdminClient } from "@/lib/supabase/admin";\nimport { ensureStorePriceReadyForCheckout } from "@/lib/store/paddle-server";',
        "checkout Paddle helper import",
    )

paddle_marker = '  const productId = String(formData.get("productId") ?? "").trim();\n  const discountCode = String(formData.get("discountCode") ?? "").trim();\n  const apiKey = process.env.PADDLE_API_KEY;'
if paddle_marker in store_actions:
    store_actions = store_actions.replace(
        paddle_marker,
        '  const productId = String(formData.get("productId") ?? "").trim();\n  const priceId = String(formData.get("priceId") ?? "").trim();\n  const discountCode = String(formData.get("discountCode") ?? "").trim();\n  const apiKey = process.env.PADDLE_API_KEY;',
        1,
    )

old_price_query = '''      admin.from("store_product_prices")
        .select("id, currency, money_amount_minor, paddle_price_id, is_active")
        .eq("product_id", productId)
        .eq("is_active", true)
        .not("money_amount_minor", "is", null)
        .not("paddle_price_id", "is", null)
        .limit(1)
        .maybeSingle(),'''
new_price_query = '''      admin.from("store_product_prices")
        .select("id, currency, money_amount_minor, paddle_price_id, is_active")
        .eq("product_id", productId)
        .eq("id", priceId)
        .eq("is_active", true)
        .not("money_amount_minor", "is", null)
        .maybeSingle(),'''
if old_price_query in store_actions:
    store_actions = store_actions.replace(old_price_query, new_price_query, 1)

product_block = '''  const product = productResult.data;
  const price = priceResult.data;
  const character = characterResult.data;'''
if product_block in store_actions and "syncedPaddlePriceId" not in store_actions:
    store_actions = store_actions.replace(
        product_block,
        product_block + '''

  let syncedPaddlePriceId: string;
  try {
    const synced = await ensureStorePriceReadyForCheckout(price.id);
    syncedPaddlePriceId = synced.paddlePriceId;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Paddle price synchronization failed.",
      checkoutUrl: null,
      transactionId: null,
      customerEmail: null,
    };
  }''',
        1,
    )

store_actions = store_actions.replace(
    '      items: [{ price_id: price.paddle_price_id, quantity: 1 }],\n      currency_code: price.currency,',
    '      items: [{ price_id: syncedPaddlePriceId, quantity: 1 }],',
    1,
)
store_actions_path.write_text(store_actions, encoding="utf-8")

button_path = Path("components/store/store-paddle-purchase-button.tsx")
button = button_path.read_text(encoding="utf-8")
if "priceId," not in button.split("export function StorePaddlePurchaseButton",1)[1].split("}) {",1)[0]:
    button = button.replace(
        '''export function StorePaddlePurchaseButton({
  productId,
  label,
}: {
  productId: string;
  label: string;
}) {''',
        '''export function StorePaddlePurchaseButton({
  productId,
  priceId,
  label,
}: {
  productId: string;
  priceId: string;
  label: string;
}) {''',
        1,
    )
    button = button.replace(
        '      <input type="hidden" name="productId" value={productId} />',
        '      <input type="hidden" name="productId" value={productId} />\n      <input type="hidden" name="priceId" value={priceId} />',
        1,
    )
button_path.write_text(button, encoding="utf-8")

store_page_path = Path("app/(portal)/store/page.tsx")
store_page = store_page_path.read_text(encoding="utf-8")
old_buttons = '''              {moneyPrices.length &&
              prices.some((price) => Boolean(price.paddle_price_id) && price.money_amount_minor !== null) ? (
                <StorePaddlePurchaseButton
                  productId={product.id}
                  label={moneyPrices[0].label}
                />
              ) : null}'''
new_buttons = '''              {moneyPrices.length
                ? moneyPrices.map((moneyPrice) => (
                    <StorePaddlePurchaseButton
                      key={moneyPrice.id}
                      productId={product.id}
                      priceId={moneyPrice.id}
                      label={moneyPrice.label}
                    />
                  ))
                : null}'''
if old_buttons in store_page:
    store_page = store_page.replace(old_buttons, new_buttons, 1)
else:
    raise SystemExit("Could not find Store Paddle button block.")
store_page_path.write_text(store_page, encoding="utf-8")

account_path = Path("components/store/store-account-panels.tsx")
account = account_path.read_text(encoding="utf-8")
if 'import Link from "next/link";' not in account:
    account = account.replace('import "server-only";', 'import "server-only";\n\nimport Link from "next/link";', 1)

date_block = '<time className="text-[8px] text-[rgb(var(--sep-colour-756958))]">{new Date(order.paid_at ?? order.created_at).toLocaleString("en-GB")}</time>'
if date_block in account:
    account = account.replace(
        date_block,
        '''<div className="flex flex-col gap-1">
                    <time className="text-[8px] text-[rgb(var(--sep-colour-756958))]">{new Date(order.paid_at ?? order.created_at).toLocaleString("en-GB")}</time>
                    <Link href={`/store/orders/${order.id}`} className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c69b5c))] underline">View receipt</Link>
                  </div>''',
        1,
    )
else:
    raise SystemExit("Could not find Store account date block.")
account_path.write_text(account, encoding="utf-8")

print("Phase 7 production commerce patch applied.")
print("Generated SQL: sepulchria_store_phase7_production_commerce.sql")
print("Next: run the SQL in Supabase, then npm run build.")
