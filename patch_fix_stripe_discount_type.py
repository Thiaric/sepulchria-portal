from pathlib import Path

ROOT = Path.cwd()
target = ROOT / "app/(portal)/store/actions.ts"

if not target.exists():
    raise SystemExit("PATCH STOPPED: app/(portal)/store/actions.ts not found.")

text = target.read_text(encoding="utf-8")

old = '''  let discount: {
    discount_code_id: string;
    user_discount_code_id: string | null;
    discount_type: "percentage" | "fixed_money";
    discount_value: number;
    discount_money_minor: number;
  } | null = null;
'''

new = '''  type StoreMoneyDiscount = {
    discount_code_id: string;
    user_discount_code_id: string | null;
    discount_type: "percentage" | "fixed_money";
    discount_value: number;
    discount_money_minor: number;
  };

  let discount: StoreMoneyDiscount | null = null;
'''

if old not in text:
    raise SystemExit("PATCH STOPPED: expected Stripe discount type block was not found.")

text = text.replace(old, new, 1)

old_cast = "    discount = row as typeof discount;"
new_cast = "    discount = row as StoreMoneyDiscount;"

if old_cast not in text:
    raise SystemExit("PATCH STOPPED: expected discount assignment was not found.")

text = text.replace(old_cast, new_cast, 1)

target.write_text(text, encoding="utf-8", newline="\n")

print("Fixed Stripe discount TypeScript narrowing.")
print("Next: npm run build")
