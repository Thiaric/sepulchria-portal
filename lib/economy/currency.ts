export const CURRENCY_NAME = "Remnants";
export const CURRENCY_SYMBOL = "🝈";

export function formatRemnants(
  amount: number,
) {
  return `${amount.toLocaleString("en-GB")} ${CURRENCY_SYMBOL}`;
}

export function formatSignedRemnants(
  amount: number,
) {
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString("en-GB")} ${CURRENCY_SYMBOL}`;
}
