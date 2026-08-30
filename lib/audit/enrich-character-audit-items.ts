import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AuditRowLike = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
};

function uuidLike(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function directItemId(row: AuditRowLike) {
  return uuidLike(row.new_values?.item_id) ?? uuidLike(row.old_values?.item_id);
}

export async function enrichCharacterAuditItemNames<T extends AuditRowLike>(
  rows: T[],
): Promise<Array<T & { item_name: string | null }>> {
  const admin = createAdminClient();
  const itemIdByAuditId = new Map<string, string>();
  const characterItemEntityIds: string[] = [];
  const instanceEntityIds: string[] = [];

  for (const row of rows) {
    const direct = directItemId(row);
    if (direct) {
      itemIdByAuditId.set(row.id, direct);
      continue;
    }

    if (!row.entity_id) continue;
    if (row.entity_type === "character_items") characterItemEntityIds.push(row.entity_id);
    if (row.entity_type === "character_item_instances") instanceEntityIds.push(row.entity_id);
  }

  const [characterItemsResult, instancesResult] = await Promise.all([
    characterItemEntityIds.length
      ? admin
          .from("character_items")
          .select("id, item_id")
          .in("id", Array.from(new Set(characterItemEntityIds)))
      : Promise.resolve({ data: [], error: null }),
    instanceEntityIds.length
      ? admin
          .from("character_item_instances")
          .select("id, item_id")
          .in("id", Array.from(new Set(instanceEntityIds)))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (characterItemsResult.error) {
    throw new Error(`Unable to resolve Character Log inventory Items: ${characterItemsResult.error.message}`);
  }
  if (instancesResult.error) {
    throw new Error(`Unable to resolve Character Log Item instances: ${instancesResult.error.message}`);
  }

  const itemIdByEntityId = new Map<string, string>();
  for (const record of [
    ...(characterItemsResult.data ?? []),
    ...(instancesResult.data ?? []),
  ]) {
    if (record.id && record.item_id) {
      itemIdByEntityId.set(String(record.id), String(record.item_id));
    }
  }

  for (const row of rows) {
    if (!itemIdByAuditId.has(row.id) && row.entity_id) {
      const resolved = itemIdByEntityId.get(row.entity_id);
      if (resolved) itemIdByAuditId.set(row.id, resolved);
    }
  }

  const itemIds = Array.from(new Set(itemIdByAuditId.values()));
  const itemNameById = new Map<string, string>();

  if (itemIds.length) {
    const { data, error } = await admin
      .from("items")
      .select("id, name")
      .in("id", itemIds);

    if (error) {
      throw new Error(`Unable to resolve Character Log Item names: ${error.message}`);
    }

    for (const item of data ?? []) {
      itemNameById.set(String(item.id), String(item.name));
    }
  }

  return rows.map((row) => {
    const itemId = itemIdByAuditId.get(row.id) ?? null;
    return {
      ...row,
      item_name: itemId ? itemNameById.get(itemId) ?? null : null,
    };
  });
}
