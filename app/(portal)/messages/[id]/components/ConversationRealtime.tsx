"use client";

import {
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";
import { createClient } from "@/lib/supabase/client";
import { markConversationRead } from "../../actions";

type DirectMessageInsert = {
  sender_character_id:
    | string
    | null;
};

export default function ConversationRealtime({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();

  const {
    playPortalSound,
  } = usePortalAudio();

  const viewerCharacterIdRef =
    useRef<string | null>(
      null,
    );

  useEffect(() => {
    const supabase =
      createClient();

    let cancelled =
      false;

    async function loadViewerCharacter() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (
        !user ||
        cancelled
      ) {
        return;
      }

      const {
        data: character,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (
        !cancelled &&
        character
      ) {
        viewerCharacterIdRef.current =
          character.id;
      }
    }

    void loadViewerCharacter();
    void markConversationRead(
      conversationId,
    );

    const channel =
      supabase
        .channel(
          `direct-conversation-${conversationId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "direct_messages",
            filter:
              `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const inserted =
              payload.new as
                DirectMessageInsert;

            /*
             * PRIVATE CONVERSATION SOUND:
             * If the other character sends a PM while this conversation is
             * open, use the same proven short beep as the portal notification
             * system. Your own sent messages never beep.
             */
            if (
              viewerCharacterIdRef.current &&
              inserted.sender_character_id !==
                viewerCharacterIdRef.current
            ) {
              playPortalSound(
                "room-message",
              );
            }

            void markConversationRead(
              conversationId,
            );

            router.refresh();
          },
        )
        .subscribe();

    return () => {
      cancelled = true;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    conversationId,
    playPortalSound,
    router,
  ]);

  return null;
}
