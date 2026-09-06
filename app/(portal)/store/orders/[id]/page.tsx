import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function money(minor: number, currency: string | null) {
  if (!currency) return "—";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export default async function StoreReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("store_orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) notFound();

  const [{ data: items, error: itemsError }, { data: emails, error: emailsError }] =
    await Promise.all([
      admin
        .from("store_order_items")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at"),
      admin
        .from("store_email_log")
        .select("kind, status, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false }),
    ]);

  if (itemsError || emailsError) {
    throw new Error(itemsError?.message ?? emailsError?.message ?? "Unable to load receipt.");
  }

  const realMoney = order.payment_method === "paddle";
  const subtotal = realMoney
    ? money(Number(order.subtotal_money_minor ?? 0), order.currency)
    : `${Number(order.subtotal_remnants ?? 0)} Remnants`;
  const discount = realMoney
    ? money(Number(order.discount_money_minor ?? 0), order.currency)
    : `${Number(order.discount_remnants ?? 0)} Remnants`;
  const total = realMoney
    ? money(Number(order.total_money_minor ?? 0), order.currency)
    : `${Number(order.total_remnants ?? 0)} Remnants`;

  return (
    <main className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">
              Sepulchria Store
            </p>
            <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
              Receipt
            </h1>
          </div>
          <Link
            href="/store"
            className="border border-[rgb(var(--sep-colour-60482e))]/45 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7c4a5))]"
          >
            Back to Store
          </Link>
        </div>

        <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
          <p><span className="text-[rgb(var(--sep-colour-756958))]">Order:</span> {order.id}</p>
          <p><span className="text-[rgb(var(--sep-colour-756958))]">Status:</span> {String(order.status).replaceAll("_", " ")}</p>
          <p><span className="text-[rgb(var(--sep-colour-756958))]">Payment:</span> {realMoney ? "Paddle" : "Remnants"}</p>
          <p><span className="text-[rgb(var(--sep-colour-756958))]">Date:</span> {new Date(order.paid_at ?? order.created_at).toLocaleString("en-GB")}</p>
          {order.paddle_transaction_id ? (
            <p className="sm:col-span-2 break-all">
              <span className="text-[rgb(var(--sep-colour-756958))]">Paddle transaction:</span> {order.paddle_transaction_id}
            </p>
          ) : null}
        </div>

        <div className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4">
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Items</h2>
          <div className="mt-3 space-y-2">
            {(items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/20 pb-2 text-xs">
                <span>{item.product_name_snapshot}</span>
                <span>×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 text-xs">
          <div className="flex justify-between"><span>Subtotal</span><span>{subtotal}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{discount}</span></div>
          <div className="flex justify-between font-semibold text-[rgb(var(--sep-colour-ead5ac))]"><span>Total</span><span>{total}</span></div>
        </div>

        {(emails ?? []).length ? (
          <div className="mt-5 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4">
            <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
              Email records
            </p>
            {(emails ?? []).map((email, index) => (
              <p key={`${email.kind}-${index}`} className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a99b89))]">
                {email.kind} · {email.status} · {new Date(email.created_at).toLocaleString("en-GB")}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
