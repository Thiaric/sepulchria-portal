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
  textColour: string;
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
      textColour:
        privateRoom.text_colour,
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
