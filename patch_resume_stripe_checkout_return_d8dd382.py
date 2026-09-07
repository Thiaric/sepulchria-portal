from pathlib import Path

ROOT = Path.cwd()

def fail(message: str):
    raise SystemExit(f"\nPATCH STOPPED: {message}\n")

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

# 1) Proxy: add return route ONLY to PUBLIC_ROUTES, before /auth.
rel = "lib/supabase/proxy.ts"
text = read(rel)

if '"/store-checkout-return"' not in text:
    marker = '  "/refund-policy",\n  "/auth",'
    first = text.find(marker)
    if first == -1:
        fail("Could not find PUBLIC_ROUTES insertion point.")
    text = text[:first] + text[first:].replace(
        marker,
        '  "/refund-policy",\n  "/store-checkout-return",\n  "/auth",',
        1,
    )
    write(rel, text)
    print("Added /store-checkout-return to PUBLIC_ROUTES.")
else:
    print("/store-checkout-return already present in proxy; left unchanged.")

# 2) Stripe success/cancel URLs.
rel = "lib/store/stripe-server.ts"
text = read(rel)

old = '''    success_url:
      `${storeSiteUrl()}/store?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${storeSiteUrl()}/store?stripe=cancelled`,
'''
new = '''    success_url:
      `${storeSiteUrl()}/store-checkout-return?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      `${storeSiteUrl()}/store-checkout-return?stripe=cancelled`,
'''

if old in text:
    text = replace_once(text, old, new, "Stripe return URLs")
    write(rel, text)
    print("Updated Stripe success/cancel URLs.")
elif "/store-checkout-return?stripe=success" in text:
    print("Stripe return URLs already updated; left unchanged.")
else:
    fail("Could not identify Stripe success/cancel URL block.")

# 3) Receipt amount formatting.
rel = "lib/store/store-email.ts"
text = read(rel)

old = '''  const amount =
    order.payment_method === "stripe"
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: order.currency || "GBP",
        }).format(Number(order.total_money_minor ?? 0) / 100)
      : `${Number(order.total_remnants ?? 0)} Remnants`;
'''
new = '''  const amount =
    order.payment_method === "remnants"
      ? `${Number(order.total_remnants ?? 0)} Remnants`
      : new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: order.currency || "GBP",
        }).format(Number(order.total_money_minor ?? 0) / 100);
'''

if old in text:
    text = replace_once(text, old, new, "Store receipt amount formatting")
    write(rel, text)
    print("Updated purchase receipt amount formatting.")
elif 'order.payment_method === "remnants"' in text:
    print("Receipt amount formatting already updated; left unchanged.")
else:
    fail("Could not identify Store receipt amount formatting block.")

# 4) Verify the files created/changed by the first partial run are present.
checks = {
    "components/store/store-stripe-purchase-button.tsx": [
        'window.open(',
        'sepulchria-stripe-checkout',
    ],
    "components/store/store-stripe-checkout-bridge.tsx": [
        'sepulchria:store-checkout-return',
    ],
    "app/(portal)/store/page.tsx": [
        'StoreStripeCheckoutBridge',
    ],
    "app/store-checkout-return/page.tsx": [
        'window.close()',
        'sepulchria:store-checkout-return',
    ],
}

for rel, needles in checks.items():
    content = read(rel)
    for needle in needles:
        if needle not in content:
            fail(f"{rel} is missing expected partial-patch change: {needle}")

print("")
print("Recovery patch completed.")
print("Next: npm run build")
