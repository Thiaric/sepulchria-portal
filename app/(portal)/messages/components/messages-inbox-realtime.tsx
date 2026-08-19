"use client";

import {
  useEffect,
  useId,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

export function MessagesInboxRealtime({
  characterId,
}: {
  characterId: string;
}) {
  const router =
    useRouter();

  const instanceId =
    useId().replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );

  useEffect(() => {
    const supabase =
      createClient();

    let refreshTimer:
      | ReturnType<
          typeof setTimeout
        >
      | null = null;

    function refreshSoon() {
      if (refreshTimer) {
        clearTimeout(
          refreshTimer,
        );
      }

      refreshTimer =
        setTimeout(
          () => {
            router.refresh();
          },
          80,
        );
    }

    const messagesChannel =
      supabase
        .channel(
          `messages-inbox-direct-${characterId}-${instanceId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "direct_messages",
          },
          refreshSoon,
        )
        .subscribe();

    const membershipChannel =
      supabase
        .channel(
          `messages-inbox-membership-${characterId}-${instanceId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "direct_conversation_participants",
            filter:
              `character_id=eq.${characterId}`,
          },
          refreshSoon,
        )
        .subscribe();

    const conversationChannel =
      supabase
        .channel(
          `messages-inbox-conversation-${characterId}-${instanceId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "direct_conversations",
          },
          refreshSoon,
        )
        .subscribe();

    return () => {
      if (refreshTimer) {
        clearTimeout(
          refreshTimer,
        );
      }

      void supabase.removeChannel(
        messagesChannel,
      );

      void supabase.removeChannel(
        membershipChannel,
      );

      void supabase.removeChannel(
        conversationChannel,
      );
    };
  }, [
    characterId,
    instanceId,
    router,
  ]);

  return null;
}
