from pathlib import Path

path = Path("app/(portal)/store/actions.ts")
text = path.read_text(encoding="utf-8")

old = '''  let discount: {
    discount_code_id: string;
    user_discount_code_id: string | null;
    discount_type: "percentage" | "fixed_money";
    discount_value: number;
    discount_money_minor: number;
  } | null = null;'''

new = '''  type ResolvedStoreDiscount = {
    discount_code_id: string;
    user_discount_code_id: string | null;
    discount_type: "percentage" | "fixed_money";
    discount_value: number;
    discount_money_minor: number;
  };

  let discount: ResolvedStoreDiscount | null = null;'''

if old not in text:
    raise SystemExit("Could not find the expected discount type block in app/(portal)/store/actions.ts")

text = text.replace(old, new, 1)

old2 = '    discount = row as typeof discount;'
new2 = '    discount = row as ResolvedStoreDiscount;'

if old2 not in text:
    raise SystemExit("Could not find the expected discount assignment in app/(portal)/store/actions.ts")

text = text.replace(old2, new2, 1)
path.write_text(text, encoding="utf-8")

print("Fixed Store discount TypeScript narrowing.")
