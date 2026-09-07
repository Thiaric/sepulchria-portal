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
    p = ROOT / rel
    p.write_text(text, encoding="utf-8", newline="\n")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

# 1. Store account history
rel = "components/store/store-account-panels.tsx"
text = read(rel)
text = replace_once(
    text,
    "paddle_transaction_id, created_at",
    "stripe_payment_intent_id, created_at",
    "account panels select",
)
text = replace_once(
    text,
    'const money = order.payment_method === "paddle";',
    'const money = order.payment_method === "stripe";',
    "account panels payment method",
)
text = replace_once(
    text,
    'order.paddle_transaction_id ? ` · ${order.paddle_transaction_id}` : ""',
    'order.stripe_payment_intent_id ? ` · ${order.stripe_payment_intent_id}` : ""',
    "account panels transaction display",
)
write(rel, text)

# 2. Store receipt page
rel = "app/(portal)/store/orders/[id]/page.tsx"
text = read(rel)
text = replace_once(
    text,
    'const realMoney = order.payment_method === "paddle";',
    'const realMoney = order.payment_method === "stripe";',
    "receipt payment method",
)
text = replace_once(
    text,
    '{realMoney ? "Paddle" : "Remnants"}',
    '{realMoney ? "Stripe" : "Remnants"}',
    "receipt payment label",
)
old = '''          {order.paddle_transaction_id ? (
            <p className="sm:col-span-2 break-all">
              <span className="text-[rgb(var(--sep-colour-756958))]">Paddle transaction:</span> {order.paddle_transaction_id}
            </p>
          ) : null}
'''
new = '''          {order.stripe_payment_intent_id ? (
            <p className="sm:col-span-2 break-all">
              <span className="text-[rgb(var(--sep-colour-756958))]">Stripe payment:</span> {order.stripe_payment_intent_id}
            </p>
          ) : null}
'''
text = replace_once(text, old, new, "receipt Stripe payment ID")
write(rel, text)

# 3. Resend receipt formatting
rel = "lib/store/store-email.ts"
text = read(rel)
text = replace_once(
    text,
    'order.payment_method === "paddle"',
    'order.payment_method === "stripe"',
    "Store email real-money method",
)
write(rel, text)

# 4. Public webhook route list
rel = "lib/supabase/proxy.ts"
text = read(rel)
text = replace_once(
    text,
    '  "/api/store/paddle/webhook",\n',
    "",
    "public Paddle webhook route",
)
write(rel, text)

# 5. .env.example
rel = ".env.example"
text = read(rel)
old = '''# Paddle Billing
PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=your-paddle-api-key
PADDLE_WEBHOOK_SECRET=your-paddle-notification-destination-secret
PADDLE_CHECKOUT_URL=

NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your-paddle-client-side-token
PADDLE_WEBHOOK_URL=https://www.sepulchria.com/api/store/paddle/webhook
'''
new = '''# Stripe Managed Payments
STRIPE_ENVIRONMENT=sandbox
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-signing-secret
'''
text = replace_once(text, old, new, ".env.example payment provider block")
write(rel, text)

# 6. Public/legal copy
rel = "app/purchases/page.tsx"
text = read(rel)
old = '''                  Real-money purchases are processed through Paddle, which acts as Merchant of
                  Record for Paddle-processed transactions. Paddle handles checkout and payment
                  processing.
'''
new = '''                  Real-money purchases are processed through Stripe Managed Payments. Stripe acts
                  as Merchant of Record for these transactions and handles checkout, payment
                  processing and applicable transaction taxes.
'''
text = replace_once(text, old, new, "purchases payment wording")
write(rel, text)

rel = "app/refund-policy/page.tsx"
text = read(rel)
old = '''                Paddle processes Sepulchria real-money purchases and acts as Merchant of Record
                for Paddle-processed transactions. Approved refunds are returned through Paddle
                to the payment method used for the purchase.
'''
new = '''                Stripe Managed Payments processes Sepulchria real-money purchases, with Stripe
                acting as Merchant of Record. Approved refunds are returned through Stripe to the
                payment method used for the purchase.
'''
text = replace_once(text, old, new, "refund policy processor wording")
text = replace_once(
    text,
    "                Paddle&apos;s buyer and refund rules, and the circumstances of the purchase.",
    "                Stripe&apos;s applicable Managed Payments and refund rules, and the circumstances of the purchase.",
    "refund policy rules wording",
)
write(rel, text)

rel = "app/privacy/page.tsx"
text = read(rel)
old = '''              <p>For optional real-money purchases, Paddle acts as Merchant of Record and payment processor for Paddle-processed transactions. Paddle receives and processes the information needed to complete checkout, collect payment, administer the transaction and handle related payment or refund activity. Sepulchria does not receive your full payment-card details from Paddle.</p>
'''
new = '''              <p>For optional real-money purchases, Stripe Managed Payments acts as Merchant of Record and payment processor. Stripe receives and processes the information needed to complete checkout, collect payment, administer the transaction and handle related payment or refund activity. Sepulchria does not receive your full payment-card details from Stripe.</p>
'''
text = replace_once(text, old, new, "privacy payment provider wording")
write(rel, text)

rel = "app/terms/page.tsx"
text = read(rel)
old = '''              <p>Real-money purchases processed through Paddle are sold and processed by Paddle as Merchant of Record. Paddle handles checkout and payment processing for those transactions. The product, contents, currency and price are shown before purchase.</p>
'''
new = '''              <p>Real-money purchases are processed through Stripe Managed Payments, with Stripe acting as Merchant of Record. Stripe handles checkout and payment processing for those transactions. The product, contents, currency and price are shown before purchase.</p>
'''
text = replace_once(text, old, new, "terms payment provider wording")
write(rel, text)

# 7. Stale admin copy
rel = "app/(portal)/admin/cosmetics/page.tsx"
text = read(rel)
text = replace_once(
    text,
    "          Store pricing and Paddle fulfilment come later.",
    "          Store pricing and Stripe fulfilment are managed through the Store system.",
    "admin cosmetics payment copy",
)
write(rel, text)

# 8. Remove obsolete Paddle implementation and migration helper scripts
remove_files = [
    "lib/store/paddle-server.ts",
    "app/api/store/paddle/webhook/route.ts",
    "patch_stripe_managed_checkout_92eb782.py",
    "patch_stripe_webhook_92eb782.py",
]

for rel in remove_files:
    p = ROOT / rel
    if p.exists():
        p.unlink()
        print(f"Removed {rel}")

for rel in [
    "app/api/store/paddle/webhook",
    "app/api/store/paddle",
]:
    p = ROOT / rel
    if p.exists() and p.is_dir():
        try:
            p.rmdir()
        except OSError:
            pass

# 9. Verify application code has no Paddle references.
# Character ledger is intentionally excluded because it was already fixed locally.
remaining = []
for base in ["app", "components", "lib"]:
    root = ROOT / base
    if not root.exists():
        continue
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        relp = p.relative_to(ROOT).as_posix()
        if relp == "components/characters/character-ledger.tsx":
            continue
        if p.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt"}:
            continue
        try:
            content = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if "paddle" in content.lower():
            remaining.append(relp)

if remaining:
    fail(
        "Paddle references still remain in application files:\n  - "
        + "\n  - ".join(sorted(remaining))
    )

print("")
print("Paddle application cleanup applied successfully.")
print("")
print("NEXT:")
print("  npm uninstall @paddle/paddle-js")
print("  npm run build")
print("")
print("Do not drop Paddle database columns yet; that is the final SQL cleanup.")
