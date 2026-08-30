import "server-only";

import { enrichCharacterAuditItemNames } from "@/lib/audit/enrich-character-audit-items";
import { enrichCharacterAuditDomainNames } from "@/lib/audit/enrich-character-audit-domain";

type Row = {
  id: string;
  character_id?: string | null;
  entity_type: string;
  entity_id: string | null;
  operation: string;
  actor_type?: string | null;
  source?: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

function isInventory(row: Row) {
  return (
    row.entity_type === "character_items" ||
    row.entity_type === "character_item_instances"
  );
}

function containsCraft(value: unknown) {
  if (value === null || value === undefined) return false;

  try {
    const text =
      typeof value === "string"
        ? value
        : JSON.stringify(value);

    return text.toLowerCase().includes("craft");
  } catch {
    return false;
  }
}

function explicitCrafting(row: Row) {
  return (
    containsCraft(row.source) ||
    containsCraft(row.metadata) ||
    containsCraft(row.old_values?.acquisition_source) ||
    containsCraft(row.new_values?.acquisition_source)
  );
}

function quantity(value: Record<string, unknown> | null) {
  const raw = value?.quantity;

  if (typeof raw === "number") return raw;

  if (
    raw !== null &&
    raw !== undefined &&
    Number.isFinite(Number(raw))
  ) {
    return Number(raw);
  }

  return null;
}

function delta(row: Row) {
  if (!isInventory(row)) return null;

  if (row.entity_type === "character_item_instances") {
    if (row.operation === "insert") return 1;
    if (row.operation === "delete") return -1;
    return 0;
  }

  const before = quantity(row.old_values);
  const after = quantity(row.new_values);

  if (row.operation === "insert") return after ?? 1;
  if (row.operation === "delete") return -(before ?? 1);

  return before !== null && after !== null
    ? after - before
    : null;
}

function groupKey(row: Row) {
  return [
    row.character_id ?? "single-character",
    row.actor_type ?? "unknown",
    row.created_at,
  ].join("|");
}

export async function enrichCharacterAuditRows<T extends Row>(
  rows: T[],
): Promise<
  Array<
    T & {
      item_name: string | null;
      audit_context: string | null;
    }
  >
> {
  const itemEnriched =
    await enrichCharacterAuditItemNames(rows);

  const enriched =
    await enrichCharacterAuditDomainNames(itemEnriched);

  const groups = new Map<
    string,
    typeof enriched
  >();

  for (const row of enriched) {
    if (!isInventory(row)) continue;

    const key = groupKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const craftingIds = new Set<string>();

  for (const group of groups.values()) {
    const explicit =
      group.some(explicitCrafting);

    const deltas = group
      .map(delta)
      .filter(
        (value): value is number =>
          value !== null && value !== 0,
      );

    const hasGain =
      deltas.some((value) => value > 0);
    const hasLoss =
      deltas.some((value) => value < 0);
    const byPlayer =
      group.some((row) => row.actor_type === "player");

    if (
      explicit ||
      (byPlayer && hasGain && hasLoss)
    ) {
      for (const row of group) {
        craftingIds.add(row.id);
      }
    }
  }

  return enriched.map((row) => ({
    ...row,
    audit_context:
      craftingIds.has(row.id)
        ? "crafting"
        : null,
  }));
}
