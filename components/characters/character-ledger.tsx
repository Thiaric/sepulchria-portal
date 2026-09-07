"use server";

import { LedgerEntries, type LedgerFilterEntry } from "@/components/economy/ledger-entries";
import { createClient } from "@/lib/supabase/server";

type StoreOrder = {
  id: string;
  currency: string | null;
  total_money_minor: number | null;
  status: string;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
};

type StoreOrderItem = {
  order_id: string;
  product_name_snapshot: string;
};

export async function CharacterLedger({ characterId }: { characterId: string }) {
  const supabase = await createClient();

  const [remnantResult, orderResult] = await Promise.all([
    supabase
      .from("remnant_ledger")
      .select("id, amount, balance_after, reason, created_at")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("store_orders")
      .select(
        "id, currency, total_money_minor, status, paid_at, refunded_at, created_at",
      )
      .eq("character_id", characterId)
      .eq("payment_method", "stripe")
      .in("status", ["fulfilled", "refunded", "partially_refunded"])
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  const firstError = remnantResult.error ?? orderResult.error;
  if (firstError) {
    throw new Error(`Unable to load Ledger: ${firstError.message}`);
  }

  const orders = (orderResult.data ?? []) as StoreOrder[];
  const orderIds = orders.map((order) => order.id);

  const itemResult = orderIds.length
    ? await supabase
        .from("store_order_items")
        .select("order_id, product_name_snapshot")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (itemResult.error) {
    throw new Error(`Unable to load Store purchases in Ledger: ${itemResult.error.message}`);
  }

  const itemNamesByOrder = new Map<string, string[]>();
  for (const item of (itemResult.data ?? []) as StoreOrderItem[]) {
    const names = itemNamesByOrder.get(item.order_id) ?? [];
    names.push(item.product_name_snapshot);
    itemNamesByOrder.set(item.order_id, names);
  }

  const remnantEntries: LedgerFilterEntry[] = (remnantResult.data ?? []).map(
    (entry) => ({
      ...entry,
      kind: "remnants",
    }),
  );

  const moneyEntries: LedgerFilterEntry[] = orders.flatMap((order) => {
    const productNames = itemNamesByOrder.get(order.id) ?? [];
    const totalMinor = Number(order.total_money_minor ?? 0);
    const productLabel =
      productNames.join(" + ") || "Sepulchria Store";

    const purchaseEntry: LedgerFilterEntry = {
      id: `store-${order.id}`,
      amount: -Math.abs(totalMinor),
      balance_after: null,
      reason: `Store purchase · ${productLabel}`,
      created_at: order.paid_at ?? order.created_at,
      kind: "money",
      currency: order.currency,
      money_amount_minor: totalMinor,
    };

    if (order.status !== "refunded" || !order.refunded_at) {
      return [purchaseEntry];
    }

    const refundEntry: LedgerFilterEntry = {
      id: `store-refund-${order.id}`,
      amount: Math.abs(totalMinor),
      balance_after: null,
      reason: `Store refund · ${productLabel}`,
      created_at: order.refunded_at,
      kind: "money",
      currency: order.currency,
      money_amount_minor: totalMinor,
    };

    return [purchaseEntry, refundEntry];
  });

  const entries = [...remnantEntries, ...moneyEntries]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    )
    .slice(0, 500);

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-130f0c))]">
      <div className="border-b border-[rgb(var(--sep-colour-59432c))]/30 px-4 py-3 sm:px-5">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">Economy</p>
        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">Immutable Ledger</h2>
        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-827564))]">
          Every Remnant gained or spent, and every completed real-money Store purchase, is recorded here.
        </p>
      </div>
      {entries.length ? (
        <LedgerEntries entries={entries} />
      ) : (
        <p className="px-5 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-756958))]">No Ledger transactions yet.</p>
      )}
    </section>
  );
}
