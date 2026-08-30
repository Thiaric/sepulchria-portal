export type CharacterAuditDisplayBase = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  operation: string;
  actor_type: "player" | "staff" | "system";
  actor_label: string | null;
  actor_staff_role: string | null;
  source: string;
  changed_fields: string[];
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  item_name?: string | null;
  audit_context?: string | null;
};

export const TECHNICAL_AUDIT_FIELDS = new Set([
  "id","user_id","actor_user_id","character_id","created_at","updated_at",
  "source_id","source_type","transaction_type","item_id",
]);

export function formatAuditDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function humanAuditLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function auditEventLabel(row: CharacterAuditDisplayBase) {
  return row.audit_context
    ? humanAuditLabel(row.audit_context)
    : humanAuditLabel(row.event_type);
}

export function auditSourceLabel(row: CharacterAuditDisplayBase) {
  return row.audit_context
    ? humanAuditLabel(row.audit_context)
    : humanAuditLabel(row.source);
}

export function auditRecordTypeLabel(row: CharacterAuditDisplayBase) {
  return row.audit_context
    ? humanAuditLabel(row.audit_context)
    : humanAuditLabel(row.entity_type);
}

export function auditDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return new Intl.NumberFormat("en-GB").format(value);
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (Array.isArray(value)) return value.map(auditDisplayValue).join(", ");
  return JSON.stringify(value);
}

export function prettyAuditValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function meaningfulAuditEntries(value: Record<string, unknown> | null) {
  if (!value) return [];
  return Object.entries(value).filter(
    ([key, entryValue]) =>
      !TECHNICAL_AUDIT_FIELDS.has(key) &&
      entryValue !== null &&
      entryValue !== undefined &&
      entryValue !== "",
  );
}

function qty(row: CharacterAuditDisplayBase, side: "before" | "after") {
  const source = side === "before" ? row.old_values : row.new_values;
  const raw = source?.quantity;
  return typeof raw === "number"
    ? raw
    : raw !== null && raw !== undefined && Number.isFinite(Number(raw))
      ? Number(raw)
      : null;
}

function isInventory(entityType: string) {
  return entityType === "character_items" || entityType === "character_item_instances";
}

export function auditSummary(row: CharacterAuditDisplayBase) {
  const before = row.old_values ?? {};
  const after = row.new_values ?? {};

  if (
    row.audit_context === "crafting" &&
    isInventory(row.entity_type) &&
    row.item_name
  ) {
    const beforeQty = qty(row, "before");
    const afterQty = qty(row, "after");
    let delta: number | null = null;

    if (row.entity_type === "character_item_instances") {
      delta =
        row.operation === "insert"
          ? 1
          : row.operation === "delete"
            ? -1
            : 0;
    } else if (row.operation === "insert") {
      delta = afterQty ?? 1;
    } else if (row.operation === "delete") {
      delta = -(beforeQty ?? 1);
    } else if (beforeQty !== null && afterQty !== null) {
      delta = afterQty - beforeQty;
    }

    if (delta !== null && delta > 0) {
      return `Crafted ${delta} × ${row.item_name}`;
    }

    if (delta !== null && delta < 0) {
      return `Used ${Math.abs(delta)} × ${row.item_name} for Crafting`;
    }

    return `${row.item_name} changed during Crafting`;
  }

  if (isInventory(row.entity_type) && row.item_name) {
    const beforeQty = qty(row, "before");
    const afterQty = qty(row, "after");

    if (row.operation === "insert") {
      return afterQty !== null
        ? `${afterQty} × ${row.item_name} added to inventory`
        : `${row.item_name} added to inventory`;
    }

    if (row.operation === "delete") {
      return beforeQty !== null
        ? `${beforeQty} × ${row.item_name} removed from inventory`
        : `${row.item_name} removed from inventory`;
    }

    if (
      row.operation === "update" &&
      beforeQty !== null &&
      afterQty !== null &&
      beforeQty !== afterQty
    ) {
      return `${row.item_name} quantity changed: ${beforeQty} → ${afterQty}`;
    }

    return `${row.item_name} inventory record updated`;
  }

  if (
    row.entity_type === "remnant_ledger" ||
    ("amount" in after && "balance_after" in after)
  ) {
    const amount = Number(after.amount ?? 0);
    const reason = String(after.reason ?? "Remnant movement");
    const balance = Number(after.balance_after ?? 0);

    const movement =
      amount < 0
        ? `${Math.abs(amount)} Remnants spent`
        : amount > 0
          ? `${amount} Remnants received`
          : "Remnant balance recorded";

    return `${movement} · ${reason} · Balance after: ${new Intl.NumberFormat("en-GB").format(balance)} R`;
  }

  if (row.operation === "update" && row.changed_fields?.length) {
    const fields = row.changed_fields
      .filter((field) => field !== "updated_at")
      .slice(0, 4)
      .map((field) =>
        `${humanAuditLabel(field)}: ${auditDisplayValue(before[field])} → ${auditDisplayValue(after[field])}`,
      );

    if (fields.length) return fields.join(" · ");
  }

  const source = row.operation === "delete" ? before : after;
  const entries = meaningfulAuditEntries(source).slice(0, 4);

  if (entries.length) {
    return entries
      .map(([key, value]) => `${humanAuditLabel(key)}: ${auditDisplayValue(value)}`)
      .join(" · ");
  }

  return humanAuditLabel(row.event_type);
}

export function auditChangeRows(row: CharacterAuditDisplayBase) {
  const before = row.old_values ?? {};
  const after = row.new_values ?? {};

  const rows =
    row.operation === "update"
      ? (row.changed_fields ?? [])
          .filter((field) => field !== "updated_at" && field !== "item_id")
          .map((field) => ({ field, before: before[field], after: after[field] }))
      : meaningfulAuditEntries(row.operation === "delete" ? before : after).map(
          ([field, value]) => ({
            field,
            before: row.operation === "delete" ? value : null,
            after: row.operation === "delete" ? null : value,
          }),
        );

  if (isInventory(row.entity_type) && row.item_name) {
    return [
      {
        field: "item",
        before: row.operation === "insert" ? null : row.item_name,
        after: row.operation === "delete" ? null : row.item_name,
      },
      ...rows.filter((change) => change.field !== "item"),
    ];
  }

  return rows;
}
