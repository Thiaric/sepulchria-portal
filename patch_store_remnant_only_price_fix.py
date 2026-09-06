from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/(portal)/admin/store/actions.ts"

if not path.exists():
    raise SystemExit(f"Missing file: {path}")

text = path.read_text(encoding="utf-8")

old = '''  const productId = str(formData, "product_id");
  const currency = nullableStr(formData, "currency")?.toUpperCase() ?? null;
  const moneyAmountMinor = intOrNull(formData, "money_amount_minor");
  const remnantsAmount = intOrNull(formData, "remnants_amount");

  if (moneyAmountMinor === null && remnantsAmount === null) {
    throw new Error("Enter a real-money price, a Remnant price, or both.");
  }
  if (moneyAmountMinor !== null && !currency) {
    throw new Error("Currency is required for a real-money price.");
  }

  if (currency) {
    await admin.from("store_product_prices")
      .delete()
      .eq("product_id", productId)
      .eq("currency", currency);
  }

  if (remnantsAmount !== null) {
    await admin.from("store_product_prices")
      .delete()
      .eq("product_id", productId)
      .not("remnants_amount", "is", null);
  }

  const { error } = await admin.from("store_product_prices").insert({
    product_id: productId,
    currency,
    money_amount_minor: moneyAmountMinor,
    remnants_amount: remnantsAmount,
    paddle_price_id: nullableStr(formData, "paddle_price_id"),
    is_active: true,
  });'''

new = '''  const productId = str(formData, "product_id");
  const requestedCurrency =
    nullableStr(formData, "currency")?.toUpperCase() ?? null;
  const moneyAmountMinor = intOrNull(formData, "money_amount_minor");
  const remnantsAmount = intOrNull(formData, "remnants_amount");
  const requestedPaddlePriceId =
    nullableStr(formData, "paddle_price_id");

  if (moneyAmountMinor === null && remnantsAmount === null) {
    throw new Error("Enter a real-money price, a Remnant price, or both.");
  }

  const currency =
    moneyAmountMinor !== null
      ? requestedCurrency
      : null;

  const paddlePriceId =
    moneyAmountMinor !== null
      ? requestedPaddlePriceId
      : null;

  if (moneyAmountMinor !== null && !currency) {
    throw new Error("Currency is required for a real-money price.");
  }

  if (currency) {
    await admin.from("store_product_prices")
      .delete()
      .eq("product_id", productId)
      .eq("currency", currency);
  }

  if (remnantsAmount !== null) {
    await admin.from("store_product_prices")
      .delete()
      .eq("product_id", productId)
      .not("remnants_amount", "is", null);
  }

  const { error } = await admin.from("store_product_prices").insert({
    product_id: productId,
    currency,
    money_amount_minor: moneyAmountMinor,
    remnants_amount: remnantsAmount,
    paddle_price_id: paddlePriceId,
    is_active: true,
  });'''

if new in text:
    print("Store Remnant-only price fix already applied.")
elif old not in text:
    raise SystemExit(
        "Expected saveStorePrice block not found. "
        "Your local actions.ts differs from the ed9bf92 baseline."
    )
else:
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("Fixed Remnant-only Store prices.")

print("Now run: npm run build")
