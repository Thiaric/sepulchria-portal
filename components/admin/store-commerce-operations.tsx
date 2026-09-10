import "server-only";

import { AdminActionForm, AdminCollapsibleSection } from "@/components/admin/admin-action-ui";

import {
  deleteStoreRegionOverride,
  refundStoreOrder,
  saveStoreRegionOverride,
  syncAllStoreStripe,
  syncOneStoreProductStripe,
} from "@/app/(portal)/admin/store/actions";
import { stripeEnvironment } from "@/lib/store/stripe-server";
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
  orderItemsResult,
] = await Promise.all([
    admin
      .from("store_products")
      .select("id, name, stripe_sync_status, stripe_sync_error, stripe_synced_at")
      .order("name"),
    admin
      .from("store_product_prices")
      .select(
        "id, product_id, currency, money_amount_minor, stripe_price_id_test, stripe_price_id_test, stripe_price_id_live, stripe_sync_status, stripe_sync_error, stripe_synced_at",
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
        "id, character_id, status, payment_method, currency, total_money_minor, total_remnants, stripe_payment_intent_id, created_at, paid_at",
      )
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    admin
      .from("store_stripe_sync_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),

      admin
  .from("store_order_items")
  .select("order_id, product_name_snapshot")
  .order("created_at", { ascending: true }),
  ]);

  const error =
  productsResult.error ??
  pricesResult.error ??
  overridesResult.error ??
  ordersResult.error ??
  logsResult.error ??
  orderItemsResult.error;

  if (error) throw new Error(error.message);

  const products = productsResult.data ?? [];
  const prices = pricesResult.data ?? [];
  const overrides = overridesResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const logs = logsResult.data ?? [];
  const orderItems = orderItemsResult.data ?? [];

const productNamesByOrder = new Map<string, string[]>();

for (const item of orderItems) {
  const names = productNamesByOrder.get(String(item.order_id)) ?? [];
  names.push(String(item.product_name_snapshot));
  productNamesByOrder.set(String(item.order_id), names);
}
  const productById = new Map(products.map((product) => [product.id, product]));

  const characterIds = [
    ...new Set(
      orders
        .map((order) => order.character_id)
        .filter(Boolean),
    ),
  ] as string[];

  const charactersResult = characterIds.length
    ? await admin
        .from("characters")
        .select("id, display_name, first_name, surname")
        .in("id", characterIds)
    : { data: [], error: null };

  if (charactersResult.error) {
    throw new Error(charactersResult.error.message);
  }

  const purchaserByCharacterId = new Map(
    (charactersResult.data ?? []).map((character) => [
      String(character.id),
      character.display_name?.trim() ||
        [character.first_name, character.surname]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Unknown character",
    ]),
  );

  const refundableOrders = orders
    .filter(
      (order) =>
        order.payment_method === "stripe" &&
        order.stripe_payment_intent_id &&
        ["fulfilled", "partially_refunded"].includes(order.status),
    )
    .slice(0, 20);

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
    if (order.payment_method === "stripe" && order.currency) {
      realMoneyByCurrency.set(
        order.currency,
        (realMoneyByCurrency.get(order.currency) ?? 0) +
          Number(order.total_money_minor ?? 0),
      );
    } else if (order.payment_method === "remnants") {
      remnants += Number(order.total_remnants ?? 0);
    }
  }

  const env = stripeEnvironment();
  const checks = [
    ["Secret key", Boolean(process.env.STRIPE_SECRET_KEY?.trim())],
    ["Publishable key", Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim())],
    ["Webhook secret", Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())],
    ["Environment", Boolean(process.env.STRIPE_ENVIRONMENT?.trim())],
    ["Cron cleanup", Boolean(process.env.CRON_SECRET?.trim())],
    ["Store email", Boolean(process.env.RESEND_API_KEY?.trim() && process.env.STORE_EMAIL_FROM?.trim())],
  ] as const;

  return (
    <section className="mt-8 space-y-6 components_admin_store_commerce_operations_section_section">
      <AdminCollapsibleSection title="Stripe sync & launch readiness">
        <div className="flex flex-wrap items-end justify-between gap-4 components_admin_store_commerce_operations_div_container">
          <div className="components_admin_store_commerce_operations_div_container_2">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))] components_admin_store_commerce_operations_p_text">
              Production operations
            </p>
            <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_commerce_operations_p_text_2">
              Current environment: <strong className="components_admin_store_commerce_operations_strong_emphasis">{env}</strong>. Sepulchria Store prices are the source of truth.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 components_admin_store_commerce_operations_div_container_3">
            <AdminActionForm
              action={syncAllStoreStripe}
              successMessage="Stripe sync completed."
              pendingLabel="Syncing..."
              busyCursor
            >
              <button className={[((`${button} disabled:cursor-wait disabled:opacity-60`)), "components_admin_store_commerce_operations_button_sync_all_stripe"].filter(Boolean).join(" ")}>
                Sync all to Stripe
              </button>
            </AdminActionForm>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 components_admin_store_commerce_operations_div_container_4">
          {checks.map(([name, ok]) => (
            <div key={name} className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 components_admin_store_commerce_operations_div_container_5">
              <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_store_commerce_operations_p_text_3">{name}</p>
              <p className={[((`mt-1 text-xs ${ok ? "text-emerald-300" : "text-amber-300"}`)), "components_admin_store_commerce_operations_p_text_4"].filter(Boolean).join(" ")}>
                {ok ? "Ready" : "Needs setup"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2 components_admin_store_commerce_operations_div_container_6">
          {products.map((product) => {
            const productPrices = prices.filter((price) => price.product_id === product.id);
            const synced = productPrices.length > 0 && productPrices.every((price) => {
              const id =
                env === "live"
                  ? price.stripe_price_id_live
                  : price.stripe_price_id_test;
              return Boolean(id) && price.stripe_sync_status === "synced";
            });

            return (
              <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/25 px-3 py-2 components_admin_store_commerce_operations_div_container_7">
                <div className="components_admin_store_commerce_operations_div_container_8">
                  <p className="text-xs text-[rgb(var(--sep-colour-d7c4a5))] components_admin_store_commerce_operations_p_text_5">{product.name}</p>
                  <p className={[((`mt-1 text-[8px] uppercase tracking-[0.12em] ${synced ? "text-emerald-300" : "text-amber-300"}`)), "components_admin_store_commerce_operations_p_text_6"].filter(Boolean).join(" ")}>
                    {productPrices.length ? (synced ? "Synced" : "Needs sync") : "No real-money price"}
                  </p>
                  {product.stripe_sync_error ? (
                    <p className="mt-1 max-w-2xl text-[9px] text-red-300 components_admin_store_commerce_operations_p_text_7">{product.stripe_sync_error}</p>
                  ) : null}
                </div>
                <AdminActionForm action={syncOneStoreProductStripe} successMessage="Product synced to Stripe.">
                  <input className="components_admin_store_commerce_operations_input_product_id" type="hidden" name="product_id" value={product.id} />
                  <button className={[((button)), "components_admin_store_commerce_operations_button_sync"].filter(Boolean).join(" ")}>Sync</button>
                </AdminActionForm>
              </div>
            );
          })}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Regional pricing & currencies">
        <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_commerce_operations_p_text_8">
          Manage Sepulchria regional price overrides. Country codes are ISO-2 values such as GB, US, FR, DE.
        </p>

        <div className="mt-4 space-y-4 components_admin_store_commerce_operations_div_container_9">
          {prices.map((price) => (
            <div key={price.id} className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3 components_admin_store_commerce_operations_div_container_10">
              <p className="text-xs text-[rgb(var(--sep-colour-d7c4a5))] components_admin_store_commerce_operations_p_text_9">
                {productById.get(price.product_id)?.name ?? price.product_id} ·{" "}
                {money(Number(price.money_amount_minor ?? 0), price.currency ?? "GBP")}
              </p>

              <div className="mt-2 space-y-1 components_admin_store_commerce_operations_div_container_11">
                {overrides.filter((row) => row.price_id === price.id).map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-[rgb(var(--sep-colour-a99b89))] components_admin_store_commerce_operations_div_container_12">
                    <span className="components_admin_store_commerce_operations_span_text">
                      {row.country_codes.join(", ")} → {money(row.money_amount_minor, row.currency)}
                    </span>
                    <AdminActionForm action={deleteStoreRegionOverride} successMessage="Regional price removed.">
                      <input className="components_admin_store_commerce_operations_input_id" type="hidden" name="id" value={row.id} />
                      <input className="components_admin_store_commerce_operations_input_product_id_2" type="hidden" name="product_id" value={price.product_id} />
                      <button className={[((danger)), "components_admin_store_commerce_operations_button_remove"].filter(Boolean).join(" ")}>Remove</button>
                    </AdminActionForm>
                  </div>
                ))}
              </div>

              <AdminActionForm action={saveStoreRegionOverride} successMessage="Regional price saved and synced." className="mt-3 grid gap-2 sm:grid-cols-4">
                <input className="components_admin_store_commerce_operations_input_price_id" type="hidden" name="price_id" value={price.id} />
                <input className="components_admin_store_commerce_operations_input_product_id_3" type="hidden" name="product_id" value={price.product_id} />
                <label className="components_admin_store_commerce_operations_label_label">
                  <span className={[((label)), "components_admin_store_commerce_operations_span_text_2"].filter(Boolean).join(" ")}>Countries</span>
                  <input name="country_codes" placeholder="US, CA" required className={[((field)), "components_admin_store_commerce_operations_input_country_codes"].filter(Boolean).join(" ")} />
                </label>
                <label className="components_admin_store_commerce_operations_label_label_2">
                  <span className={[((label)), "components_admin_store_commerce_operations_span_text_3"].filter(Boolean).join(" ")}>Currency</span>
                  <input name="currency" placeholder="USD" maxLength={3} required className={[((field)), "components_admin_store_commerce_operations_input_currency"].filter(Boolean).join(" ")} />
                </label>
                <label className="components_admin_store_commerce_operations_label_label_3">
                  <span className={[((label)), "components_admin_store_commerce_operations_span_text_4"].filter(Boolean).join(" ")}>Minor units</span>
                  <input name="money_amount_minor" type="number" min="0" placeholder="499" required className={[((field)), "components_admin_store_commerce_operations_input_money_amount_minor"].filter(Boolean).join(" ")} />
                </label>
                <div className="flex items-end components_admin_store_commerce_operations_div_container_13">
                  <button className={[((button)), "components_admin_store_commerce_operations_button_add_sync"].filter(Boolean).join(" ")}>Add & sync</button>
                </div>
              </AdminActionForm>
            </div>
          ))}
        </div>
      </AdminCollapsibleSection>

      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5 components_admin_store_commerce_operations_div_store_analytics_last_30">
        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))] components_admin_store_commerce_operations_h3_store_analytics_last_30">
          Store analytics · last 30 days
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 components_admin_store_commerce_operations_div_store_analytics_last_30_2">
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3 components_admin_store_commerce_operations_div_store_analytics_last_30_3"><p className={[((label)), "components_admin_store_commerce_operations_p_store_analytics_last_30"].filter(Boolean).join(" ")}>Orders</p><p className="font-serif text-2xl components_admin_store_commerce_operations_p_store_analytics_last_30_2">{orders.length}</p></div>
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3 components_admin_store_commerce_operations_div_store_analytics_last_30_4"><p className={[((label)), "components_admin_store_commerce_operations_p_store_analytics_last_30_3"].filter(Boolean).join(" ")}>Completed</p><p className="font-serif text-2xl components_admin_store_commerce_operations_p_store_analytics_last_30_4">{completed.length}</p></div>
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3 components_admin_store_commerce_operations_div_store_analytics_last_30_5"><p className={[((label)), "components_admin_store_commerce_operations_p_store_analytics_last_30_5"].filter(Boolean).join(" ")}>Failed / cancelled</p><p className="font-serif text-2xl components_admin_store_commerce_operations_p_store_analytics_last_30_6">{failed.length}</p></div>
          <div className="border border-[rgb(var(--sep-colour-60482e))]/30 p-3 components_admin_store_commerce_operations_div_store_analytics_last_30_6"><p className={[((label)), "components_admin_store_commerce_operations_p_store_analytics_last_30_7"].filter(Boolean).join(" ")}>Pending</p><p className="font-serif text-2xl components_admin_store_commerce_operations_p_store_analytics_last_30_8">{pending.length}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_commerce_operations_div_store_analytics_last_30_7">
          {[...realMoneyByCurrency].map(([currency, amount]) => (
            <span className="components_admin_store_commerce_operations_span_text_5" key={currency}>{currency}: {money(amount, currency)}</span>
          ))}
          <span className="components_admin_store_commerce_operations_span_store_analytics_last_30">Remnants: {remnants}</span>
        </div>
      </div>

      <AdminCollapsibleSection title="Refunds">
        <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_commerce_operations_p_text_10">
          Full refunds revoke paid Store entitlements after Stripe approves the refund. Partial refunds keep the entitlement.
        </p>

        <div className="mt-4 space-y-2 components_admin_store_commerce_operations_div_container_14">
          {refundableOrders.map((order) => (
              <AdminActionForm
                action={refundStoreOrder}
                successMessage="Refund request sent to Stripe."
                refreshDelaysMs={[3000, 8000, 15000]}
                key={order.id}
                className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/25 p-3 md:grid-cols-[minmax(0,1fr)_150px_180px_auto]"
              >
                <div className="components_admin_store_commerce_operations_div_container_15">
  <p className="text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] components_admin_store_commerce_operations_p_text_11">
    {order.character_id
      ? purchaserByCharacterId.get(String(order.character_id)) ?? "Unknown character"
      : "Unknown character"}
  </p>

  <p className="mt-1 text-[10px] text-[rgb(var(--sep-skin-c1,169_138_96))] components_admin_store_commerce_operations_p_text_12">
    {(productNamesByOrder.get(String(order.id)) ?? ["Unknown product"]).join(" + ")}
  </p>

  <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-8c704b))] components_admin_store_commerce_operations_p_text_13">
    {order.id}
  </p>

  <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-756958))] components_admin_store_commerce_operations_p_text_14">
    {money(Number(order.total_money_minor ?? 0), order.currency ?? "GBP")} · {order.status}
  </p>
</div>
                <input className="components_admin_store_commerce_operations_input_order_id" type="hidden" name="order_id" value={order.id} />
                <label className="components_admin_store_commerce_operations_label_label_4">
                  <span className={[((label)), "components_admin_store_commerce_operations_span_text_6"].filter(Boolean).join(" ")}>Partial amount</span>
                  <input name="amount_minor" type="number" min="1" placeholder="blank = full" className={[((field)), "components_admin_store_commerce_operations_input_amount_minor"].filter(Boolean).join(" ")} />
                </label>
                <label className="components_admin_store_commerce_operations_label_label_5">
                  <span className={[((label)), "components_admin_store_commerce_operations_span_text_7"].filter(Boolean).join(" ")}>Reason</span>
                  <input name="reason" defaultValue="Customer request" className={[((field)), "components_admin_store_commerce_operations_input_reason"].filter(Boolean).join(" ")} />
                </label>
                <div className="flex items-end components_admin_store_commerce_operations_div_container_16">
                  <button className={[((danger)), "components_admin_store_commerce_operations_button_request_refund"].filter(Boolean).join(" ")}>Request refund</button>
                </div>
              </AdminActionForm>
            ))}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Stripe audit log">
        <div className="mt-3 space-y-1 components_admin_store_commerce_operations_div_container_17">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-2 border-b border-[rgb(var(--sep-colour-60482e))]/20 py-2 text-[9px] text-[rgb(var(--sep-colour-a99b89))] md:grid-cols-[150px_100px_120px_minmax(0,1fr)] components_admin_store_commerce_operations_div_container_18">
              <time>{new Date(log.created_at).toLocaleString("en-GB")}</time>
              <span className="components_admin_store_commerce_operations_span_text_8">{log.environment}</span>
              <span className={[((log.status === "success" ? "text-emerald-300" : "text-red-300")), "components_admin_store_commerce_operations_span_text_9"].filter(Boolean).join(" ")}>
                {log.entity_type} · {log.status}
              </span>
              <span className="components_admin_store_commerce_operations_span_text_10">{log.action}{log.message ? ` · ${log.message}` : ""}</span>
            </div>
          ))}
        </div>
      </AdminCollapsibleSection>
    </section>
  );
}
