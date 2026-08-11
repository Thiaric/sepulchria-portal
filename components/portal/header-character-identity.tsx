"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import type {
  PortalCharacter,
  PortalPresenceStatus,
} from "@/types/portal";

type HeaderCharacterIdentityProps = {
  character: PortalCharacter;
  initialPresenceStatus: PortalPresenceStatus;
};

const PRESENCE_STYLES: Record<
  PortalPresenceStatus,
  { label: string; dotClass: string }
> = {
  online: {
    label: "Online",
    dotClass:
      "border-[#8eaa68] bg-[#86a85f] shadow-[0_0_7px_rgba(134,168,95,0.55)]",
  },
  away: {
    label: "Away",
    dotClass:
      "border-[#c39a58] bg-[#b78b49] shadow-[0_0_7px_rgba(183,139,73,0.45)]",
  },
  busy: {
    label: "Busy",
    dotClass:
      "border-[#b4675c] bg-[#a94f45] shadow-[0_0_7px_rgba(169,79,69,0.45)]",
  },
};

export function HeaderCharacterIdentity({
  character,
  initialPresenceStatus,
}: HeaderCharacterIdentityProps) {
  const [presenceStatus, setPresenceStatus] =
    useState<PortalPresenceStatus>(initialPresenceStatus);

  useEffect(() => {
    setPresenceStatus(initialPresenceStatus);
  }, [initialPresenceStatus]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`header-character-presence-${character.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_presence",
          filter: `character_id=eq.${character.id}`,
        },
        (payload) => {
          const nextStatus = (
            payload.new as {
              status?: PortalPresenceStatus;
            }
          )?.status;

          if (
            nextStatus === "online" ||
            nextStatus === "away" ||
            nextStatus === "busy"
          ) {
            setPresenceStatus(nextStatus);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [character.id]);

  const presence = PRESENCE_STYLES[presenceStatus];

  return (
    <Link
      href="/character"
      className="hidden min-w-0 items-center gap-2 border-l border-[#5c472f]/60 pl-2 md:flex lg:gap-3 lg:pl-3 2xl:pl-4"
    >
      <div className="flex shrink-0 items-start gap-1.5">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden border border-[#6e5535] bg-[#15100d] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10">
  {character.portrait_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={character.portrait_url}
      alt={`Portrait of ${character.display_name}`}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className="flex h-full items-center justify-center font-serif text-[#a98b61]">
      {character.first_name.slice(0, 1)}
    </span>
  )}

  <span
    title={presence.label}
    aria-label={`Presence: ${presence.label}`}
    className={`absolute left-0.5 top-0.5 z-10 block h-1.5 w-1.5 rounded-full border ${presence.dotClass}`}
  />
</div>

        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          {character.race?.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.race.icon_url}
              alt={character.race.name}
              title={`Ancestry: ${character.race.name}`}
              className="h-4 w-4 object-contain"
            />
          ) : (
            <span className="h-4 w-4" aria-hidden="true" />
          )}

          {character.association?.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.association.icon_url}
              alt={character.association.name}
              title={`Association: ${character.association.name}`}
              className="h-4 w-4 object-contain"
            />
          ) : (
            <span className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="hidden min-w-0 max-w-32 lg:block 2xl:max-w-44">
        <p className="truncate font-serif text-xs text-[#dfc79c] 2xl:text-sm">
          {character.display_name}
        </p>

        <p className="truncate text-[8px] uppercase tracking-[0.14em] text-[#81725f] 2xl:text-[9px] 2xl:tracking-[0.18em]">
          {character.title ||
            character.occupation ||
            "Citizen of Sepulchria"}
        </p>
      </div>
    </Link>
  );
}
