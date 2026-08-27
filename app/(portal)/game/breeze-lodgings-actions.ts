"use server";

import { revalidatePath } from "next/cache";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
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

function createBreezeAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireBreezeRentalOwner(
  roomId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!character) {
    throw new Error(
      "Your character must be approved.",
    );
  }

  const admin = createBreezeAdminClient();

  await admin.rpc(
    "expire_breeze_lodging_rentals",
  );

  const {
    data: rental,
    error: rentalError,
  } = await admin
    .from("breeze_lodging_rentals")
    .select("id, room_id, owner_character_id")
    .eq("room_id", roomId)
    .eq("owner_character_id", character.id)
    .eq("status", "active")
    .gt(
      "ends_at",
      new Date().toISOString(),
    )
    .maybeSingle();

  if (rentalError) {
    throw new Error(rentalError.message);
  }

  if (!rental) {
    throw new Error(
      "Only the current room renter can manage guests.",
    );
  }

  return {
    admin,
    characterId: character.id,
    rental,
  };
}

export async function inviteBreezeLodgingGuest(
  roomId: string,
  guestCharacterId: string,
) {
  try {
    if (!roomId || !guestCharacterId) {
      return {
        ok: false,
        message: "Choose a character to invite.",
      };
    }

    const {
      admin,
      characterId,
      rental,
    } = await requireBreezeRentalOwner(
      roomId,
    );

    if (guestCharacterId === characterId) {
      return {
        ok: false,
        message:
          "You already own this room.",
      };
    }

    const {
      data: guest,
      error: guestError,
    } = await admin
      .from("characters")
      .select("id, display_name, status")
      .eq("id", guestCharacterId)
      .eq("status", "approved")
      .maybeSingle();

    if (guestError) {
      throw new Error(guestError.message);
    }

    if (!guest) {
      return {
        ok: false,
        message:
          "That approved character could not be found.",
      };
    }

    const { error: inviteError } =
      await admin
        .from("breeze_lodging_guests")
        .upsert(
          {
            rental_id: rental.id,
            character_id: guest.id,
            status: "active",
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "rental_id,character_id",
          },
        );

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    revalidatePath("/game");

    return {
      ok: true,
      message:
        `${guest.display_name} can now enter your room.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The invitation could not be sent.",
    };
  }
}

export async function removeBreezeLodgingGuest(
  roomId: string,
  guestCharacterId: string,
) {
  try {
    if (!roomId || !guestCharacterId) {
      return {
        ok: false,
        message: "Choose a guest to remove.",
      };
    }

    const {
      admin,
      rental,
    } = await requireBreezeRentalOwner(
      roomId,
    );

    const {
      data: guest,
      error: guestError,
    } = await admin
      .from("characters")
      .select(
        "id, display_name, current_room_id",
      )
      .eq("id", guestCharacterId)
      .maybeSingle();

    if (guestError) {
      throw new Error(guestError.message);
    }

    if (!guest) {
      return {
        ok: false,
        message:
          "That guest could not be found.",
      };
    }

    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("breeze_lodging_guests")
      .select("character_id")
      .eq("rental_id", rental.id)
      .eq(
        "character_id",
        guestCharacterId,
      )
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      throw new Error(
        membershipError.message,
      );
    }

    if (!membership) {
      return {
        ok: false,
        message:
          "That character is not an active guest.",
      };
    }

    const { error: revokeError } =
      await admin
        .from("breeze_lodging_guests")
        .update({
          status: "revoked",
          updated_at:
            new Date().toISOString(),
        })
        .eq("rental_id", rental.id)
        .eq(
          "character_id",
          guestCharacterId,
        );

    if (revokeError) {
      throw new Error(revokeError.message);
    }

    if (guest.current_room_id === roomId) {
      const {
        data: inn,
        error: innError,
      } = await admin
        .from("rooms")
        .select("id")
        .eq(
          "slug",
          "the-breeze-lodgings",
        )
        .maybeSingle();

      if (innError) {
        throw new Error(innError.message);
      }

      if (!inn) {
        throw new Error(
          "The Breeze Lodgings lobby could not be found.",
        );
      }

      const { error: moveError } =
        await admin
          .from("characters")
          .update({
            current_room_id: inn.id,
          })
          .eq("id", guestCharacterId)
          .eq(
            "current_room_id",
            roomId,
          );

      if (moveError) {
        throw new Error(moveError.message);
      }

      const { error: presenceError } =
        await admin
          .from("character_presence")
          .update({
            room_id: inn.id,
            last_seen_at:
              new Date().toISOString(),
          })
          .eq(
            "character_id",
            guestCharacterId,
          )
          .eq("room_id", roomId);

      if (presenceError) {
        throw new Error(
          presenceError.message,
        );
      }
    }

    revalidatePath("/game");

    return {
      ok: true,
      message:
        `${guest.display_name} no longer has access to your room.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The guest could not be removed.",
    };
  }
}

