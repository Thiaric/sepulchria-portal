import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AuditRowLike = {
  id: string;
  entity_type: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
};

function textId(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function enrichCharacterAuditDomainNames<T extends AuditRowLike>(
  rows: T[],
): Promise<T[]> {
  const shapeIds = new Set<string>();
  const featIds = new Set<string>();

  for (const row of rows) {
    if (row.entity_type === "character_shapes") {
      const id = textId(row.new_values?.shape_id) ?? textId(row.old_values?.shape_id);
      if (id) shapeIds.add(id);
    }

    if (row.entity_type === "character_gifts") {
      const id = textId(row.new_values?.gift_id) ?? textId(row.old_values?.gift_id);
      if (id) featIds.add(id);
    }
  }

  const admin = createAdminClient();

  const [shapesResult, featsResult] = await Promise.all([
    shapeIds.size
      ? admin.from("shapes").select("id, name").in("id", Array.from(shapeIds))
      : Promise.resolve({ data: [], error: null }),
    featIds.size
      ? admin.from("gifts").select("id, name").in("id", Array.from(featIds))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (shapesResult.error) {
    throw new Error(`Unable to resolve Character Log Shape names: ${shapesResult.error.message}`);
  }

  if (featsResult.error) {
    throw new Error(`Unable to resolve Character Log Feat names: ${featsResult.error.message}`);
  }

  const shapeNameById = new Map<string, string>(
    (shapesResult.data ?? []).map((row) => [String(row.id), String(row.name)]),
  );
  const featNameById = new Map<string, string>(
    (featsResult.data ?? []).map((row) => [String(row.id), String(row.name)]),
  );

  return rows.map((row) => {
    if (row.entity_type === "character_shapes") {
      const shapeId = textId(row.new_values?.shape_id) ?? textId(row.old_values?.shape_id);
      const shapeName = shapeId ? shapeNameById.get(shapeId) ?? null : null;
      if (!shapeName) return row;

      return {
        ...row,
        old_values: row.old_values ? { ...row.old_values, shape_name: shapeName } : row.old_values,
        new_values: row.new_values ? { ...row.new_values, shape_name: shapeName } : row.new_values,
      };
    }

    if (row.entity_type === "character_gifts") {
      const featId = textId(row.new_values?.gift_id) ?? textId(row.old_values?.gift_id);
      const featName = featId ? featNameById.get(featId) ?? null : null;
      if (!featName) return row;

      return {
        ...row,
        old_values: row.old_values ? { ...row.old_values, feat_name: featName } : row.old_values,
        new_values: row.new_values ? { ...row.new_values, feat_name: featName } : row.new_values,
      };
    }

    return row;
  });
}
