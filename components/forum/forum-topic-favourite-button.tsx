"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type ForumTopicFavouriteButtonProps = {
  topicId: string;
  className?: string;
  compact?: boolean;
};

export function ForumTopicFavouriteButton({
  topicId,
  className = "",
  compact = false,
}: ForumTopicFavouriteButtonProps) {
  const [favourite, setFavourite] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);

  const loadFavourite =
    useCallback(async () => {
      const supabase = createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setFavourite(false);
        setLoading(false);
        return;
      }

      const { data, error } =
        await supabase
          .from(
            "forum_topic_favourites",
          )
          .select("topic_id")
          .eq("user_id", user.id)
          .eq("topic_id", topicId)
          .maybeSingle();

      if (error) {
        console.error(
          "Unable to load forum favourite:",
          error.message,
        );
        setLoading(false);
        return;
      }

      setFavourite(Boolean(data));
      setLoading(false);
    }, [topicId]);

  useEffect(() => {
    void loadFavourite();

    function handleChanged(
      event: Event,
    ) {
      const custom =
        event as CustomEvent<{
          topicId?: string;
        }>;

      if (
        !custom.detail?.topicId ||
        custom.detail.topicId ===
          topicId
      ) {
        void loadFavourite();
      }
    }

    window.addEventListener(
      "sepulchria:forum-favourite-changed",
      handleChanged,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:forum-favourite-changed",
        handleChanged,
      );
    };
  }, [loadFavourite, topicId]);

  async function toggleFavourite() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      if (favourite) {
        const { error } =
          await supabase
            .from(
              "forum_topic_favourites",
            )
            .delete()
            .eq("user_id", user.id)
            .eq("topic_id", topicId);

        if (error) {
          throw error;
        }

        setFavourite(false);
      } else {
        const { error } =
          await supabase
            .from(
              "forum_topic_favourites",
            )
            .insert({
              user_id: user.id,
              topic_id: topicId,
            });

        if (error) {
          throw error;
        }

        setFavourite(true);
      }

      window.dispatchEvent(
        new CustomEvent(
          "sepulchria:forum-favourite-changed",
          {
            detail: { topicId },
          },
        ),
      );
    } catch (error) {
      console.error(
        "Unable to update forum favourite:",
        error,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() =>
        void toggleFavourite()
      }
      disabled={loading || saving}
      aria-pressed={favourite}
      aria-label={
        favourite
          ? "Remove topic from favourites"
          : "Add topic to favourites"
      }
      title={
        favourite
          ? "Remove from favourites"
          : "Add to favourites"
      }
      className={[
        compact
          ? "flex h-8 w-8 items-center justify-center"
          : "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap border border-[#9a7445]/70 bg-[#17110d] px-4 text-[8px] uppercase tracking-[0.16em]",
        "text-[#c8ae83] transition hover:bg-[#21170f] hover:text-[#ead4ad] disabled:cursor-wait disabled:opacity-45",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={
          compact
            ? "text-xl leading-none"
            : "text-base leading-none"
        }
      >
        {favourite ? "★" : "☆"}
      </span>

      {!compact ? (
        <span>Favourite</span>
      ) : null}
    </button>
  );
}
