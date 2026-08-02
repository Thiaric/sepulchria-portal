import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type {
  PublicCharacterProfile,
  PublicCharacterRoom,
  PublicCodexReference,
  PublicPresenceStatus,
} from "@/types/public-character";

const PRESENCE_ACTIVE_MINUTES = 3;

type CodexRelationRow = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

type AreaRelationRow = {
  id: string;
  name: string;
  slug: string;
};

type RoomRelationRow = {
  id: string;
  name: string;
  slug: string;
  area:
    | AreaRelationRow
    | AreaRelationRow[]
    | null;
};

type CharacterRow = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
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
  title: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected";
  current_room_id: string | null;

  race:
    | CodexRelationRow
    | CodexRelationRow[]
    | null;

  association:
    | CodexRelationRow
    | CodexRelationRow[]
    | null;

  currentRoom:
    | RoomRelationRow
    | RoomRelationRow[]
    | null;
};

type CharacterListRow = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  portrait_url: string | null;
  occupation: string | null;
  title: string | null;

  race:
    | CodexRelationRow
    | CodexRelationRow[]
    | null;

  association:
    | CodexRelationRow
    | CodexRelationRow[]
    | null;
};

type PresenceRow = {
  status: PublicPresenceStatus;
  last_seen_at: string;
};

type PresenceListRow = {
  character_id: string;
  status: PublicPresenceStatus;
  last_seen_at: string;
};

export type PublicCharacterListItem = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string;
  portrait_url: string | null;
  occupation: string | null;
  title: string | null;

  race: PublicCodexReference | null;
  association: PublicCodexReference | null;

  presence: {
    status: PublicPresenceStatus;
    last_seen_at: string;
  } | null;

  /*
   * Compatibilità temporanea con il vecchio
   * CharacterDirectory. Sarà rimossa nel
   * prossimo pacchetto.
   */
  faction: string | null;
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getDisplayName(character: {
  first_name: string;
  surname: string;
  display_name: string | null;
}) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

function normaliseCodexReference(
  value:
    | CodexRelationRow
    | CodexRelationRow[]
    | null,
): PublicCodexReference | null {
  const relation = normaliseRelation(value);

  if (!relation) {
    return null;
  }

  return {
    id: relation.id,
    name: relation.name,
    slug: relation.slug,
    icon_url: relation.icon_url,
    colour: relation.colour,
  };
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

    const {
      data: characterData,
      error: characterError,
    } = await supabase
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
        title,
        muscles,
        reflexes,
        vigor,
        brains,
        shrewd,
        presence_score,
        status,
        current_room_id,

        race:races!characters_race_id_fkey(
          id,
          name,
          slug,
          icon_url,
          colour
        ),

        association:associations!characters_association_id_fkey(
          id,
          name,
          slug,
          icon_url,
          colour
        ),

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
      display_name: getDisplayName(row),
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
      title: row.title,
      muscles: row.muscles,
      reflexes: row.reflexes,
      vigor: row.vigor,
      brains: row.brains,
      shrewd: row.shrewd,
      presence_score: row.presence_score,
      status: row.status,

      race: normaliseCodexReference(
        row.race,
      ),

      association:
        normaliseCodexReference(
          row.association,
        ),

      current_room_id: row.current_room_id,
      currentRoom,
      presence,
    };
  },
);

export const getPublicCharacters = cache(
  async (): Promise<
    PublicCharacterListItem[]
  > => {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return [];
    }

    const {
      data: characterData,
      error: characterError,
    } = await supabase
      .from("characters")
      .select(`
        id,
        public_slug,
        first_name,
        surname,
        display_name,
        portrait_url,
        occupation,
        title,

        race:races!characters_race_id_fkey(
          id,
          name,
          slug,
          icon_url,
          colour
        ),

        association:associations!characters_association_id_fkey(
          id,
          name,
          slug,
          icon_url,
          colour
        )
      `)
      .eq("status", "approved")
      .order("display_name", {
        ascending: true,
        nullsFirst: false,
      });

    if (characterError) {
      throw new Error(
        `Unable to load public characters: ${characterError.message}`,
      );
    }

    const characters =
      (characterData ??
        []) as unknown as CharacterListRow[];

    if (characters.length === 0) {
      return [];
    }

    const characterIds = characters.map(
      (character) => character.id,
    );

    const activeSince = new Date(
      Date.now() -
        PRESENCE_ACTIVE_MINUTES * 60_000,
    ).toISOString();

    const {
      data: presenceData,
      error: presenceError,
    } = await supabase
      .from("character_presence")
      .select(`
        character_id,
        status,
        last_seen_at
      `)
      .in("character_id", characterIds)
      .gte("last_seen_at", activeSince);

    if (presenceError) {
      throw new Error(
        `Unable to load character presence: ${presenceError.message}`,
      );
    }

    const presenceByCharacter = new Map<
      string,
      PresenceListRow
    >();

    for (const presence of
      (presenceData ??
        []) as PresenceListRow[]) {
      presenceByCharacter.set(
        presence.character_id,
        presence,
      );
    }

    return characters.map((character) => {
      const presence =
        presenceByCharacter.get(
          character.id,
        ) ?? null;

      const race =
        normaliseCodexReference(
          character.race,
        );

      const association =
        normaliseCodexReference(
          character.association,
        );

      return {
        id: character.id,
        public_slug:
          character.public_slug,
        first_name:
          character.first_name,
        surname: character.surname,
        display_name:
          getDisplayName(character),
        portrait_url:
          character.portrait_url,
        occupation:
          character.occupation,
        title: character.title,
        race,
        association,

        /*
         * Compatibilità temporanea.
         * Il prossimo CharacterDirectory
         * userà association direttamente.
         */
        faction:
          association?.name ?? null,

        presence: presence
          ? {
              status: presence.status,
              last_seen_at:
                presence.last_seen_at,
            }
          : null,
      };
    });
  },
);