"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GameContextPanel } from "@/components/portal/game-context-panel";

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

  if (pathname === "/game" || pathname.startsWith("/game/")) {
    return <GameContext context={context} />;
  }

  if (
    pathname === "/character" ||
    pathname.startsWith("/character/")
  ) {
    return <CharacterContext context={context} />;
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
        value={String(context.unreadMessageCount)}
      />

      <ContextRow
        label="Active characters"
        value={String(context.onlineCharacterCount)}
        last
      />
    </>
  );
}

function GameContext({
  context,
}: PortalContextPanelProps) {
  const room = context.character?.currentRoom;

  return (
    <GameContextPanel
      roomId={room?.id ?? null}
      roomName={room?.name ?? null}
      areaName={room?.area?.name ?? null}
      presenceStatus={context.presence?.status ?? null}
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
              character.title ??
              "None"
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
            label="Faction"
            value={
              character.faction ??
              "Unaffiliated"
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
        value={String(context.unreadMessageCount)}
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
        Open a conversation to read or continue your private
        correspondence.
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
      <span className="text-[#786b5b]">{label}</span>

      <span className="max-w-[150px] break-words text-right capitalize text-[#bba98d]">
        {value}
      </span>
    </div>
  );
}