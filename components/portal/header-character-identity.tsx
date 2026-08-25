"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { HeaderOrderIcon } from "@/components/portal/header-order-icon";
import { openPortalModal } from "@/components/portal/portal-modal-button";
import type {
  PortalCharacter,
  PortalPresenceStatus,
} from "@/types/portal";

type HeaderCharacterIdentityProps = {
  userId: string;
  character: PortalCharacter | null;
  initialPresenceStatus: PortalPresenceStatus;
};

const PRESENCE_STYLES: Record<
  PortalPresenceStatus,
  {
    label: string;
    dotClass: string;
  }
> = {
  online: {
    label: "Online",
    dotClass:
      
      "border-emerald-400 bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.65)]",
  },

  away: {
    label: "Away",
    dotClass:
      
      "border-amber-400 bg-amber-500 shadow-[0_0_7px_rgba(245,158,11,0.60)]",
  },

  busy: {
    label: "Busy",
    dotClass:
      
      "border-red-400 bg-red-500 shadow-[0_0_7px_rgba(239,68,68,0.60)]",
  },
};

export function HeaderCharacterIdentity({
  userId,
  character,
  initialPresenceStatus,
}: HeaderCharacterIdentityProps) {
  const router = useRouter();
  const [
    presenceStatus,
    setPresenceStatus,
  ] =
    useState<PortalPresenceStatus>(
      initialPresenceStatus,
    );

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    setPresenceStatus(
      initialPresenceStatus,
    );
  }, [initialPresenceStatus]);

  useEffect(() => {
    const supabase =
      createClient();

    let cancelled = false;
    let initialised = false;
    let lastId: string | null =
      character?.id ?? null;
    let lastUpdatedAt: string | null =
      null;

    async function checkCharacterRecord() {
      const {
        data,
        error,
      } = await supabase
        .from("characters")
        .select(
          "id, updated_at",
        )
        .eq(
          "user_id",
          userId,
        )
        .maybeSingle();

      if (
        cancelled ||
        error
      ) {
        if (error) {
          console.error(
            "Unable to refresh header character identity:",
            error.message,
          );
        }

        return;
      }

      const nextId =
        data?.id ?? null;
      const nextUpdatedAt =
        data?.updated_at ?? null;

      if (!initialised) {
        initialised = true;

        const identityChanged =
          nextId !== lastId;

        lastId = nextId;
        lastUpdatedAt =
          nextUpdatedAt;

        if (identityChanged) {
          router.refresh();
        }

        return;
      }

      if (
        nextId !== lastId ||
        nextUpdatedAt !==
          lastUpdatedAt
      ) {
        lastId = nextId;
        lastUpdatedAt =
          nextUpdatedAt;

        router.refresh();
      }
    }

    void checkCharacterRecord();

    const channel =
      supabase
        .channel(
          `header-character-record-${userId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "characters",
            filter:
              `user_id=eq.${userId}`,
          },
          (payload) => {
            const next =
              payload.new as {
                id?: string;
                updated_at?: string;
              };

            if (next?.id) {
              lastId =
                next.id;
            }

            if (
              next?.updated_at
            ) {
              lastUpdatedAt =
                next.updated_at;
            }

            router.refresh();
          },
        )
        .subscribe();

    const interval =
      window.setInterval(
        () => {
          void checkCharacterRecord();
        },
        5000,
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void checkCharacterRecord();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval,
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
    character?.id,
    router,
    userId,
  ]);

  useEffect(() => {
    if (!character) {
      return;
    }

    const supabase =
      createClient();

    const channel = supabase
      .channel(
        `header-character-presence-${character.id}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_presence",
          filter:
            `character_id=eq.${character.id}`,
        },
        (payload) => {
          const nextStatus = (
            payload.new as {
              status?: PortalPresenceStatus;
            }
          )?.status;

          if (
            nextStatus ===
              "online" ||
            nextStatus ===
              "away" ||
            nextStatus ===
              "busy"
          ) {
            setPresenceStatus(
              nextStatus,
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
  }, [character?.id]);

  async function changePresence(
    nextStatus: PortalPresenceStatus,
  ) {
    if (
      !character ||
      saving ||
      nextStatus === presenceStatus
    ) {
      return;
    }

    setSaving(true);

    const previousStatus =
      presenceStatus;

    /*
     * Update immediately in the UI.
     * Realtime will then confirm the
     * database value.
     */
    setPresenceStatus(
      nextStatus,
    );

    const supabase =
      createClient();

    /*
     * Read the existing room first.
     *
     * This is important: changing your
     * manual status must NEVER move you
     * out of your current location.
     */
    const {
      data: existingPresence,
      error: readError,
    } = await supabase
      .from(
        "character_presence",
      )
      .select("room_id")
      .eq(
        "character_id",
        character.id,
      )
      .maybeSingle();

    if (readError) {
      console.error(
        "Unable to read current presence:",
        readError.message,
      );

      setPresenceStatus(
        previousStatus,
      );
      setSaving(false);
      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from(
        "character_presence",
      )
      .upsert(
        {
          character_id:
            character.id,

          room_id:
            existingPresence?.room_id ??
            null,

          status: nextStatus,
manual_status: nextStatus,

last_seen_at:
  new Date().toISOString(),
        },
        {
          onConflict:
            "character_id",
        },
      );

    if (updateError) {
      console.error(
        "Unable to update presence:",
        updateError.message,
      );

      setPresenceStatus(
        previousStatus,
      );
    }

    setSaving(false);
  }

  if (!character) {
    return (
      <Link
        href="/character/create"
        className="hidden text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-c59a5a))] md:block 2xl:text-xs 2xl:tracking-[0.18em]"
      >
        Create character
      </Link>
    );
  }

  const presence =
    PRESENCE_STYLES[
      presenceStatus
    ];

  return (
  <div className="flex min-w-0 items-center gap-1.5 border-l border-[rgb(var(--sep-colour-5c472f))]/60 pl-2 lg:gap-2 lg:pl-3 2xl:pl-4">
    <div className="relative h-8 w-8 shrink-0 sm:h-9 sm:w-9 2xl:h-10 2xl:w-10">
  <button
    type="button"
    disabled={saving}
    aria-label={`Presence: ${presence.label}`}
    title={`Presence: ${presence.label}`}
    onClick={() => {
      const nextStatus: PortalPresenceStatus =
        presenceStatus === "online"
          ? "away"
          : presenceStatus === "away"
            ? "busy"
            : "online";

      void changePresence(nextStatus);
    }}
    className="
      flex
      h-full
      w-full
      flex-col
      items-center
      justify-center
      gap-[3px]
      border
      border-[rgb(var(--sep-colour-60482e))]/60
      bg-[rgb(var(--sep-colour-17110d))]
      transition
      hover:border-[rgb(var(--sep-colour-8b6940))]
      hover:bg-[rgb(var(--sep-colour-1d160f))]
      disabled:cursor-wait
      disabled:opacity-50
    "
  >
    <span
      className={`block h-2 w-2 rounded-full border ${presence.dotClass}`}
    />

    <span className="text-[7px] uppercase leading-none tracking-[0.08em] text-[rgb(var(--sep-colour-aa9677))]">
      {presenceStatus === "online"
        ? "Online"
        : presenceStatus === "away"
          ? "Away"
          : "Busy"}
    </span>
  </button>
</div>

    <button
      type="button"
      title="Open character sheet"
      aria-label={`Open ${character.display_name} character sheet`}
      onClick={() =>
        openPortalModal({
          label: character.display_name,
          title: "Your character sheet",
          icon:
            character.portrait_url ??
            "/icons/characters.png",
          href: "/character",
        })
      }
      className="flex min-w-0 items-center gap-2 text-left lg:gap-3"
    >
      <div className="flex shrink-0 items-start gap-1.5">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-6e5535))] bg-[rgb(var(--sep-colour-15100d))] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10">
          {character.portrait_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                character.portrait_url
              }
              alt={`Portrait of ${character.display_name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center font-serif text-[rgb(var(--sep-colour-a98b61))]">
              {character.first_name.slice(
                0,
                1,
              )}
            </span>
          )}

          
        </div>

        <div className="hidden shrink-0 flex-col items-center gap-1 pt-0.5 sm:flex">
          {character.race
            ?.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                character.race
                  .icon_url
              }
              alt={
                character.race.name
              }
              title={`Ancestry: ${character.race.name}`}
              className="h-4 w-4 object-contain"
            />
          ) : (
            <span
              className="h-4 w-4"
              aria-hidden="true"
            />
          )}

          <HeaderOrderIcon
            characterId={character.id}
          />
        </div>
      </div>

      
    </button>
  </div>
);
}