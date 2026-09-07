import "server-only";

import { AdminActionForm, AdminCollapsibleSection } from "@/components/admin/admin-action-ui";

import {
  configureStorePaddleWebhook,
  deleteStoreRegionOverride,
  refundStoreOrder,
  saveStoreRegionOverride,
  syncAllStorePaddle,
  syncOneStoreProductPaddle,
} from "@/app/(portal)/admin/store/actions";
import {
  getPaddleWebhookReadiness,
  paddleEnvironment,
} from "@/lib/store/paddle-server";
import { createAdminClient } from "@/lib/supabase/admin";

const field =
  "w-full min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none";
const label =
  "mb-1 block text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756958))]";
const button =
  "inline-flex items-center justify-center border border-[rgb(var(--sep-skin-c1,169_138_96))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c1,169_138_96))]";
const danger =
  "inline-flex items-center justify-center border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300";

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export async function StoreCommerceOperationsAdmin() {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    productsResult,
    pricesResult,
    overridesResult,
    ordersResult,
    logsResult,
  ] = await Promise.all([
    admin
      .from("store_products")
      .select("id, name, paddle_sync_status, paddle_sync_error, paddle_synced_at")
      .order("name"),
    admin
      .from("store_product_prices")
      .select(
        "id, product_id, currency, money_amount_minor, paddle_price_id, paddle_price_id_sandbox, paddle_price_id_live, paddle_sync_status, paddle_sync_error, paddle_synced_at",
      )
      .not("money_amount_minor", "is", null)
      .order("created_at"),
    admin
      .from("store_price_region_overrides")
      .select("*")
      .order("created_at"),
    admin
      .from("store_orders")
      .select(
        "id, status, payment_method, currency, total_money_minor, total_remnants, paddle_transaction_id, created_at, paid_at",
      )
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    admin
      .from("store_paddle_sync_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const error =
    productsResult.error ??
    pricesResult.error ??
    overridesResult.error ??
    ordersResult.error ??
    logsResult.error;

  if (error) throw new Error(error.message);

  const products = productsResult.data ?? [];
  const prices = pricesResult.data ?? [];
  const overrides = overridesResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const logs = logsResult.data ?? [];
  const productById = new Map(products.map((product) => [product.id, product]));

  let webhook:
    | {
        webhookUrl: string;
        destinationId: string | null;
        active: boolean;
        missingEvents: readonly string[];
      }
    | null = null;
  let webhookError: string | null = null;

  try {
    webhook = await getPaddleWebhookReadiness();
  } catch (error) {
    webhookError = error instanceof Error ? error.message : String(error);
  }

  const completed = orders.filter((order) =>
    ["fulfilled", "partially_refunded", "refunded"].includes(order.status),
  );
  const failed = orders.filter((order) =>
    ["failed", "cancelled"].includes(order.status),
  );
  const pending = orders.filter((order) => order.status === "pending");
  const realMoneyByCurrency = new Map<string, number>();
  let remnants = 0;

  for (const order of completed) {
    if (order.payment_method === "paddle" && order.currency) {
      realMoneyByCurrency.set(
        order.currency,
        (realMoneyByCurrency.get(order.currency) ?? 0) +
          Number(order.total_money_minor ?? 0),
      );
    } else if (order.payment_method === "remnants") {
      remnants += Number(order.total_remnants ?? 0);
    }
  }

  const env = paddleEnvironment();
  const checks = [
    ["API key", Boolean(process.env.PADDLE_API_KEY?.trim())],
    ["Client token", Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim())],
    ["Webhook secret", Boolean(process.env.PADDLE_WEBHOOK_SECRET?.trim())],
    ["Checkout URL", Boolean(process.env.PADDLE_CHECKOUT_URL?.trim())],
    ["Cron cleanup", Boolean(process.env.CRON_SECRET?.trim())],
    ["Store email", Boolean(process.env.RESEND_API_KEY?.trim() && process.env.STORE_EMAIL_FROM?.trim())],
    ["Webhook destination", Boolean(webhook?.destinationId)],
    ["Required events", Boolean(webhook && webhook.active && webhook.missingEvents.length === 0)],
  ] as const;

  return (
    <section className="mt-8 space-y-6">
      <AdminCollapsibleSection title="Paddle sync & launch readiness">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
              Production operations
            </p>
            <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
              Current environment: <strong>{env}</strong>. Sepulchria Store prices are the source of truth.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminActionForm action={syncAllStorePaddle} successMessage="Paddle sync completed.">
              <button className={button}>Sync all to Paddle</button>
            </AdminActionForm>
            <AdminActionForm action={configureStorePaddleWebhook} successMessage="Webhook settings updated.">
              <button className={button}>Ensure webhook events</button>
            </AdminActionForm>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {checks.map(([name, ok]) => (
            <div key={name} className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2">
              <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">{name}</p>
              <p className={`mt-1 text-xs ${ok ? "text-emerald-300" : "text-amber-300"}`}>
                {ok ? "Ready" : "Needs setup"}
              </p>
            </div>
          ))}
        </div>

        {webhookError ? (
          <p className="mt-3 text-[10px] text-red-300">Webhook check: {webhookError}</p>
        ) : webhook && webhook.missingEvents.length ? (
          <p className="mt-3 text-[10px] text-amber-300">
            Missing events: {webhook.missingEvents.join(", ")}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          {products.map((product) => {
            const productPrices = prices.filter((price) => price.product_id === product.id);
            const synced = productPrices.length > 0 && productPrices.every((price) => {
              const id =
                env === "production"
                  ? price.paddle_price_id_live
                  : price.paddle_price_id_sandbox;
              return Boolean(id) && price.paddle_sync_status === "synced";
            });

            return (
              <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/25 px-3 py-2">
                <div>
                  <p className="text-xs text-[rgb(var(--sep-colour-d7c4a5))]">{product.name}</p>
                  <p className={`mt-1 text-[8px] uppercase tracking-[0.12em] ${synced ? "text-emerald-300" : "text-amber-300"}`}>
                    {productPrices.length ? (synced ? "Synced" : "Needs sync") : "No real-money price"}
                  </p>
                  {product.paddle_sync_error ? (
                    <p className="mt-1 max-w-2xl text-[9px] text-red-300">{product.paddle_sync_error}</p>
                  ) : null}
                </div>
                <AdminActionForm action={syncOneStoreProductPaddle} successMessage="Product synced to Paddle.">
                  <input type="hidden" name="product_id" value={product.id} />
                  <button className={button}>Sync</button>
                </AdminActionForm>
              </div>
            );
          })}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Regional pricing & currencies">
        <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
          Add Paddle location overrides. Country codes are ISO-2 values such as GB, US, FR, DE.
        </p>

        <div className="mt-4 space-y-4">
          {prices.map((price) => (
            <div key={price.id} className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3">
              <p className="text-xs text-[rgb(var(--sep-colour-d7c4a5))]">
                {productById.get(price.product_id)?.name ?? price.product_id} ·{" "}
                {money(Number(price.money_amount_minor ?? 0), price.currency ?? "GBP")}
              </p>

              <div className="mt-2 space-y-1">
                {overrides.filter((row) => row.price_id === price.id).map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-[rgb(var(--sep-colour-a99b89))]">
                    <span>
                      {row.country_codes.join(", ")} → {money(row.money_amount_minor, row.currency)}
                    </span>
                    <AdminActionForm action={deleteStoreRegionOverride} successMessage="Regional price removed.">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="product_id" value={price.product_id} />
                      <button className={danger}>Remove</button>
                    </AdminActionForm>
                  </div>
                ))}
              </div>

              <AdminActionForm action={saveStoreRegionOverride} successMessage="Regional price saved and synced." className="mt-3 grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="price_id" value={price.id} />
                <input type="hidden" name="product_id" value={price.product_id} />
                <label>
                  <span className={label}>Countries</span>
                  <input name="country_codes" placeholder="US, CA" required className={field} />
                </label>
                <label>
                  <span className={label}>Currency</span>
                  <input name="currency" placeholder="USD" maxLength={3} required className={field} />
                </label>
                <label>
                  <span className={label}>Minor units</span>
                  <input name="money_amount_minor" type="number" min="0" placeholder="499" required className={field} />
                </label>
                <div className="flex items-end">
                  <button className={button}>Add & sync</button>
                </div>
              </AdminActionForm>
            </div>
          ))}
        </div>
      </AdminCollapsibleSection>

      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Store analytics · last 30 days
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Orders</p><p className="font-serif text-2xl">{orders.length}</p></div>
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Completed</p><p className="font-serif text-2xl">{completed.length}</p></div>
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Failed / cancelled</p><p className="font-serif text-2xl">{failed.length}</p></div>
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3"><p className={label}>Pending</p><p className="font-serif text-2xl">{pending.length}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
          {[...realMoneyByCurrency].map(([currency, amount]) => (
            <span key={currency}>{currency}: {money(amount, currency)}</span>
          ))}
          <span>Remnants: {remnants}</span>
        </div>
      </div>

      <AdminCollapsibleSection title="Refunds">
        <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
          Full refunds revoke paid Store entitlements after Paddle approves the refund. Partial refunds keep the entitlement.
        </p>

        <div className="mt-4 space-y-2">
          {orders
            .filter((order) =>
              order.payment_method === "paddle" &&
              order.paddle_transaction_id &&
              ["fulfilled", "partially_refunded"].includes(order.status),
            )
            .slice(0, 20)
            .map((order) => (
              <AdminActionForm action={refundStoreOrder} successMessage="Refund request sent to Paddle."
                key={order.id}
                className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/25 p-3 md:grid-cols-[minmax(0,1fr)_150px_180px_auto]"
              >
                <div>
                  <p className="text-[10px] text-[rgb(var(--sep-colour-d7c4a5))]">{order.id}</p>
                  <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-756958))]">
                    {money(Number(order.total_money_minor ?? 0), order.currency ?? "GBP")} · {order.status}
                  </p>
                </div>
                <input type="hidden" name="order_id" value={order.id} />
                <label>
                  <span className={label}>Partial amount</span>
                  <input name="amount_minor" type="number" min="1" placeholder="blank = full" className={field} />
                </label>
                <label>
                  <span className={label}>Reason</span>
                  <input name="reason" defaultValue="Customer request" className={field} />
                </label>
                <div className="flex items-end">
                  <button className={danger}>Request refund</button>
                </div>
              </AdminActionForm>
            ))}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Paddle audit log">
        <div className="mt-3 space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-2 border-b border-[rgb(var(--sep-colour-60482e))]/20 py-2 text-[9px] text-[rgb(var(--sep-colour-a99b89))] md:grid-cols-[150px_100px_120px_minmax(0,1fr)]">
              <time>{new Date(log.created_at).toLocaleString("en-GB")}</time>
              <span>{log.environment}</span>
              <span className={log.status === "success" ? "text-emerald-300" : "text-red-300"}>
                {log.entity_type} · {log.status}
              </span>
              <span>{log.action}{log.message ? ` · ${log.message}` : ""}</span>
            </div>
          ))}
        </div>
      </AdminCollapsibleSection>
    </section>
  );
}
