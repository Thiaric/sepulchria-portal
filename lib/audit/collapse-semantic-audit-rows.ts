import {
  type CharacterAuditDisplayBase,
} from "@/lib/audit/character-audit-display";

function actionId(row: CharacterAuditDisplayBase) {
  const value = row.metadata?.action_id;
  return typeof value === "string" ? value : null;
}

function semantic(row: CharacterAuditDisplayBase) {
  return row.operation === "event" && row.metadata?.semantic_event === true;
}

function rawMutation(row: CharacterAuditDisplayBase) {
  return row.metadata?.raw_mutation === true && actionId(row) !== null;
}

export function collapseSemanticAuditRows<T extends CharacterAuditDisplayBase>(
  rows: T[],
): Array<T & { related_mutations?: CharacterAuditDisplayBase[] }> {
  const semanticIds = new Set(
    rows
      .filter(semantic)
      .map(actionId)
      .filter((value): value is string => Boolean(value)),
  );

  const rawByAction = new Map<string, CharacterAuditDisplayBase[]>();

  for (const row of rows) {
    const id = actionId(row);
    if (!id || !semanticIds.has(id) || !rawMutation(row)) continue;

    const list = rawByAction.get(id) ?? [];
    list.push(row);
    rawByAction.set(id, list);
  }

  return rows
    .filter((row) => {
      const id = actionId(row);
      return !rawMutation(row) || !id || !semanticIds.has(id);
    })
    .map((row) => {
      const id = actionId(row);

      if (!semantic(row) || !id) return row;

      return {
        ...row,
        related_mutations: rawByAction.get(id) ?? [],
      };
    });
}
