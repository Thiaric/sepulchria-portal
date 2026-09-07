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

current = head()
if current != EXPECTED_HEAD:
    raise SystemExit(
        f"This repair is for {EXPECTED_HEAD}; your local HEAD is {current}."
    )

path = ROOT / "app" / "(portal)" / "store" / "actions.ts"
text = path.read_text(encoding="utf-8")
original = text

bad_block = '''      ...(discount
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

original_block = '''      ...(discount ? {
        discount: {
          type: discount.discount_type === "percentage" ? "percentage" : "flat",
          description: `Sepulchria Store code ${discountCode.toUpperCase()}`,
          amount: String(discount.discount_value),
        },
      } : {}),'''

fixed_block = '''      ...(discount?.discount_type === "fixed_money"
        ? { currency_code: String(price.currency).toUpperCase() }
        : {}),
      ...(discount
        ? {
            discount: {
              type:
                discount.discount_type === "percentage"
                  ? "percentage"
                  : "flat",
              description: `Sepulchria Store code ${discountCode.toUpperCase()}`,
              amount: String(discount.discount_value),
            },
          }
        : {}),'''

if bad_block in text:
    text = text.replace(bad_block, fixed_block, 1)
elif original_block in text:
    text = text.replace(original_block, fixed_block, 1)
elif fixed_block in text:
    raise SystemExit("The correct flat-discount currency fix is already present.")
else:
    raise SystemExit(
        "Could not find either the original or previous patched Paddle discount block. "
        "No file was written."
    )

if text == original:
    raise SystemExit("Nothing changed.")

path.write_text(text, encoding="utf-8")
print("Repaired app/(portal)/store/actions.ts")
print("For fixed-money discounts, currency_code is now sent at TRANSACTION level.")
print("The custom discount object contains only type/description/amount.")
print("Run: npm run build")
