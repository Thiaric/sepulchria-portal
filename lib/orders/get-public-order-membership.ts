import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PublicOrderMembership } from "@/types/public-character";

type Relation<T> = T | T[] | null;

const one = <T,>(
  value: Relation<T>,
): T | null =>
  Array.isArray(value)
    ? value[0] ?? null
    : value;

export async function getPublicOrderMembership(
  characterId: string,
): Promise<PublicOrderMembership | null> {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("order_memberships")
      .select(`
        order:orders!order_memberships_order_id_fkey(
          id,
          name,
          slug,
          colour,
          association:associations(
            id,
            name,
            slug,
            icon_url,
            colour
          )
        ),
        level:order_levels!order_memberships_order_level_id_fkey(
          id,
          level
        ),
        job:order_jobs!order_memberships_order_job_id_fkey(
          id,
          name
        )
      `)
      .eq(
        "character_id",
        characterId,
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load public Order membership: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const order = one(
    data.order as Relation<{
      id: string;
      name: string;
      slug: string;
      colour: string | null;
      association: Relation<{
        id: string;
        name: string;
        slug: string;
        icon_url: string | null;
        colour: string | null;
      }>;
    }>,
  );

  if (!order) {
    return null;
  }

  return {
    order: {
      id: order.id,
      name: order.name,
      slug: order.slug,
      colour: order.colour,
    },

    association:
      one(order.association),

    level: one(
      data.level as Relation<{
        id: string;
        level: number;
      }>,
    ),

    job: one(
      data.job as Relation<{
        id: string;
        name: string;
      }>,
    ),
  };
}
