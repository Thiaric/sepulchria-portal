import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type {
  Association,
  AssociationOption,
} from "@/types/codex";

type AssociationRow = {
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

const ASSOCIATION_SELECT = `
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

function normaliseAssociation(
  row: AssociationRow,
): Association {
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

export const getAssociations = cache(
  async (): Promise<Association[]> => {
    const supabase = await createClient();

    const {
      data,
      error,
    } = await supabase
      .from("associations")
      .select(ASSOCIATION_SELECT)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw new Error(
        `Unable to load associations: ${error.message}`,
      );
    }

    return (
      (data ?? []) as AssociationRow[]
    ).map(normaliseAssociation);
  },
);

export const getAssociationBySlug =
  cache(
    async (
      slug: string,
    ): Promise<Association | null> => {
      const normalisedSlug =
        slug.trim().toLowerCase();

      if (!normalisedSlug) {
        return null;
      }

      const supabase =
        await createClient();

      const {
        data,
        error,
      } = await supabase
        .from("associations")
        .select(ASSOCIATION_SELECT)
        .eq("slug", normalisedSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Unable to load association "${normalisedSlug}": ${error.message}`,
        );
      }

      if (!data) {
        return null;
      }

      return normaliseAssociation(
        data as AssociationRow,
      );
    },
  );

export const getAssociationOptions =
  cache(
    async (): Promise<
      AssociationOption[]
    > => {
      const associations =
        await getAssociations();

      return associations.map(
        (association) => ({
          id: association.id,
          name: association.name,
          slug: association.slug,
          summary:
            association.summary,
          icon_url:
            association.icon_url,
          colour:
            association.colour,
        }),
      );
    },
  );