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
