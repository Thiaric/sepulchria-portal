import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  getPrivateLocationAccess,
} from "@/lib/private-locations/access";

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing Supabase server configuration.",
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

export async function rememberOrderHeadquartersReturnRoom({
  characterId,
  destinationRoomId,
  currentRoomId,
}: {
  characterId: string;
  destinationRoomId: string;
  currentRoomId: string | null;
}) {
  const admin = adminClient();

  const {
    data: headquarters,
    error: headquartersError,
  } = await admin
    .from("order_headquarters")
    .select("order_id")
    .eq(
      "room_id",
      destinationRoomId,
    )
    .maybeSingle();

  if (headquartersError) {
    throw new Error(
      `Unable to inspect Order Headquarters: ${headquartersError.message}`,
    );
  }

  if (!headquarters) {
    return;
  }

  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("order_memberships")
    .select("id")
    .eq(
      "order_id",
      headquarters.order_id,
    )
    .eq(
      "character_id",
      characterId,
    )
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Unable to inspect Order membership: ${membershipError.message}`,
    );
  }

  if (!membership) {
    return;
  }

  let fallback:
    | string
    | null = null;

  if (
    currentRoomId &&
    currentRoomId !==
      destinationRoomId
  ) {
    const previousAccess =
      await getPrivateLocationAccess(
        currentRoomId,
        characterId,
      );

    if (!previousAccess.isPrivate) {
      fallback =
        currentRoomId;
    }
  }

  const {
    error: saveError,
  } = await admin
    .from("order_memberships")
    .update({
      return_room_id:
        fallback,
    })
    .eq(
      "id",
      membership.id,
    );

  if (saveError) {
    throw new Error(
      `Unable to remember previous public location: ${saveError.message}`,
    );
  }
}
