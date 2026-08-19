import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  getStaffSession,
} from "@/lib/auth/require-staff";

type PrivateLocationAccess = {
  isPrivate: boolean;
  canAccess: boolean;
  ownerCharacterId: string | null;
  backgroundColour: string | null;
  textColour: string | null;
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

/**
 * This deliberately uses the service-role client.
 *
 * A normal authenticated client must NOT be used to determine whether a room
 * is private: RLS can hide the metadata row from an unauthorised character,
 * which would otherwise make a private room look like an ordinary room.
 */
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
      "owner_character_id, background_colour, text_colour",
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
    return {
      isPrivate: false,
      canAccess: true,
      ownerCharacterId: null,
      backgroundColour: null,
      textColour: null,
    };
  }

  const staff =
    await getStaffSession();

  if (staff) {
    return {
      isPrivate: true,
      canAccess: true,
      ownerCharacterId:
        privateRoom.owner_character_id,
      backgroundColour:
        privateRoom.background_colour,
      textColour:
        privateRoom.text_colour,
    };
  }

  const [
    entitlementResult,
    membershipResult,
  ] = await Promise.all([
    admin
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
      .maybeSingle(),

    admin
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
      .maybeSingle(),
  ]);

  if (entitlementResult.error) {
    throw new Error(
      `Unable to verify Private Location entitlement: ${entitlementResult.error.message}`,
    );
  }

  if (membershipResult.error) {
    throw new Error(
      `Unable to verify Private Location membership: ${membershipResult.error.message}`,
    );
  }

  return {
    isPrivate: true,
    canAccess:
      entitlementResult.data
        ?.enabled === true &&
      membershipResult.data
        ?.status === "active",
    ownerCharacterId:
      privateRoom.owner_character_id,
    backgroundColour:
      privateRoom.background_colour,
    textColour:
      privateRoom.text_colour,
  };
}
