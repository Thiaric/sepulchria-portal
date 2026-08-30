import {
  type CharacterAuditDisplayBase,
} from "@/lib/audit/character-audit-display";

type AuditRow = CharacterAuditDisplayBase & {
  related_mutations?: CharacterAuditDisplayBase[];
};

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

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function ledgerSourceType(row: CharacterAuditDisplayBase) {
  return row.entity_type === "remnant_ledger"
    ? stringValue(row.new_values?.source_type)
    : "";
}

function ledgerSourceId(row: CharacterAuditDisplayBase) {
  return row.entity_type === "remnant_ledger"
    ? stringValue(row.new_values?.source_id)
    : "";
}

function inventoryDelta(row: CharacterAuditDisplayBase) {
  if (
    row.entity_type !== "character_items" &&
    row.entity_type !== "character_item_instances"
  ) {
    return 0;
  }

  if (row.entity_type === "character_item_instances") {
    if (row.operation === "insert") return 1;
    if (row.operation === "delete") return -1;
    return 0;
  }

  const before = numberValue(row.old_values?.quantity);
  const after = numberValue(row.new_values?.quantity);

  if (row.operation === "insert") return after || 1;
  if (row.operation === "delete") return -(before || 1);
  return after - before;
}

function derivedEvent<T extends AuditRow>(
  anchor: T,
  values: {
    eventType: string;
    entityType: string;
    source: string;
    entityId?: string | null;
    newValues: Record<string, unknown>;
    related: CharacterAuditDisplayBase[];
    actorType?: "player" | "staff" | "system";
    actorLabel?: string | null;
  },
): T {
  return {
    ...anchor,
    id: `derived:${values.eventType}:${anchor.id}`,
    event_type: values.eventType,
    entity_type: values.entityType,
    entity_id: values.entityId ?? anchor.entity_id,
    operation: "event",
    source: values.source,
    changed_fields: [],
    old_values: null,
    new_values: values.newValues,
    metadata: {
      ...(anchor.metadata ?? {}),
      semantic_event: true,
      derived_character_log_event: true,
    },
    actor_type: values.actorType ?? anchor.actor_type,
    actor_label:
      values.actorLabel !== undefined ? values.actorLabel : anchor.actor_label,
    related_mutations: values.related,
  } as T;
}

function collapseExplicitSemantic<T extends AuditRow>(rows: T[]): T[] {
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
        related_mutations: [
          ...(row.related_mutations ?? []),
          ...(rawByAction.get(id) ?? []),
        ],
      };
    }) as T[];
}

export function collapseSemanticAuditRows<T extends AuditRow>(
  rows: T[],
): T[] {
  const base = collapseExplicitSemantic(rows);
  const consumed = new Set<string>();
  const replacements: T[] = [];

  const byTimestamp = new Map<string, T[]>();
  for (const row of base) {
    const group = byTimestamp.get(row.created_at) ?? [];
    group.push(row);
    byTimestamp.set(row.created_at, group);
  }

  // Odd Jobs: claim + ledger + wallet => one action.
  for (const group of byTimestamp.values()) {
    const oddLedger = group.find((row) => ledgerSourceType(row) === "odd_job");
    const claimInsert = group.find(
      (row) => row.entity_type === "odd_job_claims" && row.operation === "insert",
    );
    if (!oddLedger || !claimInsert) continue;

    const sourceId = ledgerSourceId(oddLedger) || stringValue(claimInsert.entity_id);
    const reason = stringValue(oddLedger.new_values?.reason);
    const jobName = reason.replace(/^Odd Jobs Bureau\s+—\s+/i, "");
    const amount = numberValue(oddLedger.new_values?.amount);

    const related = group.filter(
      (row) =>
        row.entity_type === "odd_job_claims" ||
        row.entity_type === "character_wallets" ||
        (row.entity_type === "remnant_ledger" &&
          ledgerSourceType(row) === "odd_job" &&
          (!sourceId || ledgerSourceId(row) === sourceId)),
    );

    for (const row of related) consumed.add(row.id);

    replacements.push(
      derivedEvent(claimInsert, {
        eventType: "odd_job_completed",
        entityType: "odd_job",
        entityId: sourceId || claimInsert.entity_id,
        source: "odd_jobs",
        newValues: {
          job_name: jobName || "Odd Job",
          remnants_earned: Math.max(amount, 0),
          work_date: claimInsert.new_values?.work_date ?? null,
        },
        related,
      }),
    );
  }

  // House of Chances: stake + payout + wallet + prize Item changes => one play.
  const houseLedgers = base.filter(
    (row) => ledgerSourceType(row) === "house_of_chances",
  );
  const houseSourceIds = Array.from(
    new Set(houseLedgers.map(ledgerSourceId).filter(Boolean)),
  );

  for (const sourceId of houseSourceIds) {
    const ledgers = houseLedgers.filter((row) => ledgerSourceId(row) === sourceId);
    if (!ledgers.length) continue;

    const timestamp = ledgers[0].created_at;
    const sameTime = byTimestamp.get(timestamp) ?? [];
    const explicitEvent = sameTime.find(
      (row) => row.operation === "event" && row.event_type === "house_of_chances",
    );

    const costPaid = ledgers
      .filter((row) => numberValue(row.new_values?.amount) < 0)
      .reduce((sum, row) => sum + Math.abs(numberValue(row.new_values?.amount)), 0);

    const remnantsWon = ledgers
      .filter((row) => numberValue(row.new_values?.amount) > 0)
      .reduce((sum, row) => sum + numberValue(row.new_values?.amount), 0);

    const prizeRows = sameTime.filter(
      (row) =>
        (row.entity_type === "character_items" ||
          row.entity_type === "character_item_instances") &&
        inventoryDelta(row) > 0,
    );

    const prizeItems = prizeRows.map((row) => ({
      item_name: row.item_name ?? "Item",
      quantity: inventoryDelta(row),
    }));

    const winningLedger = ledgers.find(
      (row) => numberValue(row.new_values?.amount) > 0,
    );
    const matchedRuleName = winningLedger
      ? stringValue(winningLedger.new_values?.reason).replace(
          /^House of Chances\s*-\s*/i,
          "",
        )
      : null;

    const walletRows = sameTime.filter(
      (row) => row.entity_type === "character_wallets",
    );

    const related = [
      ...ledgers,
      ...walletRows,
      ...prizeRows,
      ...(explicitEvent?.related_mutations ?? []),
    ];

    for (const row of [...ledgers, ...walletRows, ...prizeRows]) {
      consumed.add(row.id);
    }
    if (explicitEvent) consumed.add(explicitEvent.id);

    const anchor = explicitEvent ?? ledgers[0];

    replacements.push(
      derivedEvent(anchor, {
        eventType: "house_of_chances",
        entityType: "house_of_chances_play",
        entityId: sourceId,
        source: "house_of_chances",
        newValues: {
          ...(explicitEvent?.new_values ?? {}),
          cost_paid: costPaid,
          remnants_won: remnantsWon,
          prize_items: prizeItems,
          matched_rule_name:
            explicitEvent?.new_values?.matched_rule_name ?? matchedRuleName,
        },
        related,
      }),
    );
  }

  // Breeze: one rental instead of separate wallet + ledger rows.
  for (const row of base) {
    if (ledgerSourceType(row) !== "breeze_lodgings") continue;

    const reason = stringValue(row.new_values?.reason);
    const match = reason.match(
      /^The Breeze Lodgings\s+—\s+(.+?),\s+(\d+)\s+days?\s+at\s+(\d+)\s+Remnants\/day$/i,
    );
    const sameTime = byTimestamp.get(row.created_at) ?? [];
    const wallets = sameTime.filter(
      (candidate) => candidate.entity_type === "character_wallets",
    );
    const related = [row, ...wallets];

    consumed.add(row.id);
    for (const wallet of wallets) consumed.add(wallet.id);

    replacements.push(
      derivedEvent(row, {
        eventType: "breeze_rental",
        entityType: "breeze_lodging_rental",
        entityId: ledgerSourceId(row) || row.entity_id,
        source: "breeze_lodgings",
        newValues: {
          lodging_name:
            match?.[1] ?? reason.replace(/^The Breeze Lodgings\s+—\s+/i, ""),
          days: match ? Number(match[2]) : null,
          remnants_per_day: match ? Number(match[3]) : null,
          remnants_spent: Math.abs(numberValue(row.new_values?.amount)),
        },
        related,
      }),
    );
  }

  // Legacy Gathering Remnant rows from before all-outcome semantic events.
  for (const row of base) {
    if (ledgerSourceType(row) !== "gathering_attempt") continue;

    const reason = stringValue(row.new_values?.reason);
    const locationName = reason.replace(/^Gathering reward at\s+/i, "");
    const sameTime = byTimestamp.get(row.created_at) ?? [];
    const wallets = sameTime.filter(
      (candidate) => candidate.entity_type === "character_wallets",
    );
    const related = [row, ...wallets];

    consumed.add(row.id);
    for (const wallet of wallets) consumed.add(wallet.id);

    replacements.push(
      derivedEvent(row, {
        eventType: "gathering",
        entityType: "gathering",
        entityId: ledgerSourceId(row) || row.entity_id,
        source: "gathering",
        newValues: {
          outcome_type: "remnants",
          remnants: Math.max(numberValue(row.new_values?.amount), 0),
          location_name: locationName || "a Gathering location",
        },
        related,
      }),
    );
  }

  // Shapes + Feats: turn raw UUID mutations into readable domain events.
  for (const row of base) {
    if (consumed.has(row.id)) continue;

    if (
      row.entity_type === "character_shapes" &&
      (row.operation === "insert" || row.operation === "delete")
    ) {
      const values =
        row.operation === "delete" ? row.old_values ?? {} : row.new_values ?? {};

      consumed.add(row.id);
      replacements.push(
        derivedEvent(row, {
          eventType: row.operation === "delete" ? "shape_removed" : "shape_acquired",
          entityType: "shape",
          source: "warping",
          newValues: {
            shape_name: values.shape_name ?? "Unknown Shape",
            acquisition_source: values.acquisition_source ?? null,
            level_override: values.level_override ?? null,
          },
          related: [row],
        }),
      );
      continue;
    }

    if (
      row.entity_type === "character_gifts" &&
      (row.operation === "insert" || row.operation === "delete")
    ) {
      const values =
        row.operation === "delete" ? row.old_values ?? {} : row.new_values ?? {};

      consumed.add(row.id);
      replacements.push(
        derivedEvent(row, {
          eventType: row.operation === "delete" ? "feat_removed" : "feat_acquired",
          entityType: "feat",
          source: "feats",
          newValues: {
            feat_name: values.feat_name ?? "Unknown Feat",
            acquisition_source: values.acquisition_source ?? null,
            expires_at: values.expires_at ?? null,
          },
          related: [row],
        }),
      );
    }
  }

  // Premium/feature entitlement rows become readable events.
  for (const row of base) {
    if (consumed.has(row.id)) continue;
    if (row.entity_type !== "character_feature_entitlements") continue;
    if (row.operation !== "insert" && row.operation !== "delete") continue;

    const values =
      row.operation === "delete" ? row.old_values ?? {} : row.new_values ?? {};
    const grantedByStaff = values.source === "staff";

    consumed.add(row.id);
    replacements.push(
      derivedEvent(row, {
        eventType: row.operation === "delete" ? "feature_removed" : "feature_granted",
        entityType: "feature",
        source: "features",
        newValues: {
          feature_key: values.feature_key ?? "feature",
          enabled: values.enabled ?? null,
          source: values.source ?? null,
        },
        related: [row],
        actorType:
          grantedByStaff && row.actor_type === "system" ? "staff" : row.actor_type,
        actorLabel:
          grantedByStaff && row.actor_type === "system" ? "Staff" : row.actor_label,
      }),
    );
  }

  // Direct staff HP adjustment stays meaningful; system HP churn is hidden.
  for (const row of base) {
    if (consumed.has(row.id)) continue;
    if (
      row.entity_type !== "characters" ||
      row.operation !== "update" ||
      !(row.changed_fields ?? []).includes("current_health")
    ) {
      continue;
    }

    if (row.actor_type === "staff") {
      consumed.add(row.id);
      replacements.push(
        derivedEvent(row, {
          eventType: "health_adjusted",
          entityType: "health",
          source: "character",
          newValues: {
            before_health: row.old_values?.current_health ?? null,
            after_health: row.new_values?.current_health ?? null,
          },
          related: [row],
        }),
      );
    }
  }

  // Wallet updates are technical consequences when a ledger row exists
  // at the same DB transaction timestamp.
  for (const group of byTimestamp.values()) {
    if (!group.some((row) => row.entity_type === "remnant_ledger")) continue;
    for (const row of group) {
      if (row.entity_type === "character_wallets") consumed.add(row.id);
    }
  }

  const visible = base.filter((row) => {
    if (consumed.has(row.id)) return false;

    if (
      row.entity_type === "characters" &&
      row.operation === "update" &&
      (row.changed_fields ?? []).length > 0 &&
      (row.changed_fields ?? []).every(
        (field) => field === "current_health" || field === "updated_at",
      )
    ) {
      return false;
    }

    return true;
  });

  return [...visible, ...replacements].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}
