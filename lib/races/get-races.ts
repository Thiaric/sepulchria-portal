import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type {
  Race,
  RaceOption,
} from "@/types/codex";

type RaceRow = {
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
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const RACE_SELECT = `
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
  sort_order,
  created_at,
  updated_at
`;

function normaliseRace(
  row: RaceRow,
): Race {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary ?? "",
    description: row.description ?? "",
    image_url: row.image_url,
    banner_url: row.banner_url,
    icon_url: row.icon_url,
    colour: row.colour,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const getRaces = cache(
  async (): Promise<Race[]> => {
    const supabase = await createClient();

    const {
      data,
      error,
    } = await supabase
      .from("races")
      .select(RACE_SELECT)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw new Error(
        `Unable to load ancestries: ${error.message}`,
      );
    }

    return (
      (data ?? []) as RaceRow[]
    ).map(normaliseRace);
  },
);

export const getRaceBySlug = cache(
  async (
    slug: string,
  ): Promise<Race | null> => {
    const normalisedSlug =
      slug.trim().toLowerCase();

    if (!normalisedSlug) {
      return null;
    }

    const supabase = await createClient();

    const {
      data,
      error,
    } = await supabase
      .from("races")
      .select(RACE_SELECT)
      .eq("slug", normalisedSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Unable to load race "${normalisedSlug}": ${error.message}`,
      );
    }

    if (!data) {
      return null;
    }

    return normaliseRace(
      data as RaceRow,
    );
  },
);

export const getRaceOptions = cache(
  async (): Promise<RaceOption[]> => {
    const races = await getRaces();

    return races.map((race) => ({
      id: race.id,
      name: race.name,
      slug: race.slug,
      summary: race.summary,
      icon_url: race.icon_url,
      colour: race.colour,
    }));
  },
);