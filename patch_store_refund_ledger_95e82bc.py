from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "95e82bc79fe096bd74e6f775b6e08b6c2c096541"

def head():
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
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

path = ROOT / "components" / "characters" / "character-ledger.tsx"
text = path.read_text(encoding="utf-8")
original = text

old1 = '''type StoreOrder = {
  id: string;
  currency: string | null;
  total_money_minor: number | null;
  paid_at: string | null;
  created_at: string;
};'''

new1 = '''type StoreOrder = {
  id: string;
  currency: string | null;
  total_money_minor: number | null;
  status: string;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
};'''

text = replace_once(text, old1, new1, "StoreOrder type")

old2 = '''    supabase
      .from("store_orders")
      .select("id, currency, total_money_minor, paid_at, created_at")
      .eq("character_id", characterId)
      .eq("payment_method", "paddle")
      .eq("status", "fulfilled")
      .order("created_at", { ascending: false })
      .limit(250),'''

new2 = '''    supabase
      .from("store_orders")
      .select(
        "id, currency, total_money_minor, status, paid_at, refunded_at, created_at",
      )
      .eq("character_id", characterId)
      .eq("payment_method", "paddle")
      .in("status", ["fulfilled", "refunded", "partially_refunded"])
      .order("created_at", { ascending: false })
      .limit(250),'''

text = replace_once(text, old2, new2, "Store order ledger query")

old3 = '''  const moneyEntries: LedgerFilterEntry[] = orders.map((order) => {
    const productNames = itemNamesByOrder.get(order.id) ?? [];
    const totalMinor = Number(order.total_money_minor ?? 0);

    return {
      id: `store-${order.id}`,
      amount: -Math.abs(totalMinor),
      balance_after: null,
      reason: `Store purchase · ${productNames.join(" + ") || "Sepulchria Store"}`,
      created_at: order.paid_at ?? order.created_at,
      kind: "money",
      currency: order.currency,
      money_amount_minor: totalMinor,
    };
  });

  const entries = [...remnantEntries, ...moneyEntries]'''

new3 = '''  const moneyEntries: LedgerFilterEntry[] = orders.flatMap((order) => {
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

  const entries = [...remnantEntries, ...moneyEntries]'''

text = replace_once(text, old3, new3, "Money ledger entries")

if text == original:
    raise SystemExit("Nothing changed.")

path.write_text(text, encoding="utf-8")
print("Patched components/characters/character-ledger.tsx")
print("Full refunds now preserve the original purchase and add a positive refund entry.")
print("Run: npm run build")
