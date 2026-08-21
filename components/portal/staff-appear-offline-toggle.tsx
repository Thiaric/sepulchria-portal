"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  toggleStaffAppearOffline,
} from "@/app/(portal)/game/actions";
import {
  createClient,
} from "@/lib/supabase/client";

export function StaffAppearOfflineToggle({
  characterId,
  initialAppearOffline,
}: {
  characterId: string;
  initialAppearOffline: boolean;
}) {
  const router =
    useRouter();

  const [
    appearOffline,
    setAppearOffline,
  ] = useState(
    initialAppearOffline,
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  useEffect(() => {
    setAppearOffline(
      initialAppearOffline,
    );
  }, [initialAppearOffline]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `staff-appear-offline-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_presence",
            filter:
              `character_id=eq.${characterId}`,
          },
          (payload) => {
            const next =
              payload.new as {
                appear_offline?:
                  boolean;
              };

            if (
              typeof next
                .appear_offline ===
              "boolean"
            ) {
              setAppearOffline(
                next.appear_offline,
              );
            }
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [characterId]);

  async function toggle() {
    if (saving) {
      return;
    }

    const previous =
      appearOffline;

    setSaving(true);
    setAppearOffline(
      !previous,
    );

    try {
      const result =
        await toggleStaffAppearOffline();

      if (!result.ok) {
        setAppearOffline(
          previous,
        );
        console.error(
          result.message,
        );
        return;
      }

      setAppearOffline(
        result.appearOffline,
      );

      router.refresh();
    } catch (error) {
      setAppearOffline(
        previous,
      );

      console.error(
        "Unable to toggle Appear Offline:",
        error,
      );
    } finally {
      setSaving(false);
    }
  }

  const title =
    appearOffline
      ? "Return to previous status"
      : "Appear offline";

  return (
    <button
      type="button"
      disabled={saving}
      onClick={() => {
        void toggle();
      }}
      aria-pressed={
        appearOffline
      }
      aria-label={title}
      title={title}
      className={`flex h-8 w-8 items-center justify-center border bg-[rgb(var(--sep-colour-17120f))] transition sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 ${
        appearOffline
          ? "border-[rgb(var(--sep-colour-78674f))] text-[rgb(var(--sep-colour-9d8d76))] hover:border-[rgb(var(--sep-colour-9b8464))] hover:text-[rgb(var(--sep-colour-c7b69b))]"
          : "border-[rgb(var(--sep-colour-614b31))] text-[rgb(var(--sep-colour-c69b5c))] hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))]"
      } disabled:cursor-wait disabled:opacity-50`}
    >
      {appearOffline ? (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="7.5"
            r="3.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="1.8 1.8"
          />
          <path
            d="M5.5 19c.45-4.05 2.7-6.2 6.5-6.2s6.05 2.15 6.5 6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="1.8 1.8"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="7.5"
            r="3.25"
            fill="currentColor"
          />
          <path
            d="M5.5 19c.45-4.05 2.7-6.2 6.5-6.2s6.05 2.15 6.5 6.2H5.5Z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}
