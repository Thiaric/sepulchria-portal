"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function rentBreezeLodging(roomId: string, days: number) {
  if (!roomId) return { ok: false, message: "Choose a room." };

  if (!Number.isSafeInteger(days) || days < 1 || days > 7) {
    return { ok: false, message: "Choose between 1 and 7 days." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rent_breeze_lodging", {
    p_room_id: roomId,
    p_days: days,
  });

  if (error) return { ok: false, message: error.message };

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    return { ok: false, message: "The rental could not be confirmed." };
  }

  revalidatePath("/game");
  revalidatePath("/character");

  return {
    ok: true,
    message: `${result.room_name} reserved for ${result.days} day${result.days === 1 ? "" : "s"}. ${result.total_paid} Remnants paid.`,
  };
}

export async function enterBreezeLodging(
  roomId: string,
) {
  if (!roomId) {
    return {
      ok: false,
      message: "Choose a room.",
    };
  }

  const supabase =
    await createClient();

  const { data, error } =
    await supabase.rpc(
      "enter_breeze_lodging",
      {
        p_room_id: roomId,
      },
    );

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result) {
    return {
      ok: false,
      message:
        "The room could not be entered.",
    };
  }

  revalidatePath("/game");
  revalidatePath("/");

  return {
    ok: true,
    message:
      `Entering ${result.room_name}.`,
  };
}

