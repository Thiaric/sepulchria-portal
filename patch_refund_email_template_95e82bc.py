from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "95e82bc79fe096bd74e6f775b6e08b6c2c096541"
TEMPLATE_ID = "f6df0322-bc5e-4e99-bcef-b0302f20be03"

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

path = ROOT / "lib" / "store" / "store-email.ts"
text = path.read_text(encoding="utf-8")
original = text

old = """export async function sendStoreRefundEmail(orderId: string) {
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
}"""

new = """export async function sendStoreRefundEmail(orderId: string) {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("store_orders")
    .select("id, user_id, character_id, currency, total_money_minor")
    .eq("id", orderId)
    .single();

  if (error || !order) return;

  const { data: userData } = await admin.auth.admin.getUserById(order.user_id);
  const email = userData.user?.email?.trim();
  if (!email) return;

  const { data: character } = await admin
    .from("characters")
    .select("display_name, first_name, surname")
    .eq("id", order.character_id)
    .maybeSingle();

  const characterName =
    character?.display_name?.trim() ||
    [character?.first_name, character?.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "your character";

  const { data: items } = await admin
    .from("store_order_items")
    .select("product_name_snapshot, quantity")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const names = (items ?? [])
    .map((item) =>
      Number(item.quantity ?? 1) > 1
        ? `${item.product_name_snapshot} x${item.quantity}`
        : item.product_name_snapshot,
    )
    .join(", ");

  const amount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: order.currency || "GBP",
  }).format(Number(order.total_money_minor ?? 0) / 100);

  await sendStoreEmail({
    orderId,
    kind: "refund",
    recipient: email,
    template: {
      id: "f6df0322-bc5e-4e99-bcef-b0302f20be03",
      variables: {
        CHARACTER_NAME: characterName,
        PRODUCT_NAME:
          names || "Sepulchria Store purchase",
        PRICE: amount,
        ORDER_ID: order.id,
      },
    },
  });
}"""

new = new.replace("f6df0322-bc5e-4e99-bcef-b0302f20be03", TEMPLATE_ID)
text = replace_once(text, old, new, "sendStoreRefundEmail")

if text == original:
    raise SystemExit("Nothing changed.")

path.write_text(text, encoding="utf-8")
print("Patched lib/store/store-email.ts")
print("Refund email template:", TEMPLATE_ID)
print("Variables: CHARACTER_NAME, PRODUCT_NAME, PRICE, ORDER_ID")
print("Run: npm run build")
