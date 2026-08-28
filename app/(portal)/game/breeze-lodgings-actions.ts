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
      data: lodgingRoom,
      error: lodgingRoomError,
    } = await admin
      .from("breeze_lodging_rooms")
      .select("tier")
      .eq("room_id", roomId)
      .maybeSingle();

    if (lodgingRoomError) {
      throw new Error(
        lodgingRoomError.message,
      );
    }

    if (!lodgingRoom) {
      return {
        ok: false,
        message:
          "This is not a Breeze Lodgings room.",
      };
    }

    const guestLimitByTier = {
      hearth: 1,
      wayfarer: 2,
      gilded: 3,
    } as const;

    const roomTier =
      lodgingRoom.tier as keyof typeof guestLimitByTier;

    const guestLimit =
      guestLimitByTier[roomTier];

    if (!guestLimit) {
      return {
        ok: false,
        message:
          "This room has an invalid lodging tier.",
      };
    }

    const [
      activeGuestCountResult,
      pendingInvitationCountResult,
    ] = await Promise.all([
      admin
        .from("breeze_lodging_guests")
        .select("character_id", {
          count: "exact",
          head: true,
        })
        .eq("rental_id", rental.id)
        .eq("status", "active"),

      admin
        .from("breeze_lodging_invitations")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("rental_id", rental.id)
        .eq("room_id", roomId)
        .eq("status", "pending"),
    ]);

    const guestCountError =
      activeGuestCountResult.error ??
      pendingInvitationCountResult.error;

    if (guestCountError) {
      throw new Error(
        guestCountError.message,
      );
    }

    const occupiedGuestSlots =
      (activeGuestCountResult.count ?? 0) +
      (pendingInvitationCountResult.count ?? 0);

    if (occupiedGuestSlots >= guestLimit) {
      const tierLabel =
        roomTier === "hearth"
          ? "Hearth Room"
          : roomTier === "wayfarer"
            ? "Wayfarer Room"
            : "Gilded Chamber";

      return {
        ok: false,
        message:
          `This ${tierLabel} allows a maximum of ${guestLimit} invitee${guestLimit === 1 ? "" : "s"}. Remove a guest or withdraw a pending invitation first.`,
      };
    }

    const authenticated =
      await createClient();

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

    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("breeze_lodging_guests")
      .select("status")
      .eq("rental_id", rental.id)
      .eq("character_id", guest.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      throw new Error(
        membershipError.message,
      );
    }

    if (membership) {
      return {
        ok: false,
        message:
          "That character already has access.",
      };
    }

    const {
      data: pending,
      error: pendingError,
    } = await admin
      .from("breeze_lodging_invitations")
      .select("id")
      .eq("room_id", roomId)
      .eq(
        "recipient_character_id",
        guest.id,
      )
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError) {
      throw new Error(pendingError.message);
    }

    if (pending) {
      return {
        ok: false,
        message:
          "That character already has a pending invitation.",
      };
    }

    const {
      data: presence,
    } = await admin
      .from("character_presence")
      .select("status, last_seen_at")
      .eq("character_id", guest.id)
      .maybeSingle();

    const lastSeen =
      presence?.last_seen_at
        ? Date.parse(
            presence.last_seen_at,
          )
        : Number.NaN;

    const online =
      presence?.status === "online" &&
      Number.isFinite(lastSeen) &&
      Date.now() - lastSeen <=
        2 * 60 * 1000;

    const deliveryMethod =
      online
        ? "popup"
        : "message";

    const {
      data: invitation,
      error: invitationError,
    } = await admin
      .from("breeze_lodging_invitations")
      .insert({
        rental_id: rental.id,
        room_id: roomId,
        inviter_character_id:
          characterId,
        recipient_character_id:
          guest.id,
        delivery_method:
          deliveryMethod,
      })
      .select("id")
      .single();

    if (invitationError) {
      throw new Error(
        invitationError.message,
      );
    }

    if (deliveryMethod === "message") {
      const {
        data: conversationId,
        error: conversationError,
      } = await authenticated.rpc(
        "start_direct_conversation",
        {
          recipient_character_id:
            guest.id,
        },
      );

      if (
        conversationError ||
        !conversationId
      ) {
        await admin
          .from(
            "breeze_lodging_invitations",
          )
          .delete()
          .eq("id", invitation.id);

        throw new Error(
          conversationError?.message ??
            "The invitation conversation could not be created.",
        );
      }

      const {
        data: room,
        error: roomError,
      } = await admin
        .from("rooms")
        .select("name")
        .eq("id", roomId)
        .single();

      if (roomError) {
        throw new Error(roomError.message);
      }

      const { error: messageError } =
        await admin
          .from("direct_messages")
          .insert({
            conversation_id:
              conversationId,
            sender_character_id:
              characterId,
            message_mode: "offgame",
            body:
              `<p>You have been invited to <strong>${room.name}</strong> at The Breeze Lodgings. Accept or refuse the invitation below.</p>` +
              `<!--BREEZE_LODGING_INVITE:${invitation.id}-->`,
            client_nonce:
              crypto.randomUUID(),
          });

      if (messageError) {
        await admin
          .from(
            "breeze_lodging_invitations",
          )
          .delete()
          .eq("id", invitation.id);

        throw new Error(
          messageError.message,
        );
      }

      await admin
        .from("direct_conversations")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    revalidatePath("/game");
    revalidatePath("/messages");

    return {
      ok: true,
      message:
        `${guest.display_name} has been invited and must accept before entering.`,
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

export async function withdrawBreezeLodgingInvitation(
  roomId: string,
  invitationId: string,
) {
  try {
    if (!roomId || !invitationId) {
      return {
        ok: false,
        message:
          "Choose an invitation to withdraw.",
      };
    }

    const {
      admin,
    } = await requireBreezeRentalOwner(
      roomId,
    );

    const {
      data: invitation,
      error: invitationError,
    } = await admin
      .from("breeze_lodging_invitations")
      .select(
        "id, room_id, status, recipient_character_id",
      )
      .eq("id", invitationId)
      .eq("room_id", roomId)
      .eq("status", "pending")
      .maybeSingle();

    if (invitationError) {
      throw new Error(
        invitationError.message,
      );
    }

    if (!invitation) {
      return {
        ok: false,
        message:
          "That invitation is no longer pending.",
      };
    }

    const {
      data: recipient,
    } = await admin
      .from("characters")
      .select("display_name")
      .eq(
        "id",
        invitation.recipient_character_id,
      )
      .maybeSingle();

    const { error: cancelError } =
      await admin
        .from(
          "breeze_lodging_invitations",
        )
        .update({
          status: "cancelled",
          responded_at:
            new Date().toISOString(),
        })
        .eq("id", invitation.id)
        .eq("status", "pending");

    if (cancelError) {
      throw new Error(
        cancelError.message,
      );
    }

    revalidatePath("/game");
    revalidatePath("/messages");

    return {
      ok: true,
      message:
        `Invitation to ${recipient?.display_name ?? "that character"} withdrawn.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The invitation could not be withdrawn.",
    };
  }
}

export async function respondBreezeLodgingInvitation(
  invitationId: string,
  response: "accept" | "refuse",
) {
  try {
    if (!invitationId) {
      return {
        ok: false,
        message:
          "This invitation is no longer available.",
      };
    }

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        message: "You must be signed in.",
      };
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
      throw new Error(
        characterError.message,
      );
    }

    if (!character) {
      return {
        ok: false,
        message:
          "Your character must be approved.",
      };
    }

    const admin =
      createBreezeAdminClient();

    await admin.rpc(
      "expire_breeze_lodging_rentals",
    );

    const {
      data: invitation,
      error: invitationError,
    } = await admin
      .from("breeze_lodging_invitations")
      .select(
        "id, rental_id, room_id, inviter_character_id, recipient_character_id, status",
      )
      .eq("id", invitationId)
      .maybeSingle();

    if (
      invitationError ||
      !invitation ||
      invitation.recipient_character_id !==
        character.id ||
      invitation.status !== "pending"
    ) {
      return {
        ok: false,
        message:
          invitationError?.message ??
          "This invitation is no longer available.",
      };
    }

    const {
      data: rental,
      error: rentalError,
    } = await admin
      .from("breeze_lodging_rentals")
      .select(
        "id, room_id, owner_character_id",
      )
      .eq("id", invitation.rental_id)
      .eq("room_id", invitation.room_id)
      .eq(
        "owner_character_id",
        invitation.inviter_character_id,
      )
      .eq("status", "active")
      .gt(
        "ends_at",
        new Date().toISOString(),
      )
      .maybeSingle();

    if (rentalError) {
      throw new Error(
        rentalError.message,
      );
    }

    if (!rental) {
      await admin
        .from(
          "breeze_lodging_invitations",
        )
        .update({
          status: "cancelled",
          responded_at:
            new Date().toISOString(),
        })
        .eq("id", invitation.id);

      return {
        ok: false,
        message:
          "This room invitation is no longer available.",
      };
    }

    if (response === "accept") {
      const {
        error: guestError,
      } = await admin
        .from("breeze_lodging_guests")
        .upsert(
          {
            rental_id: rental.id,
            character_id:
              character.id,
            status: "active",
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "rental_id,character_id",
          },
        );

      if (guestError) {
        throw new Error(
          guestError.message,
        );
      }
    }

    const {
      error: responseError,
    } = await admin
      .from("breeze_lodging_invitations")
      .update({
        status:
          response === "accept"
            ? "accepted"
            : "refused",
        responded_at:
          new Date().toISOString(),
      })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (responseError) {
      throw new Error(
        responseError.message,
      );
    }

    revalidatePath("/game");
    revalidatePath("/messages");

    if (response === "accept") {
      const {
        error: moveError,
      } = await admin
        .from("characters")
        .update({
          current_room_id:
            invitation.room_id,
        })
        .eq("id", character.id);

      if (moveError) {
        throw new Error(
          moveError.message,
        );
      }

      const {
        data: existingPresence,
      } = await admin
        .from("character_presence")
        .select("character_id")
        .eq(
          "character_id",
          character.id,
        )
        .maybeSingle();

      if (existingPresence) {
        const {
          error: presenceError,
        } = await admin
          .from("character_presence")
          .update({
            room_id:
              invitation.room_id,
            last_seen_at:
              new Date().toISOString(),
          })
          .eq(
            "character_id",
            character.id,
          );

        if (presenceError) {
          throw new Error(
            presenceError.message,
          );
        }
      } else {
        const {
          error: presenceError,
        } = await admin
          .from("character_presence")
          .insert({
            character_id:
              character.id,
            room_id:
              invitation.room_id,
            status: "online",
            manual_status: "online",
            last_seen_at:
              new Date().toISOString(),
          });

        if (
          presenceError &&
          presenceError.code !== "23505"
        ) {
          throw new Error(
            presenceError.message,
          );
        }
      }

      revalidatePath("/");
    }

    return {
      ok: true,
      message:
        response === "accept"
          ? "Invitation accepted."
          : "Invitation refused.",
      enter:
        response === "accept",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The invitation could not be answered.",
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

