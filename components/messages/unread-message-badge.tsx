"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";
import { createClient } from "@/lib/supabase/client";

type UnreadMessageBadgeProps = {
  initialCount: number;
  variant: "floating" | "inline";
};

type MembershipRow = {
  conversation_id: string;
  last_read_at: string | null;
};

export function UnreadMessageBadge({
  initialCount,
  variant,
}: UnreadMessageBadgeProps) {
  const instanceId = useId();
  const pathname = usePathname();

  const currentConversationId =
    pathname.match(
      /^\/messages\/([^/]+)\/?$/,
    )?.[1] ?? null;

  const {
    playPortalSound,
  } = usePortalAudio();

  const [count, setCount] =
    useState(initialCount);

  /*
   * The last unread total already accounted for by the notification system.
   *
   * Important:
   * - initial load sets this silently;
   * - reading messages may LOWER it;
   * - a silent/background refresh is NEVER allowed to raise it;
   * - only a notification-capable refresh raises it.
   *
   * Therefore polling cannot "swallow" a pigeon notification.
   */
  const notifiedCountRef =
    useRef(initialCount);

  const initialisedRef =
    useRef(false);

  const refreshInFlightRef =
    useRef(false);

  useEffect(() => {
    setCount(initialCount);

    if (!initialisedRef.current) {
      notifiedCountRef.current =
        initialCount;
    }
  }, [initialCount]);

  const calculateUnreadCount =
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
          return 0;
        }

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
          )
          .is(
            "deleted_at",
            null,
          );

        if (membershipError) {
          console.error(
            "Unable to load private-message memberships:",
            membershipError.message,
          );

          return null;
        }

        const rows =
          (
            memberships ??
            []
          ) as MembershipRow[];

        const countableRows =
          currentConversationId
            ? rows.filter(
                (membership) =>
                  membership.conversation_id !==
                  currentConversationId,
              )
            : rows;

        const unreadCounts =
          await Promise.all(
            countableRows.map(
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
            total + current,
          0,
        );
      },
      [currentConversationId],
    );

  const refreshCount =
    useCallback(
      async ({
        notify,
        initial = false,
      }: {
        notify: boolean;
        initial?: boolean;
      }) => {
        /*
         * Avoid overlapping poll + realtime calculations.
         * The next 5-second poll will catch anything that arrives during one.
         */
        if (
          refreshInFlightRef.current
        ) {
          return;
        }

        refreshInFlightRef.current =
          true;

        try {
          const nextCount =
            await calculateUnreadCount();

          if (
            nextCount === null
          ) {
            return;
          }

          setCount(nextCount);

          if (initial) {
            /*
             * Existing unread mail must never make a sound on page load.
             */
            notifiedCountRef.current =
              nextCount;

            initialisedRef.current =
              true;

            return;
          }

          /*
           * Reading / archiving messages lowers the baseline immediately.
           */
          if (
            nextCount <
            notifiedCountRef.current
          ) {
            notifiedCountRef.current =
              nextCount;

            return;
          }

          const isInsideConversation =
            /^\/messages\/[^/]+\/?$/.test(
              pathname,
            );

          const hasNewUnread =
            initialisedRef.current &&
            nextCount >
              notifiedCountRef.current;

          /*
           * PRIVATE MESSAGE PIGEON:
           *
           * This is intentionally driven by the ACTUAL unread total,
           * not by whether Supabase Realtime happened to deliver an event.
           *
           * Therefore:
           * - realtime works -> pigeon immediately;
           * - realtime fails -> 5-second poll detects the rise and pigeons;
           * - no double pigeon because notifiedCountRef is advanced here.
           */
          if (
            notify &&
            variant ===
              "floating" &&
            !isInsideConversation &&
            hasNewUnread
          ) {
            /*
             * Advance the baseline BEFORE playing, preventing a concurrent
             * refresh from making the same notification twice.
             */
            notifiedCountRef.current =
              nextCount;

            playPortalSound(
              "private-message",
            );

            return;
          }

          /*
           * If we are inside an open PM conversation, the conversation's own
           * realtime component owns the normal beep. Do not queue a pigeon
           * for later when navigating away.
           */
          if (
            isInsideConversation &&
            nextCount >
              notifiedCountRef.current
          ) {
            notifiedCountRef.current =
              nextCount;
          }

          /*
           * Silent refreshes are deliberately NOT allowed to raise the
           * baseline outside a conversation. If they discover a new unread
           * message first, the next notification-capable 5-second poll will
           * still play the pigeon.
           */
        } finally {
          refreshInFlightRef.current =
            false;
        }
      },
      [
        calculateUnreadCount,
        pathname,
        playPortalSound,
        variant,
      ],
    );

  useEffect(() => {
    const supabase =
      createClient();

    /*
     * First sync: silent.
     */
    void refreshCount({
      notify: false,
      initial: true,
    });

    const safeInstanceId =
      instanceId.replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );

    /*
     * Keep Realtime as the fastest route when it works.
     * It is no longer required for the pigeon to function.
     */
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
            void refreshCount({
              notify: true,
            });
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
            /*
             * Reads / archive changes should update the number,
             * but should not themselves create a sound.
             */
            void refreshCount({
              notify: false,
            });
          },
        )
        .subscribe();

    /*
     * HARD FALLBACK:
     * Every 5 seconds we check the real unread total AND allow notification.
     *
     * This is the crucial fix missing from the previous implementation.
     */
    const intervalId =
      window.setInterval(
        () => {
          void refreshCount({
            notify: true,
          });
        },
        5_000,
      );

    const handleFocus =
      () => {
        /*
         * If the browser throttled timers while hidden, catch the unread
         * increase immediately when the user returns.
         */
        void refreshCount({
          notify: true,
        });
      };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void refreshCount({
            notify: true,
          });
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
      count === 1 ? "" : "s"
    }`;

  if (
    variant ===
    "floating"
  ) {
    return (
      <span data-sep-counter-badge="true"
        title={title}
        aria-label={title}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[8px] font-bold leading-none text-[#ffe1ac] shadow-[0_0_10px_rgba(209,154,76,0.32)]"
      >
        {label}
      </span>
    );
  }

  return (
    <span data-sep-counter-badge="true"
      title={title}
      aria-label={title}
      className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[7px] font-bold leading-none text-[#ffe1ac]"
    >
      {label}
    </span>
  );
}
