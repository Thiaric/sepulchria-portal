import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  getStaffSession,
} from "@/lib/auth/require-staff";

type PrivateLocationMetadata = {
  ownerCharacterId: string;
  backgroundColour: string;
  speechColour: string;
  actionColour: string;
  systemColour: string;
  whisperBackgroundColour: string;
  whisperTextColour: string;
  offgameBackgroundColour: string;
  offgameTextColour: string;
};

export type PrivateLocationAccess = {
  isPrivate: boolean;
  allowed: boolean;
  metadata:
    | PrivateLocationMetadata
    | null;
};

function createPrivilegedClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function getPrivateLocationAccess(
  roomId: string,
  characterId: string,
): Promise<PrivateLocationAccess> {
  const admin =
    createPrivilegedClient();

  const {
    data: privateRoom,
    error: privateRoomError,
  } = await admin
    .from(
      "private_location_rooms",
    )
    .select(
      "owner_character_id, background_colour, speech_colour, action_colour, system_colour, whisper_background_colour, whisper_text_colour, offgame_background_colour, offgame_text_colour",
    )
    .eq(
      "room_id",
      roomId,
    )
    .maybeSingle();

  if (privateRoomError) {
    throw new Error(
      `Unable to inspect Private Location: ${privateRoomError.message}`,
    );
  }

  if (!privateRoom) {
    const {
      getOrderHeadquartersAccess,
    } = await import(
      "@/lib/order-headquarters/access"
    );

    const headquartersAccess =
      await getOrderHeadquartersAccess(
        roomId,
        characterId,
      );

    if (headquartersAccess.isHeadquarters) {
      const theme = headquartersAccess.theme;

      return {
        isPrivate: true,
        allowed: headquartersAccess.allowed,
        metadata: theme
          ? {
              ownerCharacterId: "",
              backgroundColour: theme.backgroundColour,
              speechColour: theme.speechColour,
              actionColour: theme.actionColour,
              systemColour: theme.systemColour,
              whisperBackgroundColour: theme.whisperBackgroundColour,
              whisperTextColour: theme.whisperTextColour,
              offgameBackgroundColour: theme.offgameBackgroundColour,
              offgameTextColour: theme.offgameTextColour,
            }
          : null,
      };
    }

    return {
      isPrivate: false,
      allowed: true,
      metadata: null,
    };
  }

  const metadata:
    PrivateLocationMetadata = {
      ownerCharacterId:
        privateRoom.owner_character_id,
      backgroundColour:
        privateRoom.background_colour,
      speechColour:
        privateRoom.speech_colour,
      actionColour:
        privateRoom.action_colour,
      systemColour:
        privateRoom.system_colour,
      whisperBackgroundColour:
        privateRoom.whisper_background_colour,
      whisperTextColour:
        privateRoom.whisper_text_colour,
      offgameBackgroundColour:
        privateRoom.offgame_background_colour,
      offgameTextColour:
        privateRoom.offgame_text_colour,
    };

  const staff =
    await getStaffSession();

  if (staff) {
    return {
      isPrivate: true,
      allowed: true,
      metadata,
    };
  }

  const {
    data: entitlement,
    error: entitlementError,
  } = await admin
    .from(
      "character_feature_entitlements",
    )
    .select("enabled")
    .eq(
      "character_id",
      privateRoom.owner_character_id,
    )
    .eq(
      "feature_key",
      "private_chat",
    )
    .maybeSingle();

  if (entitlementError) {
    throw new Error(
      `Unable to verify Private Location entitlement: ${entitlementError.message}`,
    );
  }

  if (
    entitlement?.enabled !== true
  ) {
    return {
      isPrivate: true,
      allowed: false,
      metadata,
    };
  }

  if (
    privateRoom.owner_character_id ===
    characterId
  ) {
    return {
      isPrivate: true,
      allowed: true,
      metadata,
    };
  }

  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from(
      "private_location_members",
    )
    .select("status")
    .eq(
      "room_id",
      roomId,
    )
    .eq(
      "character_id",
      characterId,
    )
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Unable to verify Private Location membership: ${membershipError.message}`,
    );
  }

  return {
    isPrivate: true,
    allowed:
      membership?.status ===
      "active",
    metadata,
  };
}


export type VisiblePrivateLocation = {
  roomId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string;
  role: "owner" | "member" | "staff";
};

export async function getVisiblePrivateLocations(
  characterId: string,
): Promise<VisiblePrivateLocation[]> {
  const admin =
    createPrivilegedClient();

  const staff =
    await getStaffSession();

  const {
    data: privateRows,
    error: privateRowsError,
  } = await admin
    .from("private_location_rooms")
    .select(
      "room_id, owner_character_id",
    );

  if (privateRowsError) {
    throw new Error(
      `Unable to load Private Locations: ${privateRowsError.message}`,
    );
  }

  if (
    !privateRows ||
    privateRows.length === 0
  ) {
    return [];
  }

  const ownerIds = [
    ...new Set(
      privateRows.map(
        (row) =>
          row.owner_character_id,
      ),
    ),
  ];

  const {
    data: ownerCharacters,
    error: ownerCharactersError,
  } = await admin
    .from("characters")
    .select(
      "id, display_name, first_name, surname",
    )
    .in("id", ownerIds);

  if (ownerCharactersError) {
    throw new Error(
      `Unable to load Private Location owners: ${ownerCharactersError.message}`,
    );
  }

  const ownerNameById = new Map(
    (ownerCharacters ?? []).map(
      (owner) => [
        owner.id,
        owner.display_name?.trim() ||
          `${owner.first_name ?? ""} ${owner.surname ?? ""}`.trim() ||
          "Unknown owner",
      ],
    ),
  );

  const {
    data: entitlements,
    error: entitlementError,
  } = await admin
    .from(
      "character_feature_entitlements",
    )
    .select("character_id, enabled")
    .eq(
      "feature_key",
      "private_chat",
    )
    .in(
      "character_id",
      ownerIds,
    );

  if (entitlementError) {
    throw new Error(
      `Unable to load Private Location entitlements: ${entitlementError.message}`,
    );
  }

  const enabledOwners =
    new Set(
      (entitlements ?? [])
        .filter(
          (entry) =>
            entry.enabled === true,
        )
        .map(
          (entry) =>
            entry.character_id,
        ),
    );

  const enabledPrivateRows =
    privateRows.filter(
      (row) =>
        enabledOwners.has(
          row.owner_character_id,
        ),
    );

  if (
    enabledPrivateRows.length === 0
  ) {
    return [];
  }

  const roomIds =
    enabledPrivateRows.map(
      (row) => row.room_id,
    );

  const {
    data: rooms,
    error: roomsError,
  } = await admin
    .from("rooms")
    .select(
      "id, name, description, image_url",
    )
    .in("id", roomIds)
    .eq("is_active", true);

  if (roomsError) {
    throw new Error(
      `Unable to load Private Location rooms: ${roomsError.message}`,
    );
  }

  const roomById =
    new Map(
      (rooms ?? []).map(
        (room) => [
          room.id,
          room,
        ],
      ),
    );

  let activeMemberRoomIds =
    new Set<string>();

  if (!staff) {
    const {
      data: memberships,
      error: membershipError,
    } = await admin
      .from(
        "private_location_members",
      )
      .select("room_id")
      .eq(
        "character_id",
        characterId,
      )
      .eq("status", "active")
      .eq("role", "member");

    if (membershipError) {
      throw new Error(
        `Unable to load Private Location memberships: ${membershipError.message}`,
      );
    }

    activeMemberRoomIds =
      new Set(
        (memberships ?? []).map(
          (membership) =>
            membership.room_id,
        ),
      );
  }

  return enabledPrivateRows
    .map((row) => {
      const room =
        roomById.get(
          row.room_id,
        );

      if (!room) {
        return null;
      }

      if (staff) {
        return {
          roomId: room.id,
          name: room.name,
          description:
            room.description,
          imageUrl:
            room.image_url,
          ownerName:
            ownerNameById.get(
              row.owner_character_id,
            ) ?? "Unknown owner",
          role:
            "staff" as const,
        };
      }

      if (
        row.owner_character_id ===
        characterId
      ) {
        return {
          roomId: room.id,
          name: room.name,
          description:
            room.description,
          imageUrl:
            room.image_url,
          ownerName:
            ownerNameById.get(
              row.owner_character_id,
            ) ?? "Unknown owner",
          role:
            "owner" as const,
        };
      }

      if (
        activeMemberRoomIds.has(
          room.id,
        )
      ) {
        return {
          roomId: room.id,
          name: room.name,
          description:
            room.description,
          imageUrl:
            room.image_url,
          ownerName:
            ownerNameById.get(
              row.owner_character_id,
            ) ?? "Unknown owner",
          role:
            "member" as const,
        };
      }

      return null;
    })
    .filter(
      (
        entry,
      ): entry is VisiblePrivateLocation =>
        entry !== null,
    )
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "en",
        {
          sensitivity: "base",
        },
      ),
    );
}
