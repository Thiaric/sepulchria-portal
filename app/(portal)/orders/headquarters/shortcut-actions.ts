"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  rememberOrderHeadquartersReturnRoom,
} from "@/lib/order-headquarters/return-room";

type RoomRelation =
  | {
      is_active: boolean | null;
    }
  | {
      is_active: boolean | null;
    }[]
  | null;

export async function enterOwnOrderHeadquarters() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "You must be signed in.",
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, current_room_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    throw new Error(
      characterError?.message ??
        "Unable to load your character.",
    );
  }

  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("order_memberships")
    .select("order_id")
    .eq(
      "character_id",
      character.id,
    )
    .limit(1);

  if (membershipError) {
    throw new Error(
      `Unable to load your Order membership: ${membershipError.message}`,
    );
  }

  const orderId =
    memberships?.[0]?.order_id ??
    null;

  if (!orderId) {
    throw new Error(
      "You are not currently a member of an Order.",
    );
  }

  const {
    data: headquarters,
    error: headquartersError,
  } = await supabase
    .from("order_headquarters")
    .select(`
      room_id,
      room:rooms!order_headquarters_room_id_fkey(
        is_active
      )
    `)
    .eq(
      "order_id",
      orderId,
    )
    .maybeSingle();

  if (headquartersError) {
    throw new Error(
      `Unable to load your Order Headquarters: ${headquartersError.message}`,
    );
  }

  const roomRelation =
    headquarters?.room as
      RoomRelation;

  const room =
    Array.isArray(roomRelation)
      ? roomRelation[0] ?? null
      : roomRelation;

  if (
    !headquarters?.room_id ||
    room?.is_active !== true
  ) {
    throw new Error(
      "Your Order Headquarters is currently unavailable.",
    );
  }

  await rememberOrderHeadquartersReturnRoom({
    characterId:
      character.id,
    destinationRoomId:
      headquarters.room_id,
    currentRoomId:
      character.current_room_id,
  });

  const {
  error: moveError,
} = await supabase
  .from("characters")
  .update({
    current_room_id:
      headquarters.room_id,
  })
  .eq(
    "id",
    character.id,
  );

  if (moveError) {
    throw new Error(
      `Unable to enter your Order Headquarters: ${moveError.message}`,
    );
  }

  redirect("/game");
}
