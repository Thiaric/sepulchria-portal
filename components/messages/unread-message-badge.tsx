"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  usePathname,
} from "next/navigation";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";
import { createClient } from "@/lib/supabase/client";

type UnreadMessageBadgeProps = {
  initialCount: number;
  variant:
    | "floating"
    | "inline";
};

type MembershipRow = {
  conversation_id: string;
  last_read_at:
    | string
    | null;
};

type DirectMessageInsert = {
  conversation_id: string;
  sender_character_id:
    | string
    | null;
};

export function UnreadMessageBadge({
  initialCount,
  variant,
}: UnreadMessageBadgeProps) {
  const instanceId =
    useId();

  const pathname =
    usePathname();

  const {
    playPortalSound,
  } = usePortalAudio();

  const [count, setCount] =
    useState(initialCount);

  const characterIdRef =
    useRef<string | null>(
      null,
    );

  const conversationIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const loadIdentity =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        characterIdRef.current =
          null;

        conversationIdsRef.current =
          new Set();

        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        characterIdRef.current =
          null;

        conversationIdsRef.current =
          new Set();

        return;
      }

      characterIdRef.current =
        character.id;

      const {
        data: memberships,
      } = await supabase
        .from(
          "direct_conversation_participants",
        )
        .select(
          "conversation_id",
        )
        .eq(
          "character_id",
          character.id,
        );

      conversationIdsRef.current =
        new Set(
          (
            memberships ??
            []
          ).map(
            (row) =>
              row.conversation_id,
          ),
        );
    }, []);

  const refreshCount =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setCount(0);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        setCount(0);
        return;
      }

      characterIdRef.current =
        character.id;

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from(
          "direct_conversation_participants",
        )
        .select(
          "conversation_id, last_read_at",
        )
        .eq(
          "character_id",
          character.id,
        )
        .is(
          "archived_at",
          null,
        );

      if (membershipError) {
        console.error(
          "Unable to load private-message memberships:",
          membershipError.message,
        );
        return;
      }

      const rows =
        (
          memberships ??
          []
        ) as MembershipRow[];

      conversationIdsRef.current =
        new Set(
          rows.map(
            (row) =>
              row.conversation_id,
          ),
        );

      const unreadCounts =
        await Promise.all(
          rows.map(
            async (
              membership,
            ) => {
              let query =
                supabase
                  .from(
                    "direct_messages",
                  )
                  .select(
                    "id",
                    {
                      count:
                        "exact",
                      head: true,
                    },
                  )
                  .eq(
                    "conversation_id",
                    membership.conversation_id,
                  )
                  .neq(
                    "sender_character_id",
                    character.id,
                  );

              if (
                membership.last_read_at
              ) {
                query =
                  query.gt(
                    "created_at",
                    membership.last_read_at,
                  );
              }

              const {
                count:
                  unreadCount,
                error,
              } =
                await query;

              if (error) {
                console.error(
                  "Unable to count unread private messages:",
                  error.message,
                );

                return 0;
              }

              return (
                unreadCount ??
                0
              );
            },
          ),
        );

      setCount(
        unreadCounts.reduce(
          (
            total,
            current,
          ) =>
            total +
            current,
          0,
        ),
      );
    }, []);

  useEffect(() => {
    const supabase =
      createClient();

    let cancelled =
      false;

    const safeInstanceId =
      instanceId.replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );

    async function start() {
      /*
       * Load the current character BEFORE subscribing, so the first incoming
       * PM can be classified immediately.
       */
      await loadIdentity();

      if (cancelled) {
        return;
      }

      await refreshCount();

      if (cancelled) {
        return;
      }

      const channel =
        supabase
          .channel(
            `unread-private-messages-${variant}-${safeInstanceId}`,
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table:
                "direct_messages",
            },
            (
              payload,
            ) => {
              const inserted =
                payload.new as
                  DirectMessageInsert;

              const currentCharacterId =
                characterIdRef.current;

              const isInsideConversation =
                /^\/messages\/[^/]+\/?$/.test(
                  pathname,
                );

              /*
               * PIGEON:
               * - header floating badge only
               * - recipient is NOT inside an open PM conversation
               * - sender is another character
               * - conversation belongs to this character
               *
               * No unread-count comparison controls the sound.
               */
              if (
                variant ===
                  "floating" &&
                !isInsideConversation &&
                currentCharacterId &&
                inserted.sender_character_id !==
                  currentCharacterId &&
                conversationIdsRef.current.has(
                  inserted.conversation_id,
                )
              ) {
                playPortalSound(
                  "private-message",
                );
              }

              void refreshCount();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "direct_conversation_participants",
            },
            () => {
              void loadIdentity();
              void refreshCount();
            },
          )
          .subscribe();

      cleanupChannelRef.current =
        channel;
    }

    const cleanupChannelRef:
      {
        current:
          | ReturnType<
              typeof supabase.channel
            >
          | null;
      } = {
        current: null,
      };

    void start();

    const intervalId =
      window.setInterval(
        () => {
          void refreshCount();
        },
        30_000,
      );

    const handleFocus =
      () => {
        void refreshCount();
      };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void refreshCount();
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

    return () => {
      cancelled = true;

      window.clearInterval(
        intervalId,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      if (
        cleanupChannelRef.current
      ) {
        void supabase.removeChannel(
          cleanupChannelRef.current,
        );
      }
    };
  }, [
    instanceId,
    loadIdentity,
    pathname,
    playPortalSound,
    refreshCount,
    variant,
  ]);

  if (count <= 0) {
    return null;
  }

  const label =
    count > 9
      ? "9+"
      : String(count);

  const title =
    `${count} unread private message${
      count === 1
        ? ""
        : "s"
    }`;

  if (
    variant ===
    "floating"
  ) {
    return (
      <span
        title={title}
        aria-label={title}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[8px] font-bold leading-none text-[#ffe1ac] shadow-[0_0_10px_rgba(209,154,76,0.32)]"
      >
        {label}
      </span>
    );
  }

  return (
    <span
      title={title}
      aria-label={title}
      className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[7px] font-bold leading-none text-[#ffe1ac]"
    >
      {label}
    </span>
  );
}
