export const ORDER_LEVELS = [
  1,
  2,
  3,
  4,
  5,
  6,
] as const;

export type OrderLevel =
  (typeof ORDER_LEVELS)[number];

export function isOrderLevel(
  value: number,
): value is OrderLevel {
  return ORDER_LEVELS.includes(
    value as OrderLevel,
  );
}
