from pathlib import Path

ROOT = Path.cwd()

def fail(msg: str):
    raise SystemExit(f"\nPATCH STOPPED: {msg}\n")

def read(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        fail(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel: str, text: str):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

# 1) Stripe catalogue prices must be tax-inclusive.
rel = "lib/store/stripe-server.ts"
text = read(rel)

text = replace_once(
    text,
    '''      const matches =
        remote &&
        remote.unit_amount === desiredAmount &&
        remote.currency.toLowerCase() === desiredCurrency &&
        remoteProductId(remote.product) === stripeProductId;''',
    '''      const matches =
        remote &&
        remote.unit_amount === desiredAmount &&
        remote.currency.toLowerCase() === desiredCurrency &&
        remoteProductId(remote.product) === stripeProductId &&
        remote.tax_behavior === "inclusive";''',
    "Stripe price match must require inclusive tax",
)

text = replace_once(
    text,
    '''        const created = await stripe.prices.create({
          product: stripeProductId,
          currency: desiredCurrency,
          unit_amount: desiredAmount,
          active: price.is_active === true,''',
    '''        const created = await stripe.prices.create({
          product: stripeProductId,
          currency: desiredCurrency,
          unit_amount: desiredAmount,
          tax_behavior: "inclusive",
          active: price.is_active === true,''',
    "Stripe price creation tax_behavior",
)

text = replace_once(
    text,
    '''  if (
    remote.unit_amount !== Number(refreshed.money_amount_minor) ||
    remote.currency.toUpperCase() !== String(refreshed.currency).toUpperCase() ||
    remote.active !== true
  ) {''',
    '''  if (
    remote.unit_amount !== Number(refreshed.money_amount_minor) ||
    remote.currency.toUpperCase() !== String(refreshed.currency).toUpperCase() ||
    remote.tax_behavior !== "inclusive" ||
    remote.active !== true
  ) {''',
    "Stripe checkout price validation tax_behavior",
)

write(rel, text)

# 2) Webhook maths must remain valid even if Stripe gross paid total differs.
rel = "app/api/store/stripe/webhook/route.ts"
text = read(rel)

text = replace_once(
    text,
    '''      "id, character_id, user_id, status, stripe_checkout_session_id, subtotal_money_minor",''',
    '''      "id, character_id, user_id, status, stripe_checkout_session_id, subtotal_money_minor, discount_money_minor",''',
    "Webhook order select discount",
)

old_math = '''  const subtotal = Number(order.subtotal_money_minor ?? 0);
  const actualTotal =
    typeof session.amount_total === "number"
      ? session.amount_total
      : subtotal;

  const totalMoneyMinor = Math.max(0, actualTotal);
  const discountMoneyMinor = Math.max(0, subtotal - totalMoneyMinor);
'''

new_math = '''  const originalSubtotalMoneyMinor = Math.max(
    0,
    Number(order.subtotal_money_minor ?? 0),
  );
  const originalDiscountMoneyMinor = Math.max(
    0,
    Number(order.discount_money_minor ?? 0),
  );
  const expectedTotalMoneyMinor = Math.max(
    0,
    originalSubtotalMoneyMinor - originalDiscountMoneyMinor,
  );

  const totalMoneyMinor = Math.max(
    0,
    typeof session.amount_total === "number"
      ? session.amount_total
      : expectedTotalMoneyMinor,
  );

  // Preserve store_orders_money_math:
  // subtotal_money_minor - discount_money_minor = total_money_minor.
  //
  // With tax-inclusive Stripe Prices, Stripe's amount_total should equal
  // the Store total. For an older/exclusive-tax session that already charged
  // more, expand the persisted subtotal while preserving the Store discount.
  let subtotalMoneyMinor = originalSubtotalMoneyMinor;
  let discountMoneyMinor = originalDiscountMoneyMinor;

  if (totalMoneyMinor !== expectedTotalMoneyMinor) {
    if (totalMoneyMinor <= originalSubtotalMoneyMinor) {
      discountMoneyMinor = Math.max(
        0,
        originalSubtotalMoneyMinor - totalMoneyMinor,
      );
    } else {
      subtotalMoneyMinor = totalMoneyMinor + originalDiscountMoneyMinor;
    }
  }
'''

text = replace_once(text, old_math, new_math, "Webhook tax-aware money maths")

text = replace_once(
    text,
    '''      total_money_minor: totalMoneyMinor,
      discount_money_minor: discountMoneyMinor,''',
    '''      subtotal_money_minor: subtotalMoneyMinor,
      total_money_minor: totalMoneyMinor,
      discount_money_minor: discountMoneyMinor,''',
    "Webhook persist adjusted subtotal",
)

write(rel, text)

print("")
print("Stripe tax-inclusive + webhook money-math patch applied.")
print("")
print("After build/deploy:")
print("  1. /admin/store -> Sync all to Stripe")
print("  2. Confirm Live prices are tax-inclusive")
print("  3. Resend evt_1UDCxuQ4vvIXVSOgfdDqpzTu")
print("")
print("The already-paid £1.19 order will be fulfilled at £1.19.")
print("New £0.99 purchases should charge exactly £0.99.")
print("")
print("Next: npm run build")
