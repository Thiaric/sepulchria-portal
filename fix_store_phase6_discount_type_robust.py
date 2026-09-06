from pathlib import Path
import re

path = Path("app/(portal)/store/actions.ts")
text = path.read_text(encoding="utf-8")

pattern = re.compile(
    r'''(?ms)^  let discount:\s*\{\s*
    discount_code_id:\s*string;\s*
    user_discount_code_id:\s*string\s*\|\s*null;\s*
    discount_type:\s*"percentage"\s*\|\s*"fixed_money";\s*
    discount_value:\s*number;\s*
    discount_money_minor:\s*number;\s*
  \}\s*\|\s*null\s*=\s*null;'''
)

replacement = '''  type ResolvedStoreDiscount = {
    discount_code_id: string;
    user_discount_code_id: string | null;
    discount_type: "percentage" | "fixed_money";
    discount_value: number;
    discount_money_minor: number;
  };

  let discount: ResolvedStoreDiscount | null = null;'''

text, count1 = pattern.subn(replacement, text, count=1)

text, count2 = re.subn(
    r'discount\s*=\s*row\s+as\s+typeof\s+discount\s*;',
    'discount = row as ResolvedStoreDiscount;',
    text,
    count=1,
)

if count1 == 0 and "type ResolvedStoreDiscount" not in text:
    raise SystemExit(
        "Could not locate the discount type block. Please send lines 150-220 of app/(portal)/store/actions.ts."
    )

if count2 == 0 and "discount = row as ResolvedStoreDiscount;" not in text:
    raise SystemExit(
        "Could not locate the discount assignment. Please send lines 150-220 of app/(portal)/store/actions.ts."
    )

path.write_text(text, encoding="utf-8")

print("Fixed TypeScript discount typing in app/(portal)/store/actions.ts")
print(f"Type block replacements: {count1}")
print(f"Assignment replacements: {count2}")
