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

  const lastCountRef =
    useRef(initialCount);

  const initialSyncDoneRef =
    useRef(false);

  useEffect(() => {
    setCount(
      initialCount,
    );

    if (
      !initialSyncDoneRef.current
    ) {
      lastCountRef.current =
        initialCount;
    }
  }, [initialCount]);

  const calculateCount =
    useCallback(
      async (): Promise<
        number | null
      > => {
        const supabase =
          createClient();

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          return 0;
        }

        const {
          data: character,
          error:
            characterError,
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
          return 0;
        }

        const {
          data: memberships,
          error:
            membershipError,
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

        if (
          membershipError
        ) {
          console.error(
            "Unable to load private-message memberships:",
            membershipError.message,
          );

          return null;
        }

        const unreadCounts =
          await Promise.all(
            (
              (memberships ??
                []) as MembershipRow[]
            ).map(
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

        return unreadCounts.reduce(
          (
            total,
            current,
          ) =>
            total +
            current,
          0,
        );
      },
      [],
    );

  const refreshCount =
    useCallback(
      async (
        allowSound:
          boolean,
      ) => {
        const nextCount =
          await calculateCount();

        if (
          nextCount === null
        ) {
          return;
        }

        const previousCount =
          lastCountRef.current;

        setCount(nextCount);

        /*
         * OUTSIDE A PRIVATE CONVERSATION:
         * The floating HEADER badge owns the pigeon.
         *
         * We intentionally do not play it while viewing /messages/[id],
         * because ConversationRealtime owns the normal beep there.
         */
        const isInsideConversation =
          /^\/messages\/[^/]+\/?$/.test(
            pathname,
          );

        if (
          allowSound &&
          variant ===
            "floating" &&
          initialSyncDoneRef.current &&
          !isInsideConversation &&
          nextCount >
            previousCount
        ) {
          playPortalSound(
            "private-message",
          );
        }

        lastCountRef.current =
          nextCount;

        initialSyncDoneRef.current =
          true;
      },
      [
        calculateCount,
        pathname,
        playPortalSound,
        variant,
      ],
    );

  useEffect(() => {
    const supabase =
      createClient();

    /*
     * Existing unread PMs are silent on initial load.
     */
    void refreshCount(
      false,
    );

    const safeInstanceId =
      instanceId.replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );

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
          () => {
            /*
             * Same realtime event that updates the header count.
             * If the count rises outside /messages/[id], pigeon.
             */
            void refreshCount(
              true,
            );
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
            void refreshCount(
              false,
            );
          },
        )
        .subscribe();

    const intervalId =
      window.setInterval(
        () => {
          void refreshCount(
            false,
          );
        },
        30_000,
      );

    const handleFocus =
      () => {
        void refreshCount(
          false,
        );
      };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void refreshCount(
            false,
          );
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

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    instanceId,
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
