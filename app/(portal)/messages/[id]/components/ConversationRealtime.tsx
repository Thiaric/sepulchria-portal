"use client";

import {
  useCallback,
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

type PrivateMessageSentEvent =
  CustomEvent<{
    conversationId: string;
  }>;

const PRIVATE_MESSAGE_SENT_EVENT =
  "sepulchria:private-message-sent";

function findConversationScrollBox() {
  const section =
    document.querySelector(
      "main section",
    );

  if (!section) {
    return null;
  }

  const candidates =
    section.querySelectorAll<HTMLElement>(
      "div.overflow-y-auto",
    );

  for (
    const candidate of
    candidates
  ) {
    if (
      candidate.className.includes(
        "max-h-[58vh]",
      )
    ) {
      return candidate;
    }
  }

  return null;
}

export default function ConversationRealtime({
  conversationId,
}: {
  conversationId: string;
}) {
  const router =
    useRouter();

  const {
    playPortalSound,
  } = usePortalAudio();

  const viewerCharacterIdRef =
    useRef<string | null>(
      null,
    );

  const scrollToBottom =
    useCallback(
      (
        behavior:
          ScrollBehavior =
            "auto",
      ) => {
        const attempt =
          () => {
            const container =
              findConversationScrollBox();

            if (!container) {
              return;
            }

            container.scrollTo({
              top:
                container.scrollHeight,
              behavior,
            });
          };

        /*
         * The conversation is server-rendered, so give React a couple of
         * frames to finish painting before measuring scrollHeight.
         */
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              attempt,
            );
          },
        );
      },
      [],
    );

  useEffect(() => {
    /*
     * OPENING A CONVERSATION:
     * always begin at the newest message.
     */
    scrollToBottom("auto");

    const timeoutIds = [
      window.setTimeout(
        () =>
          scrollToBottom(
            "auto",
          ),
        80,
      ),
      window.setTimeout(
        () =>
          scrollToBottom(
            "auto",
          ),
        220,
      ),
    ];

    return () => {
      for (
        const timeoutId of
        timeoutIds
      ) {
        window.clearTimeout(
          timeoutId,
        );
      }
    };
  }, [
    conversationId,
    scrollToBottom,
  ]);

  useEffect(() => {
    /*
     * AFTER THE CURRENT USER SENDS A MESSAGE:
     * MessageComposer fires this event after a successful server action.
     *
     * We retry briefly because the refreshed server component can arrive
     * a fraction after the action state itself.
     */
    const handleOwnMessageSent =
      (
        event: Event,
      ) => {
        const customEvent =
          event as
            PrivateMessageSentEvent;

        if (
          customEvent.detail
            ?.conversationId !==
          conversationId
        ) {
          return;
        }

        scrollToBottom(
          "smooth",
        );

        window.setTimeout(
          () =>
            scrollToBottom(
              "smooth",
            ),
          100,
        );

        window.setTimeout(
          () =>
            scrollToBottom(
              "smooth",
            ),
          300,
        );
      };

    window.addEventListener(
      PRIVATE_MESSAGE_SENT_EVENT,
      handleOwnMessageSent,
    );

    return () => {
      window.removeEventListener(
        PRIVATE_MESSAGE_SENT_EVENT,
        handleOwnMessageSent,
      );
    };
  }, [
    conversationId,
    scrollToBottom,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    let cancelled = false;

    function keepConversationRead() {
      if (cancelled) {
        return;
      }

      void markConversationRead(
        conversationId,
      );
    }

    async function setup() {
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

      if (cancelled) {
        return;
      }

      viewerCharacterIdRef.current =
        character?.id ??
        null;

      keepConversationRead();
    }

    void setup();

    const handleFocus = () => {
      keepConversationRead();
    };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          keepConversationRead();
        }
      };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
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
          (
            payload,
          ) => {
            const inserted =
              payload.new as
                DirectMessageInsert;

            /*
             * OPEN PRIVATE CONVERSATION:
             * incoming message from the other character -> normal beep.
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

            keepConversationRead();

            router.refresh();

            window.setTimeout(
              keepConversationRead,
              120,
            );

            /*
             * If a fresh message arrives while the conversation is open,
             * keep the newest message visible as the refreshed content lands.
             */
            window.setTimeout(
              () =>
                scrollToBottom(
                  "smooth",
                ),
              100,
            );

            window.setTimeout(
              () =>
                scrollToBottom(
                  "smooth",
                ),
              300,
            );
          },
        )
        .subscribe();

    return () => {
      cancelled = true;

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    conversationId,
    playPortalSound,
    router,
    scrollToBottom,
  ]);

  return null;
}
