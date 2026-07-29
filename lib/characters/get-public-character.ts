import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type {
  PublicCharacterProfile,
  PublicCharacterRoom,
  PublicPresenceStatus,
} from "@/types/public-character";

type CharacterRow = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string;
  pronouns: string | null;
  date_of_birth: string | null;
  birthplace: string | null;
  origin: string | null;
  occupation: string | null;
  biography: string | null;
  portrait_url: string | null;
  physical_description: string | null;
  personality: string | null;
  public_notes: string | null;
  faction: string | null;
  title: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  current_room_id: string | null;
  currentRoom:
    | {
        id: string;
        name: string;
        slug: string;
        area:
          | {
              id: string;
              name: string;
              slug: string;
            }
          | {
              id: string;
              name: string;
              slug: string;
            }[]
          | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        area:
          | {
              id: string;
              name: string;
              slug: string;
            }
          | {
              id: string;
              name: string;
              slug: string;
            }[]
          | null;
      }[]
    | null;
};

type PresenceRow = {
  status: PublicPresenceStatus;
  last_seen_at: string;
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export const getPublicCharacter = cache(
  async (
    publicSlug: string,
  ): Promise<PublicCharacterProfile | null> => {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: characterData, error: characterError } =
      await supabase
        .from("characters")
        .select(`
          id,
          public_slug,
          first_name,
          surname,
          display_name,
          pronouns,
          date_of_birth,
          birthplace,
          origin,
          occupation,
          biography,
          portrait_url,
          physical_description,
          personality,
          public_notes,
          faction,
          title,
          status,
          current_room_id,
          currentRoom:rooms!characters_current_room_id_fkey(
            id,
            name,
            slug,
            area:areas!rooms_area_id_fkey(
              id,
              name,
              slug
            )
          )
        `)
        .eq("public_slug", publicSlug)
        .maybeSingle();

    if (characterError) {
      throw new Error(
        `Unable to load public character: ${characterError.message}`,
      );
    }

    if (!characterData) {
      return null;
    }

    const row =
      characterData as unknown as CharacterRow;

    if (row.status !== "approved") {
  return null;
}

    const rawRoom = normaliseRelation(
      row.currentRoom,
    );

    const rawArea = rawRoom
      ? normaliseRelation(rawRoom.area)
      : null;

    const currentRoom: PublicCharacterRoom | null =
      rawRoom
        ? {
            id: rawRoom.id,
            name: rawRoom.name,
            slug: rawRoom.slug,
            area: rawArea,
          }
        : null;

    const {
      data: presenceData,
      error: presenceError,
    } = await supabase
      .from("character_presence")
      .select("status, last_seen_at")
      .eq("character_id", row.id)
      .maybeSingle();

    if (presenceError) {
      throw new Error(
        `Unable to load character presence: ${presenceError.message}`,
      );
    }

    const presence =
      presenceData as PresenceRow | null;

    return {
      id: row.id,
      public_slug: row.public_slug,
      first_name: row.first_name,
      surname: row.surname,
      display_name: row.display_name,
      pronouns: row.pronouns,
      date_of_birth: row.date_of_birth,
      birthplace: row.birthplace,
      origin: row.origin,
      occupation: row.occupation,
      biography: row.biography,
      portrait_url: row.portrait_url,
      physical_description:
        row.physical_description,
      personality: row.personality,
      public_notes: row.public_notes,
      faction: row.faction,
      title: row.title,
      status: row.status,
      current_room_id: row.current_room_id,
      currentRoom,
      presence,
    };
  },
);