"use client";

import {
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function ForumTopicRealtime({
  topicId,
}: {
  topicId: string;
}) {
  const router = useRouter();

  const refreshTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  useEffect(() => {
    const supabase =
      createClient();

    function refreshSoon() {
      if (refreshTimer.current) {
        clearTimeout(
          refreshTimer.current,
        );
      }

      refreshTimer.current =
        setTimeout(() => {
          router.refresh();
        }, 100);
    }

    const channel = supabase
      .channel(
        `forum-topic-${topicId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_posts",
          filter:
            `topic_id=eq.${topicId}`,
        },
        refreshSoon,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "forum_posts",
          filter:
            `topic_id=eq.${topicId}`,
        },
        refreshSoon,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "forum_posts",
          filter:
            `topic_id=eq.${topicId}`,
        },
        refreshSoon,
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) {
        clearTimeout(
          refreshTimer.current,
        );
      }

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    topicId,
    router,
  ]);

  return null;
}