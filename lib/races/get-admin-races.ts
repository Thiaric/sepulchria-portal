import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export const ADMIN_RACES_CACHE_TAG = "admin-races-catalogue";

type RaceQueryRow = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  image_url: string | null;
  banner_url: string | null;
  icon_url: string | null;
  colour: string | null;
  is_active: boolean;
  is_selectable: boolean;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  characters: { count: number }[] | null;
};

function getCount(value: { count: number }[] | null) {
  return Array.isArray(value) ? value[0]?.count ?? 0 : 0;
}

const getCachedAdminRaces = unstable_cache(
  async (accessToken: string) => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );

    const { data, error } = await supabase
      .from("races")
      .select(`
        id,
        name,
        slug,
        summary,
        description,
        image_url,
        banner_url,
        icon_url,
        colour,
        is_active,
        is_selectable,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        shrewd_modifier,
        brains_modifier,
        presence_modifier,
        sort_order,
        created_at,
        updated_at,
        characters(count)
      `)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Unable to load ancestries: ${error.message}`);
    }

    return ((data ?? []) as unknown as RaceQueryRow[]).map((race) => ({
      id: race.id,
      name: race.name,
      slug: race.slug,
      summary: race.summary ?? "",
      description: race.description ?? "",
      image_url: race.image_url,
      banner_url: race.banner_url,
      icon_url: race.icon_url,
      colour: race.colour,
      is_active: race.is_active,
      is_selectable: race.is_selectable,
      muscles_modifier: race.muscles_modifier ?? 0,
      reflexes_modifier: race.reflexes_modifier ?? 0,
      vigour_modifier: race.vigour_modifier ?? 0,
      shrewd_modifier: race.shrewd_modifier ?? 0,
      brains_modifier: race.brains_modifier ?? 0,
      presence_modifier: race.presence_modifier ?? 0,
      sort_order: race.sort_order,
      created_at: race.created_at,
      updated_at: race.updated_at,
      character_count: getCount(race.characters),
    }));
  },
  ["admin-races-catalogue-v1"],
  {
    revalidate: 300,
    tags: [ADMIN_RACES_CACHE_TAG],
  },
);

export async function getAdminRaces() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Unable to establish the staff session for the ancestry catalogue.");
  }

  return getCachedAdminRaces(session.access_token);
}
