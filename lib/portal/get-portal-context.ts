import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import {
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/server";
import {
  getPrivateLocationAccess,
  getVisiblePrivateLocations,
} from "@/lib/private-locations/access";
import {
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  getOrderHeadquartersVisibility,
} from "@/lib/order-headquarters/access";
import type {
  PortalCharacter,
  PortalCodexReference,
  PortalContext,
  PortalPresence,
} from "@/types/portal";

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
  image_url: string | null;
  is_outdoors: boolean;
  area:
    | AreaRelationRow
    | AreaRelationRow[]
    | null;
};

type CharacterRow = {
  id: string;
  first_name: string;
  surname: string;
  display_name: string;
  portrait_url: string | null;
  occupation: string | null;
  title: string | null;
  biography: string | null;
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
  room:
    | RoomRelationRow
    | RoomRelationRow[]
    | null;
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function normaliseCodexReference(
  value:
    | CodexRelationRow
    | CodexRelationRow[]
    | null,
): PortalCodexReference | null {
  const relation =
    normaliseRelation(value);

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

function parseCount(
  value: unknown,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed =
      Number.parseInt(value, 10);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

export const getPortalContext = cache(
  async (): Promise<PortalContext> => {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/homepage");
    }

    const [
      {
        data: characterData,
        error: characterError,
      },
      staffSession,
    ] = await Promise.all([
      supabase
        .from("characters")
        .select(`
          id,
          first_name,
          surname,
          display_name,
          portrait_url,
          occupation,
          title,
          biography,
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
          room:rooms!characters_current_room_id_fkey(
            id,
            name,
            slug,
            image_url,
            is_outdoors,
            area:areas!rooms_area_id_fkey(
              id,
              name,
              slug
            )
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle(),
      getStaffSession(),
    ]);

    if (characterError) {
      throw new Error(
        `Unable to load portal character: ${characterError.message}`,
      );
    }

    let character:
      PortalCharacter | null = null;

    let presence:
      PortalPresence | null = null;

    let unreadMessageCount = 0;
    let currentRoomAccessAllowed =
      true;

    let privateLocations:
      Awaited<
        ReturnType<
          typeof getVisiblePrivateLocations
        >
      > = [];

    let allOrderHeadquartersRoomIds:
      string[] = [];

    let visibleOrderHeadquartersRoomIds:
      string[] = [];

    const activeSince =
      new Date(
        Date.now() -
          PRESENCE_ACTIVE_MINUTES *
            60_000,
      ).toISOString();

    let onlineCountQuery =
      supabase
        .from("character_presence")
        .select("character_id", {
          count: "exact",
          head: true,
        })
        .gte(
          "last_seen_at",
          activeSince,
        );

    if (!staffSession) {
      onlineCountQuery =
        onlineCountQuery.eq(
          "appear_offline",
          false,
        );
    }

    if (characterData) {
      const row =
        characterData as unknown as CharacterRow;

      const room =
        normaliseRelation(
          row.room,
        );

      const area = room
        ? normaliseRelation(
            room.area,
          )
        : null;

      character = {
        id: row.id,
        first_name:
          row.first_name,
        surname:
          row.surname,
        display_name:
          row.display_name,
        portrait_url:
          row.portrait_url,
        occupation:
          row.occupation,
        title:
          row.title,
        biography:
          row.biography,
        status:
          row.status,
        race:
          normaliseCodexReference(
            row.race,
          ),
        association:
          normaliseCodexReference(
            row.association,
          ),
        current_room_id:
          row.current_room_id,
        currentRoom: room
          ? {
              id: room.id,
              name: room.name,
              slug: room.slug,
              image_url:
                room.image_url,
              is_outdoors:
                room.is_outdoors,
              area,
            }
          : null,
      };

      const characterId =
        character.id;

      const roomAccessPromise =
        character.current_room_id
          ? getPrivateLocationAccess(
              character.current_room_id,
              characterId,
            )
          : Promise.resolve(null);

      const [
        visiblePrivateResult,
        headquartersVisibility,
        roomAccess,
        {
          data: presenceData,
          error: presenceError,
        },
        {
          data: unreadResult,
          error: unreadError,
        },
        {
          count:
            onlineCharacterCount,
          error: onlineError,
        },
      ] = await Promise.all([
        getVisiblePrivateLocations(
          characterId,
        ),
        getOrderHeadquartersVisibility(
          characterId,
        ),
        roomAccessPromise,
        supabase
          .from(
            "character_presence",
          )
          .select(
            "status, last_seen_at, room_id, appear_offline, appeared_offline_at",
          )
          .eq(
            "character_id",
            characterId,
          )
          .maybeSingle(),
        supabase.rpc(
          "get_unread_direct_message_count",
        ),
        onlineCountQuery,
      ]);

      if (presenceError) {
        throw new Error(
          `Unable to load presence: ${presenceError.message}`,
        );
      }

      if (unreadError) {
        throw new Error(
          `Unable to count unread messages: ${unreadError.message}`,
        );
      }

      if (onlineError) {
        throw new Error(
          `Unable to count online characters: ${onlineError.message}`,
        );
      }

      privateLocations =
        visiblePrivateResult;

      allOrderHeadquartersRoomIds =
        headquartersVisibility.allRoomIds;

      visibleOrderHeadquartersRoomIds =
        headquartersVisibility.visibleRoomIds;

      if (roomAccess) {
        currentRoomAccessAllowed =
          !roomAccess.isPrivate ||
          roomAccess.allowed;
      }

      presence =
        presenceData as PortalPresence | null;

      unreadMessageCount =
        parseCount(unreadResult);

      return {
        user: {
          id: user.id,
          email:
            user.email ?? null,
        },
        character,
        presence,
        unreadMessageCount,
        onlineCharacterCount:
          onlineCharacterCount ?? 0,
        currentRoomAccessAllowed,
        isStaff:
          staffSession !== null,
        privateLocations,
        allOrderHeadquartersRoomIds,
        visibleOrderHeadquartersRoomIds,
      };
    }

    const {
      count: onlineCharacterCount,
      error: onlineError,
    } = await onlineCountQuery;

    if (onlineError) {
      throw new Error(
        `Unable to count online characters: ${onlineError.message}`,
      );
    }

    return {
      user: {
        id: user.id,
        email:
          user.email ?? null,
      },
      character,
      presence,
      unreadMessageCount,
      onlineCharacterCount:
        onlineCharacterCount ?? 0,
      currentRoomAccessAllowed,
      isStaff:
        staffSession !== null,
      privateLocations,
      allOrderHeadquartersRoomIds,
      visibleOrderHeadquartersRoomIds,
    };
  },
);
