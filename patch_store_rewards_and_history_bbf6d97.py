from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "bbf6d97"

def head():
    return subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        cwd=ROOT,
        encoding="utf-8",
        errors="strict",
    ).strip()

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exact block once, found {count}. No file written."
        )
    return text.replace(old, new, 1)

current = head()
if current != EXPECTED_HEAD:
    raise SystemExit(
        f"This patch is for {EXPECTED_HEAD}; your local HEAD is {current}."
    )

helper_path = ROOT / "lib" / "store" / "post-purchase-offers.ts"
helper_path.parent.mkdir(parents=True, exist_ok=True)

if helper_path.exists():
    raise SystemExit(
        "lib/store/post-purchase-offers.ts already exists. No files were changed."
    )

helper_path.write_text(
'''import "server-only";

import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export async function issueStorePostPurchaseOffersAndNotify(input: {
  orderId: string;
  characterId: string;
  userId: string;
}) {
  const admin = createAdminClient();

  const { data: beforeRows, error: beforeError } = await admin
    .from("store_user_discount_codes")
    .select("id")
    .eq("source_order_id", input.orderId);

  if (beforeError) {
    throw new Error(
      `Unable to inspect existing Store rewards: ${beforeError.message}`,
    );
  }

  const beforeIds = new Set(
    (beforeRows ?? []).map((row) => String(row.id)),
  );

  const { error: issueError } = await admin.rpc(
    "issue_store_post_purchase_offers",
    { p_order_id: input.orderId },
  );

  if (issueError) {
    throw new Error(
      `Unable to issue Store post-purchase rewards: ${issueError.message}`,
    );
  }

  const { data: issuedRows, error: issuedError } = await admin
    .from("store_user_discount_codes")
    .select(
      "id, discount_code_id, post_purchase_offer_id, code, expires_at",
    )
    .eq("source_order_id", input.orderId)
    .order("created_at", { ascending: true });

  if (issuedError) {
    throw new Error(
      `Unable to load issued Store rewards: ${issuedError.message}`,
    );
  }

  const newlyIssued = (issuedRows ?? []).filter(
    (row) => !beforeIds.has(String(row.id)),
  );

  if (!newlyIssued.length) {
    return { issued: 0 };
  }

  const offerIds = [
    ...new Set(
      newlyIssued
        .map((row) => row.post_purchase_offer_id)
        .filter(Boolean),
    ),
  ] as string[];

  const discountIds = [
    ...new Set(
      newlyIssued
        .map((row) => row.discount_code_id)
        .filter(Boolean),
    ),
  ] as string[];

  const [offersResult, discountsResult] = await Promise.all([
    offerIds.length
      ? admin
          .from("store_post_purchase_offers")
          .select("id, name")
          .in("id", offerIds)
      : Promise.resolve({ data: [], error: null }),
    discountIds.length
      ? admin
          .from("store_discount_codes")
          .select("id, name")
          .in("id", discountIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const childError = offersResult.error ?? discountsResult.error;
  if (childError) {
    throw new Error(
      `Store reward was issued, but its details could not be loaded: ${childError.message}`,
    );
  }

  const offerNames = new Map(
    (offersResult.data ?? []).map((row) => [String(row.id), row.name]),
  );
  const discountNames = new Map(
    (discountsResult.data ?? []).map((row) => [String(row.id), row.name]),
  );

  for (const row of newlyIssued) {
    const rewardName =
      (row.post_purchase_offer_id
        ? offerNames.get(String(row.post_purchase_offer_id))
        : null) ??
      discountNames.get(String(row.discount_code_id)) ??
      "Store reward";

    const expiry = row.expires_at
      ? new Date(row.expires_at).toLocaleString("en-GB")
      : "the stated expiry";

    try {
      await createPremiumFeatureGrantNotification({
        characterId: input.characterId,
        createdBy: input.userId,
        title: "Store reward unlocked",
        body: `${rewardName}: your private discount code is ${row.code}. It expires ${expiry}.`,
        href: "/store",
      });
    } catch (notificationError) {
      console.error(
        "Store reward was issued, but its notification could not be created:",
        notificationError,
      );
    }
  }

  return { issued: newlyIssued.length };
}
''',
    encoding="utf-8",
)

webhook_path = ROOT / "app" / "api" / "store" / "paddle" / "webhook" / "route.ts"
webhook = webhook_path.read_text(encoding="utf-8")
webhook_original = webhook

webhook = replace_once(
    webhook,
    '''import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { createAdminClient } from "@/lib/supabase/admin";''',
    '''import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { issueStorePostPurchaseOffersAndNotify } from "@/lib/store/post-purchase-offers";
import { createAdminClient } from "@/lib/supabase/admin";''',
    "Webhook post-purchase helper import",
)

webhook = replace_once(
    webhook,
    '''  if (order.status === "fulfilled") {
    await admin.rpc("finalize_store_discount_redemption", { p_order_id: orderId });
    await admin.rpc("issue_store_post_purchase_offers", { p_order_id: orderId });
    return NextResponse.json({ ok: true });
  }''',
    '''  if (order.status === "fulfilled") {
    await admin.rpc("finalize_store_discount_redemption", { p_order_id: orderId });

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
  }''',
    "Webhook fulfilled retry reward issuance",
)

webhook = replace_once(
    webhook,
    '''  const { error: fulfilError } = await admin.rpc("fulfil_store_order", { p_order_id: orderId });
  if (fulfilError) return NextResponse.json({ error: fulfilError.message }, { status: 500 });

  const { data: item } = await admin''',
    '''  const { error: fulfilError } = await admin.rpc("fulfil_store_order", { p_order_id: orderId });
  if (fulfilError) return NextResponse.json({ error: fulfilError.message }, { status: 500 });

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

  const { data: item } = await admin''',
    "Webhook first fulfilment reward issuance",
)

if webhook == webhook_original:
    raise SystemExit("Webhook patch made no changes.")
webhook_path.write_text(webhook, encoding="utf-8")

actions_path = ROOT / "app" / "(portal)" / "store" / "actions.ts"
actions = actions_path.read_text(encoding="utf-8")
actions_original = actions

actions = replace_once(
    actions,
    '''import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { createAdminClient } from "@/lib/supabase/admin";''',
    '''import { storeDestinationForCategory } from "@/lib/store/store-destination";
import { issueStorePostPurchaseOffersAndNotify } from "@/lib/store/post-purchase-offers";
import { createAdminClient } from "@/lib/supabase/admin";''',
    "Store actions post-purchase helper import",
)

actions = replace_once(
    actions,
    '''  if (error) return { ok: false, error: error.message, orderId: null };

  try {
    await createPremiumFeatureGrantNotification({''',
    '''  if (error) return { ok: false, error: error.message, orderId: null };

  const completedOrderId =
    typeof data === "string" ? data : String(data ?? "");

  if (completedOrderId) {
    try {
      await issueStorePostPurchaseOffersAndNotify({
        orderId: completedOrderId,
        characterId: characterResult.data.id,
        userId: user.id,
      });
    } catch (offerError) {
      console.error(
        "Remnants Store purchase succeeded, but post-purchase rewards could not be processed:",
        offerError,
      );
    }
  }

  try {
    await createPremiumFeatureGrantNotification({''',
    "Remnants reward issuance",
)

actions = replace_once(
    actions,
    '''  return {
    ok: true,
    error: null,
    orderId: typeof data === "string" ? data : String(data ?? ""),
  };''',
    '''  return {
    ok: true,
    error: null,
    orderId: completedOrderId,
  };''',
    "Reuse completed order ID",
)

if actions == actions_original:
    raise SystemExit("Store action patch made no changes.")
actions_path.write_text(actions, encoding="utf-8")

panels_path = ROOT / "components" / "store" / "store-account-panels.tsx"
panels = panels_path.read_text(encoding="utf-8")
panels_original = panels

panels = replace_once(
    panels,
    '''  const orders = ordersResult.data ?? [];
  const issued = issuedResult.data ?? [];
  const orderIds = orders.map((order) => order.id);''',
    '''  const allOrders = ordersResult.data ?? [];
  const issued = issuedResult.data ?? [];
  const pendingCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const orders = allOrders.filter((order) => {
    if (order.status !== "pending") return true;
    return new Date(order.created_at).getTime() >= pendingCutoff;
  });
  const orderIds = orders.map((order) => order.id);''',
    "Hide pending orders older than seven days",
)

panels = replace_once(
    panels,
    '''        <section className="mt-7 border border-[rgb(var(--sep-colour-987344))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">Your offers</p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Post-purchase rewards</h2>''',
    '''        <section className="mb-4 border border-[rgb(var(--sep-colour-c69b5c))]/70 bg-[rgb(var(--sep-colour-21170f))] p-4 shadow-[0_0_18px_rgba(var(--sep-rgb-198-155-92),0.08)] sm:p-5">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-c69b5c))]">Unlocked Store reward</p>
          <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-efd9aa))]">Your private discount codes</h2>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">These codes were unlocked by your purchases. Use them in the discount-code field on an eligible Store item before they expire.</p>''',
    "Make Store rewards prominent",
)

panels = replace_once(
    panels,
    '''      <section className="mt-7 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-5">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">Purchase history</p>
        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Orders & receipts</h2>
        {orders.length ? (
          <div className="mt-3 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/35">''',
    '''      <details className="mb-5 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))]">
        <summary className="cursor-pointer px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">Purchase history</p>
              <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Orders & receipts</h2>
            </div>
            <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              {orders.length} shown - pending retained 7 days
            </span>
          </div>
        </summary>
        <div className="border-t border-[rgb(var(--sep-colour-60482e))]/30 p-3 sm:p-4">
        {orders.length ? (
          <div className="max-h-[520px] overflow-y-auto border border-[rgb(var(--sep-colour-60482e))]/35">''',
    "Collapse purchase history",
)

panels = replace_once(
    panels,
    '''        ) : <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-756958))]">No Store orders yet.</p>}
      </section>''',
    '''        ) : <p className="text-[10px] text-[rgb(var(--sep-colour-756958))]">No Store orders yet.</p>}
        </div>
      </details>''',
    "Close collapsed purchase history",
)

if panels == panels_original:
    raise SystemExit("Store account panel patch made no changes.")
panels_path.write_text(panels, encoding="utf-8")

page_path = ROOT / "app" / "(portal)" / "store" / "page.tsx"
page = page_path.read_text(encoding="utf-8")
page_original = page

page = replace_once(
    page,
    '''        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {featured.length > 0 ? (''',
    '''        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <StoreAccountPanels userId={user.id} />

          {featured.length > 0 ? (''',
    "Move Store account panels to top",
)

page = replace_once(
    page,
    '''
          <StoreAccountPanels userId={user.id} />
        </div>''',
    '''
        </div>''',
    "Remove old Store account panel location",
)

if page == page_original:
    raise SystemExit("Store page patch made no changes.")
page_path.write_text(page, encoding="utf-8")

print("Patched from bbf6d97:")
print(" - lib/store/post-purchase-offers.ts (new)")
print(" - app/api/store/paddle/webhook/route.ts")
print(" - app/(portal)/store/actions.ts")
print(" - components/store/store-account-panels.tsx")
print(" - app/(portal)/store/page.tsx")
print()
print("Result:")
print(" - Post-purchase reward codes are issued immediately after Paddle fulfilment.")
print(" - Remnants purchases also process qualifying post-purchase rewards.")
print(" - Newly issued codes generate an in-portal notification containing the code and expiry.")
print(" - Active private reward codes are prominently shown at the TOP of /store.")
print(" - Purchase history is also at the top, collapsed by default.")
print(" - Failed/cancelled/completed/refunded orders remain visible.")
print(" - Pending orders are hidden from the user-facing history after 7 days.")
print(" - History is scroll-bounded so it cannot become a huge wall.")
print()
print("Run: npm run build")
