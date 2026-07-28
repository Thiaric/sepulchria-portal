"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function moveCharacter(formData: FormData) {
  const roomId = formData.get("roomId");

  if (typeof roomId !== "string" || !roomId) {
    throw new Error("Invalid destination room.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id, current_room_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to load character: ${characterError.message}`,
    );
  }

  if (!character) {
    redirect("/character/create");
  }

  if (!character.current_room_id) {
    throw new Error("The character has no current room.");
  }

  const { data: directConnection, error: directConnectionError } =
    await supabase
      .from("room_connections")
      .select("id")
      .eq("from_room_id", character.current_room_id)
      .eq("to_room_id", roomId)
      .maybeSingle();

  if (directConnectionError) {
    throw new Error(
      `Unable to verify connection: ${directConnectionError.message}`,
    );
  }

  const { data: reverseConnection, error: reverseConnectionError } =
    await supabase
      .from("room_connections")
      .select("id")
      .eq("from_room_id", roomId)
      .eq("to_room_id", character.current_room_id)
      .eq("is_two_way", true)
      .maybeSingle();

  if (reverseConnectionError) {
    throw new Error(
      `Unable to verify reverse connection: ${reverseConnectionError.message}`,
    );
  }

  if (!directConnection && !reverseConnection) {
    throw new Error(
      "This room is not connected to the current location.",
    );
  }

  const { error: updateError } = await supabase
    .from("characters")
    .update({
      current_room_id: roomId,
    })
    .eq("id", character.id)
    .eq("user_id", user.id);

  if (updateError) {
    throw new Error(
      `Unable to move character: ${updateError.message}`,
    );
  }

  const { error: presenceError } = await supabase
    .from("character_presence")
    .upsert(
      {
        character_id: character.id,
        room_id: roomId,
        status: "online",
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "character_id",
      },
    );

  if (presenceError) {
    throw new Error(
      `Unable to update presence: ${presenceError.message}`,
    );
  }

  revalidatePath("/game");
  redirect("/game");
}

export async function sendRoomMessage(formData: FormData) {
  const message = formData.get("message");

  if (typeof message !== "string" || !message.trim()) {
    throw new Error("The message cannot be empty.");
  }

  const cleanMessage = message.trim();

  if (cleanMessage.length > 5000) {
    throw new Error("The message cannot exceed 5,000 characters.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id, current_room_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to load character: ${characterError.message}`,
    );
  }

  if (!character) {
    redirect("/character/create");
  }

  if (!character.current_room_id) {
    throw new Error("The character has no current room.");
  }

  const { error: messageError } = await supabase
    .from("room_messages")
    .insert({
      room_id: character.current_room_id,
      character_id: character.id,
      message: cleanMessage,
    });

  if (messageError) {
    throw new Error(
      `Unable to send message: ${messageError.message}`,
    );
  }

  await supabase
    .from("character_presence")
    .upsert(
      {
        character_id: character.id,
        room_id: character.current_room_id,
        status: "online",
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "character_id",
      },
    );

  revalidatePath("/game");
  redirect("/game");
}