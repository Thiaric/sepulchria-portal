from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "95e82bc79fe096bd74e6f775b6e08b6c2c096541"

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

path = ROOT / "app" / "(portal)" / "store" / "actions.ts"
text = path.read_text(encoding="utf-8")
original = text

old = '''      ...(discount ? {
        discount: {
          type: discount.discount_type === "percentage" ? "percentage" : "flat",
          description: `Sepulchria Store code ${discountCode.toUpperCase()}`,
          amount: String(discount.discount_value),
        },
      } : {}),'''

new = '''      ...(discount
        ? {
            discount:
              discount.discount_type === "percentage"
                ? {
                    type: "percentage",
                    description: `Sepulchria Store code ${discountCode.toUpperCase()}`,
                    amount: String(discount.discount_value),
                  }
                : {
                    type: "flat",
                    description: `Sepulchria Store code ${discountCode.toUpperCase()}`,
                    amount: String(discount.discount_value),
                    currency_code: String(price.currency).toUpperCase(),
                  },
          }
        : {}),'''

text = replace_once(
    text,
    old,
    new,
    "Paddle inline discount payload",
)

if text == original:
    raise SystemExit("Nothing changed.")

path.write_text(text, encoding="utf-8")
print("Patched app/(portal)/store/actions.ts")
print("Fixed Paddle flat/fixed-money discounts by sending currency_code.")
print("Percentage discount behavior is unchanged.")
print("Run: npm run build")
