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

targets = [
    "app/(portal)/admin/store/page.tsx",
    "components/portal/admin-context-panel.tsx",
]

replacements = [
    ("paddle_product_id_sandbox", "stripe_product_id_test"),
    ("paddle_product_id_live", "stripe_product_id_live"),
    ("paddle_price_id_sandbox", "stripe_price_id_test"),
    ("paddle_price_id_live", "stripe_price_id_live"),
    ("paddle_price_id", "stripe_price_id_test"),
    ("paddle_sync_status", "stripe_sync_status"),
    ("paddle_sync_error", "stripe_sync_error"),
    ("paddle_synced_at", "stripe_synced_at"),
    ("paddle_transaction_id", "stripe_payment_intent_id"),
    ("Paddle", "Stripe"),
    ("paddle", "stripe"),
]

for rel in targets:
    text = read(rel)
    before = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text == before:
        fail(f"No Paddle references were changed in {rel}.")
    write(rel, text)
    print(f"Cleaned {rel}")

# Verify all application code, excluding the ledger the user already fixed locally.
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
print("Application code is now clear of Paddle references (ledger excluded as requested).")
print("Next:")
print("  npm uninstall @paddle/paddle-js")
print("  npm run build")
