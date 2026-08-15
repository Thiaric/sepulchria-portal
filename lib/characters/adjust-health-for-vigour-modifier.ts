export function adjustHealthForVigourModifier({
  currentHealth,
  oldModifier,
  newModifier,
}: {
  currentHealth: number | null;
  oldModifier: number;
  newModifier: number;
}) {
  const delta =
    (newModifier - oldModifier) * 10;

  return Math.max(
    0,
    (currentHealth ?? 0) + delta,
  );
}