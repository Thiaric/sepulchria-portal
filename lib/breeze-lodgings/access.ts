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

export type BreezeLodgingManageData = {
  roomId: string;
  rentalId: string;
  guests: BreezeLodgingGuestCharacter[];
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

  const {
    data: guestRows,
    error: guestRowsError,
  } = await admin
    .from("breeze_lodging_guests")
    .select("character_id")
    .eq("rental_id", rental.id)
    .eq("status", "active");

  if (guestRowsError) {
    throw new Error(
      `Unable to load Breeze Lodgings guests: ${guestRowsError.message}`,
    );
  }

  const guestIds =
    (guestRows ?? []).map(
      (row) => row.character_id,
    );

  const {
    data: approvedCharacters,
    error: charactersError,
  } = await admin
    .from("characters")
    .select("id, display_name")
    .eq("status", "approved")
    .neq("id", characterId)
    .order("display_name", {
      ascending: true,
    });

  if (charactersError) {
    throw new Error(
      `Unable to load characters for Breeze Lodgings invitations: ${charactersError.message}`,
    );
  }

  const allCharacters =
    (approvedCharacters ?? []).map(
      (character) => ({
        id: character.id,
        display_name:
          character.display_name,
      }),
    );

  const guestIdSet =
    new Set(guestIds);

  return {
    roomId,
    rentalId: rental.id,
    guests: allCharacters.filter(
      (character) =>
        guestIdSet.has(character.id),
    ),
    candidates: allCharacters.filter(
      (character) =>
        !guestIdSet.has(character.id),
    ),
  };
}

