"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";

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

  const [count, setCount] =
    useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const refreshCount =
    useCallback(async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        setCount(0);
        return;
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
        .is("archived_at", null);

      if (membershipError) {
        console.error(
          "Unable to load private-message memberships:",
          membershipError.message,
        );
        return;
      }

      const unreadCounts =
        await Promise.all(
          (
            (memberships ??
              []) as MembershipRow[]
          ).map(async (membership) => {
            let query = supabase
              .from("direct_messages")
              .select("id", {
                count: "exact",
                head: true,
              })
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
              query = query.gt(
                "created_at",
                membership.last_read_at,
              );
            }

            const {
              count: conversationCount,
              error,
            } = await query;

            if (error) {
              console.error(
                "Unable to count unread private messages:",
                error.message,
              );

              return 0;
            }

            return conversationCount ?? 0;
          }),
        );

      setCount(
        unreadCounts.reduce(
          (total, current) =>
            total + current,
          0,
        ),
      );
    }, []);

  useEffect(() => {
    const supabase = createClient();

    void refreshCount();

    const safeInstanceId =
      instanceId.replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );

    const channel = supabase
      .channel(
        `unread-private-messages-${variant}-${safeInstanceId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        () => {
          void refreshCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table:
            "direct_conversation_participants",
        },
        () => {
          void refreshCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "direct_conversation_participants",
        },
        () => {
          void refreshCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table:
            "direct_conversation_participants",
        },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    const intervalId =
      window.setInterval(() => {
        void refreshCount();
      }, 30_000);

    const handleFocus = () => {
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
    count > 9 ? "9+" : String(count);

  const title = `${count} unread private message${
    count === 1 ? "" : "s"
  }`;

  if (variant === "floating") {
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
