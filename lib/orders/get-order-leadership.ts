import "server-only";

import { createClient } from "@/lib/supabase/server";

type LevelRelation =
  | {
      level: number;
    }
  | {
      level: number;
    }[]
  | null;

export async function characterLeadsAnyOrder(
  characterId: string | null | undefined,
): Promise<boolean> {
  if (!characterId) {
    return false;
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("order_memberships")
    .select(`
      id,
      level:order_levels!order_memberships_order_level_id_fkey(
        level
      )
    `)
    .eq(
      "character_id",
      characterId,
    );

  if (error) {
    console.error(
      "Unable to check Order leadership:",
      error,
    );

    return false;
  }

  return (data ?? []).some(
    (membership) => {
      const relation =
        membership.level as LevelRelation;

      const level =
        Array.isArray(relation)
          ? relation[0]?.level
          : relation?.level;

      return level === 5;
    },
  );
}
