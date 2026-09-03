import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

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

async function touchPresence(
  characterId: string,
  roomId: string | null,
) {
  const admin = adminClient();
  const now =
    new Date().toISOString();

  const {
    data: updated,
    error: updateError,
  } = await admin
    .from("character_presence")
    .update({
      room_id: roomId,
      last_seen_at: now,
    })
    .eq(
      "character_id",
      characterId,
    )
    .select("character_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      `Unable to move character presence: ${updateError.message}`,
    );
  }

  if (updated) {
    return;
  }

  const {
    error: insertError,
  } = await admin
    .from("character_presence")
    .insert({
      character_id:
        characterId,
      room_id:
        roomId,
      status:
        "online",
      manual_status:
        "online",
      last_seen_at:
        now,
    });

  if (
    insertError &&
    insertError.code !== "23505"
  ) {
    throw new Error(
      `Unable to create character presence: ${insertError.message}`,
    );
  }

  if (
    insertError?.code === "23505"
  ) {
    const {
      error: retryError,
    } = await admin
      .from("character_presence")
      .update({
        room_id: roomId,
        last_seen_at: now,
      })
      .eq(
        "character_id",
        characterId,
      );

    if (retryError) {
      throw new Error(
        `Unable to move character presence: ${retryError.message}`,
      );
    }
  }
}

export async function evictOrderMemberFromHeadquarters({
  orderId,
  characterId,
  returnRoomId,
}: {
  orderId: string;
  characterId: string;
  returnRoomId: string | null;
}) {
  const admin =
    adminClient();

  const {
    data: headquarters,
    error: headquartersError,
  } = await admin
    .from("order_headquarters")
    .select("room_id")
    .eq(
      "order_id",
      orderId,
    )
    .maybeSingle();

  if (headquartersError) {
    throw new Error(
      `Unable to inspect Order Headquarters: ${headquartersError.message}`,
    );
  }

  if (!headquarters?.room_id) {
    return;
  }

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("current_room_id")
    .eq(
      "id",
      characterId,
    )
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to inspect member location: ${characterError.message}`,
    );
  }

  if (
    character?.current_room_id !==
    headquarters.room_id
  ) {
    return;
  }

  const fallback =
    returnRoomId ?? null;

  const {
    error: moveError,
  } = await admin
    .from("characters")
    .update({
      current_room_id:
        fallback,
    })
    .eq(
      "id",
      characterId,
    );

  if (moveError) {
    throw new Error(
      `Unable to evict member from Order Headquarters: ${moveError.message}`,
    );
  }

  await touchPresence(
    characterId,
    fallback,
  );
}
