"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { GameContextPanel } from "@/components/portal/game-context-panel";
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

  if (
    pathname === "/messages" ||
    pathname.startsWith("/messages/")
  ) {
    return <MessagesContext context={context} />;
  }

  return <DefaultContext />;
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