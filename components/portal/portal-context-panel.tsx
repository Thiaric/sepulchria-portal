"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { GameContextPanel } from "@/components/portal/game-context-panel";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";
import type { PortalContext } from "@/types/portal";

type PortalContextPanelProps = {
  context: PortalContext;
};

export function PortalContextPanel({
  context,
}: PortalContextPanelProps) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <DashboardContext context={context} />;
  }

  if (
    pathname === "/game" ||
    pathname.startsWith("/game/")
  ) {
    return <GameContext context={context} />;
  }

  if (
    pathname === "/character" ||
    pathname.startsWith("/character/")
  ) {
    return <CharacterContext context={context} />;
  }

  if (
    pathname === "/characters" ||
    pathname.startsWith("/characters/")
  ) {
    return <CharacterArchiveContext />;
  }

  if (
    pathname === "/races" ||
    pathname.startsWith("/races/")
  ) {
    return (
      <CodexContext
        eyebrow="Codex"
        title="Races"
        description="The peoples and lineages of Asteros, their origins and their relationship with the Current."
        primaryHref="/races"
        primaryLabel="Browse races"
        secondaryHref="/associations"
        secondaryLabel="View associations"
      />
    );
  }

  if (
    pathname === "/associations" ||
    pathname.startsWith("/associations/")
  ) {
    return (
      <CodexContext
        eyebrow="Codex"
        title="Associations"
        description="The eleven civic bodies that shape Sepulchria's professions, laws, beliefs and daily life."
        primaryHref="/associations"
        primaryLabel="Browse associations"
        secondaryHref="/races"
        secondaryLabel="View races"
      />
    );
  }

  const adminCharacterMatch =
    pathname.match(
      /^\/admin\/characters\/([0-9a-f-]+)$/i,
    );

  if (adminCharacterMatch) {
    return (
      <AdminCharacterHistoryContext
        characterId={
          adminCharacterMatch[1]
        }
      />
    );
  }

  if (
    pathname === "/messages" ||
    pathname.startsWith("/messages/")
  ) {
    return <MessagesContext context={context} />;
  }

  return <DefaultContext />;
}

type CharacterStatusHistoryEntry = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
};

type AdminCharacterSummary = {
  display_name: string | null;
  first_name: string;
  surname: string;
};

function AdminCharacterHistoryContext({
  characterId,
}: {
  characterId: string;
}) {
  const [entries, setEntries] =
    useState<CharacterStatusHistoryEntry[]>(
      [],
    );

  const [characterName, setCharacterName] =
    useState("Character");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadHistory = useCallback(
    async () => {
      const supabase = createClient();

      const [
        characterResult,
        historyResult,
      ] = await Promise.all([
        supabase
          .from("characters")
          .select(
            "display_name, first_name, surname",
          )
          .eq("id", characterId)
          .maybeSingle(),

        supabase
          .from(
            "character_status_history",
          )
          .select(
            `
              id,
              old_status,
              new_status,
              changed_by,
              reason,
              created_at
            `,
          )
          .eq(
            "character_id",
            characterId,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(30),
      ]);

      const firstError =
        characterResult.error ??
        historyResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const character =
        characterResult.data as
          | AdminCharacterSummary
          | null;

      if (character) {
        setCharacterName(
          character.display_name?.trim() ||
            `${character.first_name} ${character.surname}`.trim() ||
            "Character",
        );
      }

      setEntries(
        (historyResult.data ??
          []) as CharacterStatusHistoryEntry[],
      );

      setError(null);
      setLoading(false);
    },
    [characterId],
  );

  useEffect(() => {
    setLoading(true);
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        `admin-character-history:${characterId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "character_status_history",
          filter: `character_id=eq.${characterId}`,
        },
        () => {
          void loadHistory();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [characterId, loadHistory]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Administration"
        title={characterName}
      />

      <div className="mb-4 flex items-center justify-between gap-3 border-y border-[#59432c]/35 py-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#876a46]">
            Status history
          </p>

          <p className="mt-1 text-[11px] text-[#8f8271]">
            Latest recorded changes
          </p>
        </div>

        <span className="flex h-7 min-w-7 items-center justify-center border border-[#59432c]/50 bg-[#100c09] px-2 text-[10px] text-[#b2956f]">
          {entries.length}
        </span>
      </div>

      {error ? (
        <p className="border border-[#743d35] bg-[#2a1512] p-3 text-[11px] leading-5 text-[#d8a49a]">
          The character history could not
          be loaded: {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <HistoryLoading />
        ) : (
          entries.map((entry) => (
            <StatusHistoryCard
              key={entry.id}
              entry={entry}
            />
          ))
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-3 text-[11px] leading-5 text-[#8f8271]">
            No status changes have been
            recorded for this character yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatusHistoryCard({
  entry,
}: {
  entry: CharacterStatusHistoryEntry;
}) {
  const statusStyles: Record<
    string,
    string
  > = {
    draft:
      "border-stone-600/60 text-stone-400",
    submitted:
      "border-amber-700/60 text-amber-500",
    approved:
      "border-emerald-800/60 text-emerald-500",
    rejected:
      "border-red-800/60 text-red-500",
  };

  return (
    <article className="border border-[#59432c]/40 bg-[#100c09] p-3">
      <div className="flex flex-wrap items-center gap-2">
        {entry.old_status ? (
          <>
            <span
              className={`border bg-black/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
                statusStyles[
                  entry.old_status
                ] ??
                "border-[#59432c]/60 text-[#9f917e]"
              }`}
            >
              {entry.old_status}
            </span>

            <span
              aria-hidden="true"
              className="text-[10px] text-[#725a3d]"
            >
              →
            </span>
          </>
        ) : null}

        <span
          className={`border bg-black/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
            statusStyles[
              entry.new_status
            ] ??
            "border-[#59432c]/60 text-[#9f917e]"
          }`}
        >
          {entry.new_status}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-[#887964]">
        {formatHistoryDate(
          entry.created_at,
        )}
      </p>

      {entry.reason ? (
        <div className="mt-3 border-l border-[#7c493e] pl-3">
          <p className="text-[7px] uppercase tracking-[0.18em] text-[#a8665d]">
            Reason
          </p>

          <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#c5a39d]">
            {entry.reason}
          </p>
        </div>
      ) : null}

      {entry.changed_by ? (
        <p
          className="mt-3 truncate text-[8px] text-[#665b4d]"
          title={entry.changed_by}
        >
          Changed by: {entry.changed_by}
        </p>
      ) : null}
    </article>
  );
}

function HistoryLoading() {
  return (
    <>
      <div className="h-24 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-24 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-24 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
    </>
  );
}

function formatHistoryDate(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function DashboardContext({
  context,
}: PortalContextPanelProps) {
  return (
    <>
      <ContextHeading
        eyebrow="Dashboard"
        title="Your chronicle"
      />

      <ContextRow
        label="Character"
        value={
          context.character?.display_name ??
          "Not created"
        }
      />

      <ContextRow
        label="Location"
        value={
          context.character?.currentRoom?.name ??
          "Not assigned"
        }
      />

      <ContextRow
        label="Unread messages"
        value={String(
          context.unreadMessageCount,
        )}
      />

      <ContextRow
        label="Active characters"
        value={String(
          context.onlineCharacterCount,
        )}
        last
      />
    </>
  );
}

function GameContext({
  context,
}: PortalContextPanelProps) {
  const character = context.character;
  const room = character?.currentRoom;

  const initialPresenceStatus: PresenceStatus =
    context.presence?.status === "online" ||
    context.presence?.status === "away" ||
    context.presence?.status === "busy"
      ? context.presence.status
      : "online";

  return (
    <GameContextPanel
      roomId={room?.id ?? null}
      characterId={character?.id ?? null}
      initialPresenceStatus={
        initialPresenceStatus
      }
    />
  );
}

function CharacterContext({
  context,
}: PortalContextPanelProps) {
  const character = context.character;

  return (
    <>
      <ContextHeading
        eyebrow="Character"
        title={
          character?.display_name ??
          "Character creation"
        }
      />

      {character ? (
        <>
          <ContextRow
            label="Record"
            value={character.status}
          />

          <ContextRow
            label="Title"
            value={
              character.title ?? "None"
            }
          />

          <ContextRow
            label="Occupation"
            value={
              character.occupation ??
              "None"
            }
          />

          <ContextRow
  label="Race"
  value={
    character.race?.name ??
    "Not assigned"
  }
/>

<ContextRow
  label="Association"
  value={
    character.association?.name ??
    "Not assigned"
  }
  last
/>

          <Link
            href="/character/edit"
            className="mt-5 inline-flex border border-[#765937] bg-[#271c12] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#dfc79c] transition hover:bg-[#3b2919]"
          >
            Edit character
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs leading-6 text-[#938673]">
            Create the character who will enter Sepulchria.
          </p>

          <Link
            href="/character/create"
            className="mt-5 inline-flex border border-[#765937] bg-[#271c12] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#dfc79c] transition hover:bg-[#3b2919]"
          >
            Begin creation
          </Link>
        </>
      )}
    </>
  );
}

function CharacterArchiveContext() {
  return (
    <>
      <ContextHeading
        eyebrow="Archive"
        title="Characters"
      />

      <p className="text-xs leading-6 text-[#938673]">
        Browse the approved characters currently shaping the history of Sepulchria.
      </p>

      <ContextLink
        href="/characters"
        label="Browse characters"
      />

      <ContextLink
        href="/races"
        label="Explore races"
        secondary
      />
    </>
  );
}

function CodexContext({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <>
      <ContextHeading
        eyebrow={eyebrow}
        title={title}
      />

      <p className="text-xs leading-6 text-[#938673]">
        {description}
      </p>

      <div className="mt-5 border-y border-[#59432c]/35 py-4">
        <ContextRow
          label="Archive"
          value="Public"
        />

        <ContextRow
          label="Status"
          value="Available"
          last
        />
      </div>

      <ContextLink
        href={primaryHref}
        label={primaryLabel}
      />

      <ContextLink
        href={secondaryHref}
        label={secondaryLabel}
        secondary
      />
    </>
  );
}

function MessagesContext({
  context,
}: PortalContextPanelProps) {
  return (
    <>
      <ContextHeading
        eyebrow="Correspondence"
        title="Private messages"
      />

      <ContextRow
        label="Unread"
        value={String(
          context.unreadMessageCount,
        )}
      />

      <ContextRow
        label="Character"
        value={
          context.character?.display_name ??
          "Unavailable"
        }
        last
      />

      <p className="mt-5 text-xs leading-6 text-[#938673]">
        Open a conversation to read or continue your private correspondence.
      </p>

      <Link
        href="/messages"
        className="mt-5 inline-flex border border-[#765937] bg-[#271c12] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#dfc79c] transition hover:bg-[#3b2919]"
      >
        Open inbox
      </Link>
    </>
  );
}

function DefaultContext() {
  return (
    <>
      <ContextHeading
        eyebrow="Sepulchria"
        title="Context"
      />

      <p className="text-xs leading-6 text-[#938673]">
        Tools and information for this section will appear here.
      </p>
    </>
  );
}

function ContextHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="mb-5">
      <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
        {eyebrow}
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[#d6bd91]">
        {title}
      </h2>
    </header>
  );
}

function ContextRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-3 text-xs ${
        last
          ? ""
          : "border-b border-[#59432c]/35"
      }`}
    >
      <span className="text-[#786b5b]">
        {label}
      </span>

      <span className="max-w-[150px] break-words text-right capitalize text-[#bba98d]">
        {value}
      </span>
    </div>
  );
}

function ContextLink({
  href,
  label,
  secondary = false,
}: {
  href: string;
  label: string;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`mt-3 flex w-full items-center justify-between border px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition ${
        secondary
          ? "border-[#59432c]/60 bg-transparent text-[#9d8c75] hover:border-[#765937] hover:bg-[#1f1711] hover:text-[#d7c09a]"
          : "border-[#765937] bg-[#271c12] text-[#dfc79c] hover:border-[#997042] hover:bg-[#3b2919]"
      }`}
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}