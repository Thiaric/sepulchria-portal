from pathlib import Path

ROOT = Path.cwd()
target = ROOT / "components/characters/character-ledger.tsx"

if not target.exists():
    raise SystemExit("PATCH STOPPED: components/characters/character-ledger.tsx not found.")

text = target.read_text(encoding="utf-8")

old = '.eq("payment_method", "paddle")'
new = '.eq("payment_method", "stripe")'

count = text.count(old)
if count != 1:
    raise SystemExit(
        f'PATCH STOPPED: expected exactly 1 Paddle ledger filter, found {count}.'
    )

text = text.replace(old, new, 1)
target.write_text(text, encoding="utf-8", newline="\n")

print("Updated character ledger to load Stripe Store orders.")
print("Purchase entries remain negative; full refund entries remain positive.")
print("Next: npm run build")
