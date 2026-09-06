from pathlib import Path

path = Path("app/(portal)/store/actions.ts")
text = path.read_text(encoding="utf-8")

needle = "as typeof discount"
replacement = '''as {
      discount_code_id: string;
      user_discount_code_id: string | null;
      discount_type: "percentage" | "fixed_money";
      discount_value: number;
      discount_money_minor: number;
    }'''

count = text.count(needle)
if count == 0:
    raise SystemExit(
        'Could not find "as typeof discount" in app/(portal)/store/actions.ts. '
        'Run: Select-String -Path "app/(portal)/store/actions.ts" -Pattern "discount =" -Context 8,8'
    )

text = text.replace(needle, replacement)
path.write_text(text, encoding="utf-8")

print(f'Fixed {count} occurrence(s) of "as typeof discount".')
