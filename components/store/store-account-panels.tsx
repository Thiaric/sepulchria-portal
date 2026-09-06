import "server-only";

import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";

function moneyLabel(minor: number, currency: string | null) {
  if (!currency) return "—";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export async function StoreAccountPanels({ userId }: { userId: string }) {
  const admin = createAdminClient();
  const [ordersResult, issuedResult] = await Promise.all([
    admin.from("store_orders")
      .select("id, status, payment_method, currency, subtotal_money_minor, discount_money_minor, total_money_minor, subtotal_remnants, discount_remnants, total_remnants, paddle_transaction_id, created_at, paid_at, fulfilled_at, refunded_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    admin.from("store_user_discount_codes")
      .select("id, discount_code_id, post_purchase_offer_id, source_order_id, code, expires_at, used_at, created_at")
      .eq("user_id", userId).is("used_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
  ]);

  if (ordersResult.error || issuedResult.error) {
    throw new Error(ordersResult.error?.message ?? issuedResult.error?.message ?? "Unable to load Store account history.");
  }

  const orders = ordersResult.data ?? [];
  const issued = issuedResult.data ?? [];
  const orderIds = orders.map((order) => order.id);
  const discountIds = [...new Set(issued.map((row) => row.discount_code_id))];
  const offerIds = [...new Set(issued.map((row) => row.post_purchase_offer_id).filter(Boolean))] as string[];

  const [itemsResult, discountsResult, offersResult] = await Promise.all([
    orderIds.length ? admin.from("store_order_items").select("order_id, product_name_snapshot, quantity").in("order_id", orderIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [], error: null }),
    discountIds.length ? admin.from("store_discount_codes").select("id, name, description, discount_type, discount_value, currency").in("id", discountIds) : Promise.resolve({ data: [], error: null }),
    offerIds.length ? admin.from("store_post_purchase_offers").select("id, name, description").in("id", offerIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const childError = itemsResult.error ?? discountsResult.error ?? offersResult.error;
  if (childError) throw new Error(`Unable to load Store account details: ${childError.message}`);

  const itemNames = new Map<string, string[]>();
  for (const item of itemsResult.data ?? []) {
    const names = itemNames.get(item.order_id) ?? [];
    names.push(Number(item.quantity ?? 1) > 1 ? `${item.product_name_snapshot} x${item.quantity}` : item.product_name_snapshot);
    itemNames.set(item.order_id, names);
  }
  const discountById = new Map((discountsResult.data ?? []).map((row) => [row.id, row]));
  const offerById = new Map((offersResult.data ?? []).map((row) => [row.id, row]));

  return (
    <>
      {issued.length ? (
        <section className="mt-7 border border-[rgb(var(--sep-colour-987344))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">Your offers</p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Post-purchase rewards</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {issued.map((row) => {
              const discount = discountById.get(row.discount_code_id);
              const offer = row.post_purchase_offer_id ? offerById.get(row.post_purchase_offer_id) : null;
              return (
                <div key={row.id} className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dec79d))]">{offer?.name ?? discount?.name ?? "Store offer"}</p>
                  <p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]">{offer?.description || discount?.description || "A private Store discount unlocked by your purchase."}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <code className="border border-[rgb(var(--sep-colour-80613b))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1.5 text-[10px] tracking-[0.12em] text-[rgb(var(--sep-colour-efd9aa))]">{row.code}</code>
                    <span className="text-[8px] text-[rgb(var(--sep-colour-756958))]">Expires {new Date(row.expires_at).toLocaleString("en-GB")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-7 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-5">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">Purchase history</p>
        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Orders & receipts</h2>
        {orders.length ? (
          <div className="mt-3 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/35">
            {orders.map((order) => {
              const names = itemNames.get(order.id) ?? ["Sepulchria Store purchase"];
              const money = order.payment_method === "paddle";
              const total = money ? moneyLabel(Number(order.total_money_minor ?? 0), order.currency) : `🝈 ${Number(order.total_remnants ?? 0)} Remnants`;
              const discount = money ? Number(order.discount_money_minor ?? 0) : Number(order.discount_remnants ?? 0);
              return (
                <div key={order.id} className="grid gap-2 border-b border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_130px_165px]">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[rgb(var(--sep-colour-cab38d))]">{names.join(" · ")}</p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">{money ? "Real money" : "Remnants"}{discount > 0 ? " · discount applied" : ""}{order.paddle_transaction_id ? ` · ${order.paddle_transaction_id}` : ""}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a99578))]">{order.status.replaceAll("_", " ")}</span>
                  <span className="text-[10px] text-[rgb(var(--sep-colour-e2cda4))]">{total}</span>
                  <div className="flex flex-col gap-1">
                    <time className="text-[8px] text-[rgb(var(--sep-colour-756958))]">{new Date(order.paid_at ?? order.created_at).toLocaleString("en-GB")}</time>
                    <Link href={`/store/orders/${order.id}`} className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c69b5c))] underline">View receipt</Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-756958))]">No Store orders yet.</p>}
      </section>
    </>
  );
}
