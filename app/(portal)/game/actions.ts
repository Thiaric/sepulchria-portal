"use server";

import { randomInt } from "node:crypto";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CHAT_COOLDOWN_SECONDS,
  CHAT_MAX_LENGTH,
  ROOM_ROLL_COOLDOWN_SECONDS,
} from "@/lib/game/constants";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import {
  applyTemporaryGiftActivationHealth,
} from "@/lib/gifts/gift-health-effects";
import type {
  ActionState,
  CharacterAttributeKey,
  PresenceActionResult,
  PresenceStatus,
} from "@/types/game";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type OwnedCharacter = {
  id: string;
  current_room_id: string | null;
  status: string;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
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

  return createAdminClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function giftDurationLabel(
  effectMode: string,
  durationMinutes: number | null,
): string {
  if (effectMode === "temporary") {
    return durationMinutes
      ? `${durationMinutes} minutes`
      : "Temporary";
  }

  if (effectMode === "passive") {
    return "Passive";
  }

  return "";
}

async function insertGiftUseMessage({
  supabase,
  characterId,
  roomId,
  giftName,
  giftDescription,
  effectMode,
  durationMinutes,
}: {
  supabase: SupabaseClient;
  characterId: string;
  roomId: string;
  giftName: string;
  giftDescription: string;
  effectMode: string;
  durationMinutes: number | null;
}) {
  const description =
    giftDescription.trim() || "No description";

  const duration =
    giftDurationLabel(
      effectMode,
      durationMinutes,
    );

  const { error } = await supabase
  .from("room_messages")
  .insert({
    room_id: roomId,
    character_id: characterId,
    message:
      `◆ used "${giftName}" · ${description}${
        duration ? ` · Duration: ${duration}` : ""
      }`,
    message_type: "action",
    client_nonce: crypto.randomUUID(),
  });

  if (error) {
    throw new Error(
      `Unable to announce Gift use: ${error.message}`,
    );
  }
}

const VALID_PRESENCE_STATUSES: PresenceStatus[] = [
  "online",
  "away",
  "busy",
];

function isPresenceStatus(value: unknown): value is PresenceStatus {
  return VALID_PRESENCE_STATUSES.includes(value as PresenceStatus);
}

async function getOwnedCharacter(): Promise<{
  supabase: SupabaseClient;
  character: OwnedCharacter;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select(`
      id,
      current_room_id,
      status,
      muscles,
      reflexes,
      vigor,
      brains,
      shrewd,
      presence_score
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(`Unable to load character: ${characterError.message}`);
  }

  if (!character) {
    redirect("/character/create");
  }

  if (character.status !== "approved") {
    redirect(
      `/character?error=${encodeURIComponent(
        "Your character must be approved by the staff before entering the city.",
      )}`,
    );
  }

  return {
    supabase,
    character: character as OwnedCharacter,
  };
}

/**
 * Aggiorna soltanto stanza e ultimo heartbeat.
 * Lo status selezionato dal giocatore non viene mai sovrascritto.
 */
async function touchPresence(
  supabase: SupabaseClient,
  characterId: string,
  roomId: string | null,
): Promise<void> {
  const now = new Date().toISOString();

  const { data: updatedPresence, error: updateError } = await supabase
    .from("character_presence")
    .update({
      room_id: roomId,
      last_seen_at: now,
    })
    .eq("character_id", characterId)
    .select("character_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Unable to refresh presence: ${updateError.message}`);
  }

  if (updatedPresence) {
    return;
  }

  const { error: insertError } = await supabase
    .from("character_presence")
    .insert({
      character_id: characterId,
      room_id: roomId,
      status: "online",
      manual_status: "online",
      last_seen_at: now,
    });

  if (insertError && insertError.code !== "23505") {
    throw new Error(`Unable to create presence: ${insertError.message}`);
  }

  if (insertError?.code === "23505") {
    const { error: retryError } = await supabase
      .from("character_presence")
      .update({
        room_id: roomId,
        last_seen_at: now,
      })
      .eq("character_id", characterId);

    if (retryError) {
      throw new Error(`Unable to refresh presence: ${retryError.message}`);
    }
  }
}

export async function moveCharacter(formData: FormData): Promise<void> {
  const roomId = String(formData.get("roomId") ?? "").trim();

  if (!roomId) {
    throw new Error("Invalid destination room.");
  }

  const { supabase, character } = await getOwnedCharacter();

  if (!character.current_room_id) {
    throw new Error("The character has no current room.");
  }

  const [directResult, reverseResult] = await Promise.all([
    supabase
      .from("room_connections")
      .select("id")
      .eq("from_room_id", character.current_room_id)
      .eq("to_room_id", roomId)
      .maybeSingle(),
    supabase
      .from("room_connections")
      .select("id")
      .eq("from_room_id", roomId)
      .eq("to_room_id", character.current_room_id)
      .eq("is_two_way", true)
      .maybeSingle(),
  ]);

  if (directResult.error) {
    throw new Error(
      `Unable to verify room connection: ${directResult.error.message}`,
    );
  }

  if (reverseResult.error) {
    throw new Error(
      `Unable to verify reverse room connection: ${reverseResult.error.message}`,
    );
  }

  if (!directResult.data && !reverseResult.data) {
    throw new Error("This room is not connected to the current location.");
  }

  const { error: moveError } = await supabase
    .from("characters")
    .update({ current_room_id: roomId })
    .eq("id", character.id);

  if (moveError) {
    throw new Error(`Unable to move character: ${moveError.message}`);
  }

  await touchPresence(supabase, character.id, roomId);

  revalidatePath("/game");
  redirect("/game");
}

export async function enterRoomFromMap(
  formData: FormData,
): Promise<void> {
  const roomId = String(
    formData.get("roomId") ?? "",
  ).trim();

  if (!roomId) {
    throw new Error("Invalid destination room.");
  }

  const { supabase, character } =
    await getOwnedCharacter();

  const {
    data: destinationRoom,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("is_active", true)
    .maybeSingle();

  if (roomError) {
    throw new Error(
      `Unable to verify destination room: ${roomError.message}`,
    );
  }

  if (!destinationRoom) {
    throw new Error(
      "This location is not available.",
    );
  }

  const { error: moveError } = await supabase
    .from("characters")
    .update({
      current_room_id: roomId,
    })
    .eq("id", character.id);

  if (moveError) {
    throw new Error(
      `Unable to enter location: ${moveError.message}`,
    );
  }

  await touchPresence(
    supabase,
    character.id,
    roomId,
  );

  revalidatePath("/game");
  revalidatePath("/");

  redirect("/game");
}

type WhisperRecipient = {
  id: string;
  display_name: string;
};

async function resolveWhisperRecipient(
  supabase: SupabaseClient,
  senderCharacterId: string,
  roomId: string,
  recipientId: string,
): Promise<
  | {
      ok: true;
      recipient: WhisperRecipient;
    }
  | {
      ok: false;
      message: string;
    }
> {
  if (!recipientId) {
    return {
      ok: false,
      message:
        "Choose a character to whisper to.",
    };
  }

  if (
    recipientId ===
    senderCharacterId
  ) {
    return {
      ok: false,
      message:
        "You cannot whisper to yourself.",
    };
  }

  const activeSince = new Date(
    Date.now() -
      5 * 60_000,
  ).toISOString();

  const {
    data: presence,
    error: presenceError,
  } = await supabase
    .from("character_presence")
    .select("character_id")
    .eq(
      "character_id",
      recipientId,
    )
    .eq("room_id", roomId)
    .gte(
      "last_seen_at",
      activeSince,
    )
    .maybeSingle();

  if (presenceError) {
    return {
      ok: false,
      message:
        `Unable to verify the whisper recipient: ${presenceError.message}`,
    };
  }

  if (!presence) {
    return {
      ok: false,
      message:
        "That character is no longer present in this room.",
    };
  }

  const {
    data: recipient,
    error: recipientError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name",
    )
    .eq("id", recipientId)
    .maybeSingle();

  if (
    recipientError ||
    !recipient
  ) {
    return {
      ok: false,
      message:
        recipientError
          ? `Unable to load the whisper recipient: ${recipientError.message}`
          : "The selected whisper recipient no longer exists.",
    };
  }

  return {
    ok: true,
    recipient:
      recipient as WhisperRecipient,
  };
}

export async function sendRoomMessage(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const rawMessage = String(
      formData.get("message") ??
        "",
    ).trim();

    if (!rawMessage) {
      return {
        ok: false,
        message:
          "Write an action or some dialogue before sending it.",
      };
    }

    if (
      rawMessage.length >
      CHAT_MAX_LENGTH
    ) {
      return {
        ok: false,
        message:
          `The message exceeds ${CHAT_MAX_LENGTH.toLocaleString(
            "en-GB",
          )} characters.`,
      };
    }

    const {
      supabase,
      character,
    } = await getOwnedCharacter();

    if (!character.current_room_id) {
      return {
        ok: false,
        message:
          "Your character has no current room.",
      };
    }

    const cooldownStart =
      new Date(
        Date.now() -
          CHAT_COOLDOWN_SECONDS *
            1000,
      ).toISOString();

    const {
      data: recentMessage,
      error: cooldownError,
    } = await supabase
      .from("room_messages")
      .select("id")
      .eq(
        "character_id",
        character.id,
      )
      .gte(
        "created_at",
        cooldownStart,
      )
      .limit(1)
      .maybeSingle();

    if (cooldownError) {
      return {
        ok: false,
        message:
          `Unable to verify the sending cooldown: ${cooldownError.message}`,
      };
    }

    if (recentMessage) {
      return {
        ok: false,
        message:
          `Please wait ${CHAT_COOLDOWN_SECONDS} seconds between actions.`,
      };
    }

    let messageType:
      | "action"
      | "whisper"
      | "fate" =
      "action";

    let storedMessage =
      rawMessage;

    let whisperRecipientId:
      | string
      | null = null;

    if (
      rawMessage.startsWith("^")
    ) {
      const staff =
        await getStaffSession();

      if (
        !staff ||
        ![
          "owner",
          "admin",
          "master",
        ].includes(staff.role)
      ) {
        return {
          ok: false,
          message:
            "Only the owner, administrators and masters may write Fate actions.",
        };
      }

      storedMessage =
        rawMessage
          .slice(1)
          .trim();

      if (!storedMessage) {
        return {
          ok: false,
          message:
            "Write the Fate action after ^.",
        };
      }

      messageType = "fate";
    } else {
      const submittedRecipientId =
        String(
          formData.get(
            "whisper_recipient_id",
          ) ?? "",
        ).trim();

      const typedWhisperMatch =
        rawMessage.match(
          /^@([^@\r\n]+)@\s*/,
        );

      if (submittedRecipientId) {
        const resolution =
          await resolveWhisperRecipient(
            supabase,
            character.id,
            character.current_room_id,
            submittedRecipientId,
          );

        if (!resolution.ok) {
          return {
            ok: false,
            message:
              "Character not at this Location",
          };
        }

        const marker =
          `@${resolution.recipient.display_name}@`;

        if (
          !rawMessage.startsWith(
            marker,
          )
        ) {
          return {
            ok: false,
            message:
              `The whisper must begin with ${marker}. Select the recipient again to restore it.`,
          };
        }

        storedMessage =
          rawMessage
            .slice(
              marker.length,
            )
            .trim();

        if (!storedMessage) {
          return {
            ok: false,
            message:
              "Write the whisper after the character marker.",
          };
        }

        messageType =
          "whisper";

        whisperRecipientId =
          resolution.recipient.id;
      } else if (typedWhisperMatch) {
        const typedCharacterName =
          typedWhisperMatch[1].trim();

        const {
          data: matchingCharacters,
          error: matchingCharactersError,
        } = await supabase
          .from("characters")
          .select(
            "id, display_name",
          )
          .ilike(
            "display_name",
            typedCharacterName,
          )
          .neq(
            "id",
            character.id,
          )
          .limit(10);

        if (matchingCharactersError) {
          return {
            ok: false,
            message:
              `Unable to verify whisper recipient: ${matchingCharactersError.message}`,
          };
        }

        let resolvedRecipient:
          | WhisperRecipient
          | null = null;

        for (
          const candidate of
          matchingCharacters ?? []
        ) {
          const resolution =
            await resolveWhisperRecipient(
              supabase,
              character.id,
              character.current_room_id,
              candidate.id,
            );

          if (resolution.ok) {
            resolvedRecipient =
              resolution.recipient;

            break;
          }
        }

        if (!resolvedRecipient) {
          return {
            ok: false,
            message:
              "Character not at this Location",
          };
        }

        storedMessage =
          rawMessage
            .slice(
              typedWhisperMatch[0]
                .length,
            )
            .trim();

        if (!storedMessage) {
          return {
            ok: false,
            message:
              "Write the whisper after the character marker.",
          };
        }

        messageType =
          "whisper";

        whisperRecipientId =
          resolvedRecipient.id;
      }
    }
      

    const clientNonce =
      readValidNonce(formData);

    const {
      error: insertError,
    } = await supabase
      .from("room_messages")
      .insert({
        room_id:
          character.current_room_id,
        character_id:
          character.id,
        message: storedMessage,
        message_type:
          messageType,
        whisper_recipient_character_id:
          whisperRecipientId,
        client_nonce:
          clientNonce,
      });

    if (
      insertError?.code ===
      "23505"
    ) {
      return {
        ok: true,
        message:
          "Message already received.",
        submittedAt: Date.now(),
      };
    }

    if (insertError) {
      return {
        ok: false,
        message:
          `Unable to send the message: ${insertError.message}`,
      };
    }

    await touchPresence(
      supabase,
      character.id,
      character.current_room_id,
    );

    return {
      ok: true,
      message:
        messageType === "whisper"
          ? "Whisper sent."
          : messageType ===
              "fate"
            ? "Fate action sent."
            : "Action sent.",
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error.",
    };
  }
}

export async function useRoomGift(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const characterGiftId = String(
      formData.get("character_gift_id") ?? "",
    ).trim();

    const { supabase, character } =
      await getOwnedCharacter();

    if (!character.current_room_id) {
      return {
        ok: false,
        message: "Your character has no current room.",
      };
    }

    const roomId =
      character.current_room_id;

    const { data: ownership, error: ownershipError } =
      await supabase
        .from("character_gifts")
        .select(`
          id,
          gift:gifts(
            id,
            name,
            description,
            is_active,
            effect_mode,
            duration_minutes
          )
        `)
        .eq("id", characterGiftId)
        .eq("character_id", character.id)
        .maybeSingle();

    if (ownershipError || !ownership) {
      return {
        ok: false,
        message:
          ownershipError?.message ??
          "This Gift is not owned by your character.",
      };
    }

    const relation = ownership.gift ?? null;
    const gift = Array.isArray(relation)
      ? relation[0] ?? null
      : relation;

    if (!gift || !gift.is_active) {
      return {
        ok: false,
        message: "This Gift is not currently available.",
      };
    }

    if (gift.effect_mode === "temporary") {
      return {
        ok: false,
        message:
          `${gift.name} is a temporary Gift. It can only be activated when it is ready.`,
      };
    }

    await insertGiftUseMessage({
      supabase,
      characterId: character.id,
      roomId,
      giftName: gift.name,
      giftDescription: gift.description ?? "",
      effectMode: gift.effect_mode,
      durationMinutes: gift.duration_minutes,
    });

    await touchPresence(
      supabase,
      character.id,
      character.current_room_id,
    );

    revalidatePath("/game");

    return {
      ok: true,
      message: `${gift.name} used.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to use Gift.",
    };
  }
}

export async function activateRoomGift(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const characterGiftId = String(
      formData.get("character_gift_id") ?? "",
    ).trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        characterGiftId,
      )
    ) {
      return {
        ok: false,
        message: "Choose a valid Gift.",
      };
    }

    const {
      supabase,
      character,
    } = await getOwnedCharacter();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        message: "Your session has expired.",
      };
    }

    const {
      data: ownership,
      error: ownershipError,
    } = await supabase
      .from("character_gifts")
      .select(`
        id,
        gift:gifts(
          id,
          name,
          description,
          is_active,
          effect_mode,
          duration_minutes,
          vigour_modifier
        )
      `)
      .eq("id", characterGiftId)
      .eq("character_id", character.id)
      .maybeSingle();

    if (ownershipError || !ownership) {
      return {
        ok: false,
        message:
          ownershipError?.message ??
          "This Gift is not owned by your character.",
      };
    }

    const relation = ownership.gift ?? null;
    const gift = Array.isArray(relation)
      ? relation[0] ?? null
      : relation;

    if (!gift || !gift.is_active) {
      return {
        ok: false,
        message: "This Gift is not currently active.",
      };
    }

    if (gift.effect_mode !== "temporary") {
      return {
        ok: false,
        message: "This Gift does not require activation.",
      };
    }

    const now = new Date().toISOString();

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("gift_activations")
      .select("id")
      .eq("character_gift_id", characterGiftId)
      .is("ended_at", null)
      .gt("expires_at", now)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return {
        ok: false,
        message: existingError.message,
      };
    }

    if (existing) {
      return {
        ok: false,
        message: `${gift.name} is already active.`,
      };
    }

    const cooldownHours = 6;

const cooldownSince = new Date(
  Date.now() - cooldownHours * 60 * 60 * 1000,
).toISOString();

const {
  data: recentActivation,
  error: cooldownError,
} = await supabase
  .from("gift_activations")
  .select("activated_at")
  .eq(
    "character_gift_id",
    characterGiftId,
  )
  .gte(
    "activated_at",
    cooldownSince,
  )
  .order(
    "activated_at",
    {
      ascending: false,
    },
  )
  .limit(1)
  .maybeSingle();

if (cooldownError) {
  return {
    ok: false,
    message:
      `Unable to verify Gift cooldown: ${cooldownError.message}`,
  };
}

if (recentActivation) {
  const availableAt =
    new Date(
      new Date(
        recentActivation.activated_at,
      ).getTime() +
        cooldownHours *
          60 *
          60 *
          1000,
    );

  const remainingMs =
    Math.max(
      0,
      availableAt.getTime() -
        Date.now(),
    );

  const remainingHours =
    Math.floor(
      remainingMs /
        (60 * 60 * 1000),
    );

  const remainingMinutes =
    Math.ceil(
      (
        remainingMs %
        (60 * 60 * 1000)
      ) /
        (60 * 1000),
    );

  return {
    ok: false,
    message:
      `${gift.name} is on cooldown. You can use it again in ${
        remainingHours
          ? `${remainingHours}h `
          : ""
      }${remainingMinutes}m.`,
  };
}

    const admin = createPrivilegedClient();

    const {
      data: activation,
      error: activationError,
    } = await admin
      .from("gift_activations")
      .insert({
        character_gift_id: characterGiftId,
        activated_by: user.id,
      })
      .select("id, expires_at")
      .single();

    if (activationError || !activation) {
      return {
        ok: false,
        message:
          activationError?.message ??
          "Unable to activate Gift.",
      };
    }

    try {
      await applyTemporaryGiftActivationHealth({
        activationId: activation.id,
        characterId: character.id,
        vigourModifier:
          gift.vigour_modifier ?? 0,
      });
    } catch (healthError) {
      await admin
        .from("gift_activations")
        .delete()
        .eq("id", activation.id);

      return {
        ok: false,
        message:
          healthError instanceof Error
            ? healthError.message
            : "Gift activation Health could not be applied.",
      };
    }

    try {
      await insertGiftUseMessage({
        supabase,
        characterId: character.id,
        roomId: character.current_room_id!,
        giftName: gift.name,
        giftDescription: gift.description ?? "",
        effectMode: gift.effect_mode,
        durationMinutes: gift.duration_minutes,
      });
    } catch (announcementError) {
      return {
        ok: false,
        message:
          announcementError instanceof Error
            ? announcementError.message
            : "Gift was activated, but its use could not be announced in chat.",
      };
    }

    await touchPresence(
      supabase,
      character.id,
      character.current_room_id,
    );

    revalidatePath("/game");
    revalidatePath("/character");
    revalidatePath("/characters");

    return {
      ok: true,
      message: `${gift.name} activated and used.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to activate Gift.",
    };
  }
}

/**
 * Salva uno status scelto esplicitamente dal giocatore.
 */
export async function updatePresence(
  status: PresenceStatus,
): Promise<PresenceActionResult> {
  if (!isPresenceStatus(status)) {
    return {
      ok: false,
      status: "online",
      message: "Invalid presence status.",
    };
  }

  try {
    const { supabase, character } = await getOwnedCharacter();

    if (!character.current_room_id) {
      return {
        ok: false,
        status,
        message: "Your character has no current room.",
      };
    }

    const { error } = await supabase
      .from("character_presence")
      .upsert(
        {
          character_id: character.id,
          room_id: character.current_room_id,
          status,
          manual_status: status,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: "character_id",
        },
      );

    if (error) {
      return {
        ok: false,
        status,
        message: `Unable to update presence: ${error.message}`,
      };
    }

    revalidatePath("/game");

    return {
      ok: true,
      status,
      message: "Presence updated.",
    };
  } catch (error) {
    return {
      ok: false,
      status,
      message:
        error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}

/**
 * Away automatico per inattività.
 * Modifica solo lo status visibile e conserva manual_status.
 */
export async function setAutomaticAway(): Promise<PresenceActionResult> {
  try {
    const { supabase, character } = await getOwnedCharacter();

    const { error } = await supabase
      .from("character_presence")
      .upsert(
        {
          character_id: character.id,
          room_id: character.current_room_id,
          status: "away",
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: "character_id",
        },
      );

    if (error) {
      return {
        ok: false,
        status: "away",
        message: `Unable to set automatic away status: ${error.message}`,
      };
    }

    return {
      ok: true,
      status: "away",
      message: "Automatic away status set.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "away",
      message:
        error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}

/**
 * Ripristina lo status scelto manualmente dopo un Away automatico.
 */
export async function restoreManualPresence(): Promise<PresenceActionResult> {
  try {
    const { supabase, character } = await getOwnedCharacter();

    const { data: presence, error: readError } = await supabase
      .from("character_presence")
      .select("manual_status")
      .eq("character_id", character.id)
      .maybeSingle();

    if (readError) {
      return {
        ok: false,
        status: "online",
        message: `Unable to read presence: ${readError.message}`,
      };
    }

    const manualStatus = isPresenceStatus(presence?.manual_status)
      ? presence.manual_status
      : "online";

    const { error: updateError } = await supabase
      .from("character_presence")
      .upsert(
        {
          character_id: character.id,
          room_id: character.current_room_id,
          status: manualStatus,
          manual_status: manualStatus,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: "character_id",
        },
      );

    if (updateError) {
      return {
        ok: false,
        status: manualStatus,
        message: `Unable to restore presence: ${updateError.message}`,
      };
    }

    return {
      ok: true,
      status: manualStatus,
      message: "Manual presence restored.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "online",
      message:
        error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}

/**
 * Heartbeat: aggiorna solo last_seen_at e stanza.
 * Non riceve né riscrive lo status.
 */
export async function heartbeatPresence(): Promise<PresenceActionResult> {
  try {
    const {
      supabase,
      character,
    } = await getOwnedCharacter();

    await touchPresence(
      supabase,
      character.id,
      character.current_room_id,
    );

    return {
      ok: true,
      status: "online",
      message:
        "Presence heartbeat updated.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "online",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error.",
    };
  }
}

export async function leaveCurrentRoom(): Promise<void> {
  const {
    supabase,
    character,
  } = await getOwnedCharacter();

  const { error: presenceError } =
    await supabase
      .from("character_presence")
      .upsert(
        {
          character_id:
            character.id,
          room_id: null,
          last_seen_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "character_id",
        },
      );

  if (presenceError) {
    throw new Error(
      `Unable to update presence while leaving the room: ${presenceError.message}`,
    );
  }

  const { error: characterError } =
    await supabase
      .from("characters")
      .update({
        current_room_id: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", character.id);

  if (characterError) {
    throw new Error(
      `Unable to clear the current location: ${characterError.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/game");
  revalidatePath("/characters");
  revalidatePath("/character");

  redirect("/");
}

const VALID_DICE_SIDES = [
  4,
  6,
  8,
  10,
  12,
  20,
  100,
] as const;

type ValidDiceSides =
  (typeof VALID_DICE_SIDES)[number];

type CheckDefinition = {
  label: string;
  attribute: CharacterAttributeKey;
};

const CHECK_DEFINITIONS = {
  unarmed_attack: {
    label: "Unarmed Attack",
    attribute: "muscles",
  },
  melee_attack_muscles: {
    label: "Melee Attack (Muscles)",
    attribute: "muscles",
  },
  melee_attack_reflexes: {
    label: "Melee Attack (Reflexes)",
    attribute: "reflexes",
  },
  ranged_attack: {
    label: "Ranged Attack",
    attribute: "reflexes",
  },
  defend: {
    label: "Defend",
    attribute: "vigor",
  },
  dodge: {
    label: "Dodge",
    attribute: "reflexes",
  },
  use_muscles: {
    label: "Use your Muscles",
    attribute: "muscles",
  },
  use_reflexes: {
    label: "Use your Reflexes",
    attribute: "reflexes",
  },
  use_brains: {
    label: "Use your Brains",
    attribute: "brains",
  },
  use_shrewd: {
    label: "Use your Shrewd",
    attribute: "shrewd",
  },
  use_presence: {
    label: "Use your Presence",
    attribute: "presence_score",
  },
  resist_physical: {
    label: "Resist (Physical)",
    attribute: "vigor",
  },
  resist_shrewd: {
    label: "Resist (Shrewd)",
    attribute: "shrewd",
  },
  resist_brains: {
    label: "Resist (Brains)",
    attribute: "brains",
  },
  resist_presence: {
    label: "Resist (Presence)",
    attribute: "presence_score",
  },
} satisfies Record<string, CheckDefinition>;

type CheckKey =
  keyof typeof CHECK_DEFINITIONS;

function readValidNonce(
  formData: FormData,
): string {
  const nonceRaw = String(
    formData.get("client_nonce") ?? "",
  ).trim();

  const validNonce =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      nonceRaw,
    );

  return validNonce
    ? nonceRaw
    : crypto.randomUUID();
}

async function checkRoomRollCooldown(
  supabase: SupabaseClient,
  characterId: string,
): Promise<ActionState | null> {
  const cooldownStart = new Date(
    Date.now() -
      ROOM_ROLL_COOLDOWN_SECONDS * 1000,
  ).toISOString();

  const {
    data: recentMessage,
    error,
  } = await supabase
    .from("room_messages")
    .select("id")
    .eq("character_id", characterId)
    .gte("created_at", cooldownStart)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message:
        `Unable to verify the roll cooldown: ${error.message}`,
    };
  }

  if (recentMessage) {
    return {
      ok: false,
      message:
        `Please wait ${ROOM_ROLL_COOLDOWN_SECONDS} seconds between actions and rolls.`,
    };
  }

  return null;
}

function isValidDiceSides(
  value: number,
): value is ValidDiceSides {
  return VALID_DICE_SIDES.includes(
    value as ValidDiceSides,
  );
}

function isCheckKey(
  value: string,
): value is CheckKey {
  return value in CHECK_DEFINITIONS;
}

function getAttributeLabel(
  key: CharacterAttributeKey,
): string {
  const labels:
    Record<CharacterAttributeKey, string> = {
      muscles: "Muscles",
      reflexes: "Reflexes",
      vigor: "Vigour",
      brains: "Brains",
      shrewd: "Shrewd",
      presence_score: "Presence",
    };

  return labels[key];
}

export async function sendRoomDiceRoll(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const sides = Number(
      formData.get("dice_sides"),
    );

    if (!isValidDiceSides(sides)) {
      return {
        ok: false,
        message:
          "Choose a valid die before rolling.",
      };
    }

    const {
      supabase,
      character,
    } = await getOwnedCharacter();

    if (!character.current_room_id) {
      return {
        ok: false,
        message:
          "Your character has no current room.",
      };
    }

    const roomId =
      character.current_room_id;

    const cooldown =
      await checkRoomRollCooldown(
        supabase,
        character.id,
      );

    if (cooldown) {
      return cooldown;
    }

    const result = randomInt(
      1,
      sides + 1,
    );

    const clientNonce =
      readValidNonce(formData);

    const { error } = await supabase
      .from("room_messages")
      .insert({
        room_id:
          character.current_room_id,
        character_id:
          character.id,
        message:
          `◆ d${sides} → ${result}`,
        message_type: "dice_roll",
        roll_label: null,
        dice_sides: sides,
        dice_result: result,
        attribute_key: null,
        attribute_value: null,
        roll_total: result,
        client_nonce: clientNonce,
      });

    if (error?.code === "23505") {
      return {
        ok: true,
        message:
          "Roll already received.",
        submittedAt: Date.now(),
      };
    }

    if (error) {
      return {
        ok: false,
        message:
          `Unable to roll the die: ${error.message}`,
      };
    }

    await touchPresence(
      supabase,
      character.id,
      character.current_room_id,
    );

    return {
      ok: true,
      message: `d${sides} rolled.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error.",
    };
  }
}

export async function sendRoomAttributeCheck(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const checkKey = String(
      formData.get("check_key") ?? "",
    ).trim();

    if (!isCheckKey(checkKey)) {
      return {
        ok: false,
        message:
          "Choose a valid check before rolling.",
      };
    }

    const definition =
      CHECK_DEFINITIONS[checkKey];

    const {
      supabase,
      character,
    } = await getOwnedCharacter();

    if (!character.current_room_id) {
      return {
        ok: false,
        message:
          "Your character has no current room.",
      };
    }

    const effectiveAttributes =
      await getEffectiveCharacterAttributes(
        character.id,
        {
          muscles: character.muscles,
          reflexes: character.reflexes,
          vigor: character.vigor,
          brains: character.brains,
          shrewd: character.shrewd,
          presence_score:
            character.presence_score,
        },
      );

    const attributeValue =
      effectiveAttributes[
        definition.attribute
      ];

    if (
      attributeValue === null ||
      !Number.isInteger(attributeValue) ||
      attributeValue < 1
    ) {
      return {
        ok: false,
        message:
          "Your character must have a complete attribute allocation before making checks.",
      };
    }

    const cooldown =
      await checkRoomRollCooldown(
        supabase,
        character.id,
      );

    if (cooldown) {
      return cooldown;
    }

    const result = randomInt(1, 21);
    const total =
      result + attributeValue;

    const attributeLabel =
      getAttributeLabel(
        definition.attribute,
      );

    const clientNonce =
      readValidNonce(formData);

    const { error } = await supabase
      .from("room_messages")
      .insert({
        room_id:
          character.current_room_id,
        character_id:
          character.id,
        message:
          `◆ ${definition.label} · d20(${result}) + ${attributeLabel}(+${attributeValue}) = ${total}`,
        message_type:
          "attribute_check",
        roll_label:
          definition.label,
        dice_sides: 20,
        dice_result: result,
        attribute_key:
          definition.attribute,
        attribute_value:
          attributeValue,
        roll_total: total,
        client_nonce: clientNonce,
      });

    if (error?.code === "23505") {
      return {
        ok: true,
        message:
          "Check already received.",
        submittedAt: Date.now(),
      };
    }

    if (error) {
      return {
        ok: false,
        message:
          `Unable to make the check: ${error.message}`,
      };
    }

    await touchPresence(
      supabase,
      character.id,
      character.current_room_id,
    );

    return {
      ok: true,
      message:
        `${definition.label}: ${total}.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error.",
    };
  }
}