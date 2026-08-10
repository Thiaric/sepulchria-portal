"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";
import { createClient } from "@/lib/supabase/client";

type DirectMessageInsert = {
  conversation_id: string;
  sender_character_id:
    | string
    | null;
  created_at: string;
};

type RoomMessageInsert = {
  room_id: string;
  character_id: string;
  message_type: string;
  whisper_recipient_character_id:
    | string
    | null;
  created_at: string;
};

export function PortalMessageSoundListener({
  characterId,
  currentRoomId,
}: {
  characterId: string | null;
  currentRoomId: string | null;
}) {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const {
    playPortalSound,
  } = usePortalAudio();

  const mountedAtRef =
    useRef(Date.now());

  useEffect(() => {
    if (!characterId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `portal-private-sound-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "direct_messages",
          },
          async (payload) => {
            const inserted =
              payload.new as
                DirectMessageInsert;

            if (
              !inserted ||
              inserted.sender_character_id ===
                characterId ||
              Date.parse(
                inserted.created_at,
              ) <
                mountedAtRef.current -
                  2000
            ) {
              return;
            }

            const {
              data: membership,
              error,
            } = await supabase
              .from(
                "direct_conversation_participants",
              )
              .select(
                "conversation_id",
              )
              .eq(
                "conversation_id",
                inserted.conversation_id,
              )
              .eq(
                "character_id",
                characterId,
              )
              .maybeSingle();

            if (
              error ||
              !membership
            ) {
              return;
            }

            playPortalSound(
              "private-message",
            );
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    characterId,
    playPortalSound,
    supabase,
  ]);

  useEffect(() => {
    if (
      !characterId ||
      !currentRoomId
    ) {
      return;
    }

    const channel =
      supabase
        .channel(
          `portal-room-sound-${currentRoomId}-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "room_messages",
            filter:
              `room_id=eq.${currentRoomId}`,
          },
          (payload) => {
            const inserted =
              payload.new as
                RoomMessageInsert;

            if (
              !inserted ||
              inserted.character_id ===
                characterId ||
              Date.parse(
                inserted.created_at,
              ) <
                mountedAtRef.current -
                  2000
            ) {
              return;
            }

            if (
              inserted.message_type ===
                "dice_roll" ||
              inserted.message_type ===
                "attribute_check"
            ) {
              return;
            }

            if (
              inserted.message_type ===
                "whisper" &&
              inserted.whisper_recipient_character_id !==
                characterId
            ) {
              return;
            }

            playPortalSound(
              "room-message",
            );
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    characterId,
    currentRoomId,
    playPortalSound,
    supabase,
  ]);

  return null;
}
