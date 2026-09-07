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

path = ROOT / "lib" / "store" / "paddle-server.ts"
text = path.read_text(encoding="utf-8")
original = text

old = '''    const pricePayload = {
      description: `Sepulchria Store · ${product.name} · ${price.currency}`,
      name: `${product.name} · ${price.currency}`,
      unit_price: {
        amount: String(price.money_amount_minor),
        currency_code: String(price.currency).toUpperCase(),
      },
      unit_price_overrides: (overrides ?? []).map((override) => ({
        country_codes: override.country_codes,
        unit_price: {
          amount: String(override.money_amount_minor),
          currency_code: String(override.currency).toUpperCase(),
        },
      })),
      tax_mode: "account_setting",
      quantity: { minimum: 1, maximum: 1 },
      status: price.is_active ? "active" : "archived",
      custom_data: {
        sepulchria_store_product_id: product.id,
        sepulchria_store_price_id: price.id,
      },
    };

    try {
      if (paddlePriceId) {
        await paddleRequest<{ data: { id: string } }>(
          `/prices/${paddlePriceId}`,
          { method: "PATCH", body: JSON.stringify(pricePayload) },
        );
      } else {
        const created = await paddleRequest<{ data: { id: string } }>(
          "/prices",
          {
            method: "POST",
            body: JSON.stringify({
              product_id: paddleProductId,
              ...pricePayload,
            }),
          },
        );
        paddlePriceId = created.data.id;
      }'''

new = '''    const unitPriceOverrides = (overrides ?? []).map((override) => ({
      country_codes: override.country_codes,
      unit_price: {
        amount: String(override.money_amount_minor),
        currency_code: String(override.currency).toUpperCase(),
      },
    }));

    const pricePayload = {
      description: `Sepulchria Store · ${product.name} · ${price.currency}`,
      name: `${product.name} · ${price.currency}`,
      unit_price: {
        amount: String(price.money_amount_minor),
        currency_code: String(price.currency).toUpperCase(),
      },
      ...(unitPriceOverrides.length
        ? { unit_price_overrides: unitPriceOverrides }
        : {}),
      tax_mode: "account_setting",
      quantity: { minimum: 1, maximum: 1 },
      status: price.is_active ? "active" : "archived",
      custom_data: {
        sepulchria_store_product_id: product.id,
        sepulchria_store_price_id: price.id,
      },
    };

    try {
      if (paddlePriceId) {
        await paddleRequest<{ data: { id: string } }>(
          `/prices/${paddlePriceId}`,
          { method: "PATCH", body: JSON.stringify(pricePayload) },
        );
      } else {
        const created = await paddleRequest<{ data: { id: string } }>(
          "/prices",
          {
            method: "POST",
            body: JSON.stringify({
              product_id: paddleProductId,
              description: pricePayload.description,
              name: pricePayload.name,
              unit_price: pricePayload.unit_price,
              ...(unitPriceOverrides.length
                ? { unit_price_overrides: unitPriceOverrides }
                : {}),
              tax_mode: pricePayload.tax_mode,
              quantity: pricePayload.quantity,
              custom_data: pricePayload.custom_data,
            }),
          },
        );
        paddlePriceId = created.data.id;
      }'''

text = replace_once(text, old, new, "Paddle price create/update payload")

if text == original:
    raise SystemExit("Nothing changed.")

path.write_text(text, encoding="utf-8")
print("Patched lib/store/paddle-server.ts")
print("New Paddle prices now use a minimal create payload and omit empty overrides/status.")
print("Existing Paddle prices still use the full update payload.")
print("Run: npm run build")
