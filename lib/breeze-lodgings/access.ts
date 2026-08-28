import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  getStaffSession,
} from "@/lib/auth/require-staff";

export type BreezeLodgingAccess = {
  isBreezeLodging: boolean;
  allowed: boolean;
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

export async function getBreezeLodgingAccess(
  roomId: string,
  characterId: string,
): Promise<BreezeLodgingAccess> {
  const admin =
    createPrivilegedClient();

  await admin.rpc(
    "expire_breeze_lodging_rentals",
  );

  const {
    data: lodgingRoom,
    error: lodgingRoomError,
  } = await admin
    .from("breeze_lodging_rooms")
    .select("room_id")
    .eq("room_id", roomId)
    .maybeSingle();

  if (lodgingRoomError) {
    throw new Error(
      `Unable to inspect Breeze Lodgings room: ${lodgingRoomError.message}`,
    );
  }

  if (!lodgingRoom) {
    return {
      isBreezeLodging: false,
      allowed: true,
    };
  }

  const {
    data: rental,
    error: rentalError,
  } = await admin
    .from("breeze_lodging_rentals")
    .select(
      "id, owner_character_id, ends_at",
    )
    .eq("room_id", roomId)
    .eq("status", "active")
    .gt(
      "ends_at",
      new Date().toISOString(),
    )
    .maybeSingle();

  if (rentalError) {
    throw new Error(
      `Unable to inspect Breeze Lodgings rental: ${rentalError.message}`,
    );
  }

  if (!rental) {
    return {
      isBreezeLodging: true,
      allowed: false,
    };
  }

  const staff =
    await getStaffSession();

  if (staff) {
    return {
      isBreezeLodging: true,
      allowed: true,
    };
  }

  if (
    rental.owner_character_id ===
    characterId
  ) {
    return {
      isBreezeLodging: true,
      allowed: true,
    };
  }

  const {
    data: guest,
    error: guestError,
  } = await admin
    .from("breeze_lodging_guests")
    .select("status")
    .eq("rental_id", rental.id)
    .eq(
      "character_id",
      characterId,
    )
    .eq("status", "active")
    .maybeSingle();

  if (guestError) {
    throw new Error(
      `Unable to inspect Breeze Lodgings guest access: ${guestError.message}`,
    );
  }

  return {
    isBreezeLodging: true,
    allowed:
      guest?.status === "active",
  };
}

export type BreezeLodgingGuestCharacter = {
  id: string;
  display_name: string;
};

export type BreezeLodgingPendingInvitation = {
  invitation_id: string;
  character_id: string;
  display_name: string;
};

export type BreezeLodgingManageData = {
  roomId: string;
  roomName: string;
  rentalId: string;
  tier: "hearth" | "wayfarer" | "gilded";
  guestLimit: number;
  guests: BreezeLodgingGuestCharacter[];
  pendingInvitations: BreezeLodgingPendingInvitation[];
  candidates: BreezeLodgingGuestCharacter[];
};

export async function getBreezeLodgingManageData(
  roomId: string,
  characterId: string,
): Promise<BreezeLodgingManageData | null> {
  const admin =
    createPrivilegedClient();

  await admin.rpc(
    "expire_breeze_lodging_rentals",
  );

  const {
    data: rental,
    error: rentalError,
  } = await admin
    .from("breeze_lodging_rentals")
    .select("id, owner_character_id")
    .eq("room_id", roomId)
    .eq("owner_character_id", characterId)
    .eq("status", "active")
    .gt(
      "ends_at",
      new Date().toISOString(),
    )
    .maybeSingle();

  if (rentalError) {
    throw new Error(
      `Unable to load Breeze Lodgings guest management: ${rentalError.message}`,
    );
  }

  if (!rental) {
    return null;
  }

  const [
    roomResult,
    lodgingRoomResult,
    guestRowsResult,
    pendingRowsResult,
    approvedCharactersResult,
  ] = await Promise.all([
    admin
      .from("rooms")
      .select("name")
      .eq("id", roomId)
      .single(),

    admin
      .from("breeze_lodging_rooms")
      .select("tier")
      .eq("room_id", roomId)
      .single(),

    admin
      .from("breeze_lodging_guests")
      .select("character_id")
      .eq("rental_id", rental.id)
      .eq("status", "active"),

    admin
      .from("breeze_lodging_invitations")
      .select(
        "id, recipient_character_id",
      )
      .eq("rental_id", rental.id)
      .eq("room_id", roomId)
      .eq(
        "inviter_character_id",
        characterId,
      )
      .eq("status", "pending"),

    admin
      .from("characters")
      .select("id, display_name")
      .eq("status", "approved")
      .neq("id", characterId)
      .order("display_name", {
        ascending: true,
      }),
  ]);

  const combinedError =
    roomResult.error ??
    lodgingRoomResult.error ??
    guestRowsResult.error ??
    pendingRowsResult.error ??
    approvedCharactersResult.error;

  if (combinedError) {
    throw new Error(
      `Unable to load Breeze Lodgings invitations: ${combinedError.message}`,
    );
  }

  if (!lodgingRoomResult.data) {
    throw new Error(
      "Unable to load Breeze Lodgings room tier.",
    );
  }

  const allCharacters =
    (approvedCharactersResult.data ?? [])
      .map((character) => ({
        id: character.id,
        display_name:
          character.display_name,
      }));

  const byId = new Map(
    allCharacters.map(
      (character) => [
        character.id,
        character,
      ],
    ),
  );

  const guestIds = new Set(
    (guestRowsResult.data ?? []).map(
      (row) => row.character_id,
    ),
  );

  const pendingRows =
    (pendingRowsResult.data ?? []);

  const pendingIds = new Set(
    pendingRows.map(
      (row) =>
        row.recipient_character_id,
    ),
  );

  const pendingInvitations =
    pendingRows
      .map((row) => {
        const character =
          byId.get(
            row.recipient_character_id,
          );

        if (!character) {
          return null;
        }

        return {
          invitation_id: row.id,
          character_id: character.id,
          display_name:
            character.display_name,
        };
      })
      .filter(
        (
          invitation,
        ): invitation is BreezeLodgingPendingInvitation =>
          invitation !== null,
      );

  const tier =
    lodgingRoomResult.data.tier as
      | "hearth"
      | "wayfarer"
      | "gilded";

  const guestLimitByTier = {
    hearth: 1,
    wayfarer: 2,
    gilded: 3,
  } as const;

  const guestLimit =
    guestLimitByTier[tier];

  return {
    roomId,
    roomName:
      roomResult.data?.name ??
      "The Breeze Lodgings",
    rentalId: rental.id,
    tier,
    guestLimit,
    guests: allCharacters.filter(
      (character) =>
        guestIds.has(character.id),
    ),
    pendingInvitations,
    candidates: allCharacters.filter(
      (character) =>
        !guestIds.has(character.id) &&
        !pendingIds.has(character.id),
    ),
  };
}
export type BreezeLodgingVisibility = {
  allRoomIds: string[];
  visibleRoomIds: string[];
};

export async function getBreezeLodgingVisibility(
  characterId: string,
): Promise<BreezeLodgingVisibility> {
  const admin = createPrivilegedClient();
  await admin.rpc("expire_breeze_lodging_rentals");

  const { data: lodgingRooms, error: lodgingRoomsError } = await admin
    .from("breeze_lodging_rooms")
    .select("room_id");

  if (lodgingRoomsError) {
    throw new Error(`Unable to load Breeze Lodgings rooms: ${lodgingRoomsError.message}`);
  }

  const allRoomIds = [...new Set((lodgingRooms ?? []).map((row) => String(row.room_id)))];
  const staff = await getStaffSession();

  if (staff) {
    return { allRoomIds, visibleRoomIds: allRoomIds };
  }

  const now = new Date().toISOString();

  const { data: ownedRentals, error: ownedRentalsError } = await admin
    .from("breeze_lodging_rentals")
    .select("room_id")
    .eq("owner_character_id", characterId)
    .eq("status", "active")
    .gt("ends_at", now);

  if (ownedRentalsError) {
    throw new Error(`Unable to load owned Breeze Lodgings rooms: ${ownedRentalsError.message}`);
  }

  const { data: guestRows, error: guestRowsError } = await admin
    .from("breeze_lodging_guests")
    .select("rental:breeze_lodging_rentals!breeze_lodging_guests_rental_id_fkey(room_id,status,ends_at)")
    .eq("character_id", characterId)
    .eq("status", "active");

  if (guestRowsError) {
    throw new Error(`Unable to load Breeze Lodgings guest visibility: ${guestRowsError.message}`);
  }

  const visible = new Set((ownedRentals ?? []).map((rental) => String(rental.room_id)));

  for (const row of guestRows ?? []) {
    const relation = Array.isArray(row.rental) ? row.rental[0] ?? null : row.rental;

    if (
      relation &&
      relation.status === "active" &&
      relation.ends_at &&
      relation.ends_at > now
    ) {
      visible.add(String(relation.room_id));
    }
  }

  return { allRoomIds, visibleRoomIds: [...visible] };
}

export type BreezeLodgingStaffOccupant = {
  roomId: string;
  displayName: string;
};

export async function getBreezeLodgingStaffOccupants(): Promise<
  BreezeLodgingStaffOccupant[]
> {
  const staff =
    await getStaffSession();

  if (!staff) {
    return [];
  }

  const admin =
    createPrivilegedClient();

  await admin.rpc(
    "expire_breeze_lodging_rentals",
  );

  const now =
    new Date().toISOString();

  const {
    data: rentals,
    error: rentalsError,
  } = await admin
    .from("breeze_lodging_rentals")
    .select(
      "room_id, owner_character_id",
    )
    .eq("status", "active")
    .gt("ends_at", now);

  if (rentalsError) {
    throw new Error(
      `Unable to load Breeze Lodgings occupants: ${rentalsError.message}`,
    );
  }

  const ownerIds = [
    ...new Set(
      (rentals ?? []).map(
        (rental) =>
          rental.owner_character_id,
      ),
    ),
  ];

  if (ownerIds.length === 0) {
    return [];
  }

  const {
    data: characters,
    error: charactersError,
  } = await admin
    .from("characters")
    .select("id, display_name")
    .in("id", ownerIds);

  if (charactersError) {
    throw new Error(
      `Unable to load Breeze Lodgings renter names: ${charactersError.message}`,
    );
  }

  const namesById =
    new Map(
      (characters ?? []).map(
        (character) => [
          character.id,
          character.display_name,
        ],
      ),
    );

  return (rentals ?? [])
    .map((rental) => {
      const displayName =
        namesById.get(
          rental.owner_character_id,
        );

      if (!displayName) {
        return null;
      }

      return {
        roomId:
          String(rental.room_id),
        displayName:
          String(displayName),
      };
    })
    .filter(
      (
        occupant,
      ): occupant is BreezeLodgingStaffOccupant =>
        occupant !== null,
    );
}

