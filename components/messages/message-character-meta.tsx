"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { PRESENCE_ACTIVE_MINUTES } from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";

export type MessageCodexIdentity = {
  id: string;
  name: string;
  icon_url: string | null;
  colour: string | null;
};

type Relation<T> =
  | T
  | T[]
  | null;

export function normaliseMessageRelation<T>(
  value: Relation<T>,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export function MessageCharacterIcons({
  race,
  association,
}: {
  race: Relation<MessageCodexIdentity>;
  association: Relation<MessageCodexIdentity>;
}) {
  const raceEntry =
    normaliseMessageRelation(race);

  const associationEntry =
    normaliseMessageRelation(
      association,
    );

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <IdentityIcon
        entry={raceEntry}
        fallback="A"
        labelPrefix="Ancestry"
      />

      <IdentityIcon
        entry={associationEntry}
        fallback="O"
        labelPrefix="Association"
      />
    </div>
  );
}

function IdentityIcon({
  entry,
  fallback,
  labelPrefix,
}: {
  entry: MessageCodexIdentity | null;
  fallback: string;
  labelPrefix: string;
}) {
  const colour =
    entry?.colour ?? "#765937";

  return (
    <span
      title={
        entry
          ? `${labelPrefix}: ${entry.name}`
          : `No ${labelPrefix.toLowerCase()}`
      }
      className="flex h-6 w-6 items-center justify-center overflow-hidden border bg-[#0d0907] font-serif text-[8px]"
      style={{
        borderColor: `${colour}99`,
        color: colour,
      }}
    >
      {entry?.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.icon_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        fallback
      )}
    </span>
  );
}

type PresenceView =
  | PresenceStatus
  | "offline";

type PresenceRow = {
  status: PresenceStatus;
  last_seen_at: string;
};

export function MessagePresenceStatus({
  characterId,
}: {
  characterId: string;
}) {
  const [status, setStatus] =
    useState<PresenceView>(
      "offline",
    );

  const refreshPresence =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from(
          "character_presence",
        )
        .select(
          "status, last_seen_at",
        )
        .eq(
          "character_id",
          characterId,
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Unable to refresh message presence:",
          error.message,
        );
        return;
      }

      const presence =
        data as PresenceRow | null;

      if (!presence) {
        setStatus("offline");
        return;
      }

      const lastSeen =
        Date.parse(
          presence.last_seen_at,
        );

      const activeCutoff =
        Date.now() -
        PRESENCE_ACTIVE_MINUTES *
          60_000;

      if (
        Number.isNaN(lastSeen) ||
        lastSeen < activeCutoff
      ) {
        setStatus("offline");
        return;
      }

      setStatus(
        presence.status,
      );
    }, [characterId]);

  useEffect(() => {
    void refreshPresence();

    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `message-presence-${characterId}`,
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
          () => {
            void refreshPresence();
          },
        )
        .subscribe();

    const intervalId =
      window.setInterval(
        () => {
          void refreshPresence();
        },
        5_000,
      );

    function onVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshPresence();
      }
    }

    document.addEventListener(
      "visibilitychange",
      onVisibility,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      document.removeEventListener(
        "visibilitychange",
        onVisibility,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    characterId,
    refreshPresence,
  ]);

  const presentation =
    presencePresentation(status);

  return (
    <span
      title={presentation.label}
      className={`inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.15em] ${presentation.textClass}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${presentation.dotClass}`}
      />

      {presentation.label}
    </span>
  );
}

function presencePresentation(
  status: PresenceView,
) {
  switch (status) {
    case "online":
      return {
        label: "Online",
        textClass:
          "text-emerald-500",
        dotClass:
          "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.75)]",
      };

    case "away":
      return {
        label: "Away",
        textClass:
          "text-amber-500",
        dotClass:
          "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.65)]",
      };

    case "busy":
      return {
        label: "Busy",
        textClass:
          "text-red-500",
        dotClass:
          "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]",
      };

    default:
      return {
        label: "Offline",
        textClass:
          "text-[#746b60]",
        dotClass:
          "bg-[#5e5850]",
      };
  }
}
