import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  MESSAGE_PAGE_SIZE,
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  PresentCharacter,
  PresenceStatus,
  RoomMessage,
} from "@/types/game";

import { moveCharacter } from "./actions";
import PresenceHeartbeat from "./components/PresenceHeartbeat";
import RoomChatForm from "./components/RoomChatForm";
import RoomMessageList from "./components/RoomMessageList";
import RoomRealtime from "./components/RoomRealtime";

type Props = {
  searchParams: Promise<{
    before?: string;
  }>;
};

type Area = {
  id: string;
  name: string;
  description: string | null;
};

type Destination = {
  id: string;
  name: string;
};

type RoomExit = {
  id: string;
  connection_name: string | null;
  sort_order: number | null;
  destination: Destination | Destination[] | null;
};

export default function GamePage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#100d0b] text-[#a98b61]">
          Entering Sepulchria...
        </main>
      }
    >
      <GameContent {...props} />
    </Suspense>
  );
}

async function GameContent({ searchParams }: Props) {
  const { before } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id, display_name, portrait_url, current_room_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  if (!character.current_room_id) {
    return <MissingLocation name={character.display_name} />;
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select(
      "id, name, description, image_url, area_id, areas(id,name,description)",
    )
    .eq("id", character.current_room_id)
    .maybeSingle();

  if (roomError) {
    throw new Error(roomError.message);
  }

  if (!room) {
    return <MissingLocation name={character.display_name} />;
  }

  const { data: ownPresence, error: ownPresenceError } = await supabase
    .from("character_presence")
    .select("status")
    .eq("character_id", character.id)
    .maybeSingle();

  if (ownPresenceError) {
    throw new Error(ownPresenceError.message);
  }

  const initialPresenceStatus: PresenceStatus =
    ownPresence?.status === "online" ||
    ownPresence?.status === "away" ||
    ownPresence?.status === "busy"
      ? ownPresence.status
      : "online";

  const activeSince = new Date(
    Date.now() - PRESENCE_ACTIVE_MINUTES * 60_000,
  ).toISOString();

  const { data: presentCharacters = [], error: presenceListError } =
    await supabase
      .from("character_presence")
      .select(
        "character_id,status,last_seen_at,character:characters!character_presence_character_id_fkey(id,display_name,portrait_url)",
      )
      .eq("room_id", room.id)
      .gte("last_seen_at", activeSince)
      .order("last_seen_at", { ascending: false });

  if (presenceListError) {
    throw new Error(presenceListError.message);
  }

  let messageQuery = supabase
    .from("room_messages")
    .select(
      "id,message,created_at,character_id,character:characters!room_messages_character_id_fkey(id,display_name,portrait_url)",
    )
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);

  if (before && !Number.isNaN(Date.parse(before))) {
    messageQuery = messageQuery.lt("created_at", before);
  }

  const { data: rawMessages = [], error: messagesError } = await messageQuery;

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const safeMessages = rawMessages ?? [];
  const hasOlder = safeMessages.length > MESSAGE_PAGE_SIZE;
  const visibleMessages = safeMessages
    .slice(0, MESSAGE_PAGE_SIZE)
    .reverse() as RoomMessage[];
  const olderBefore = hasOlder ? visibleMessages[0]?.created_at : undefined;

  const [outgoingResult, incomingResult] = await Promise.all([
    supabase
      .from("room_connections")
      .select(
        "id,connection_name,sort_order,destination:rooms!room_connections_to_room_id_fkey(id,name)",
      )
      .eq("from_room_id", room.id)
      .order("sort_order"),
    supabase
      .from("room_connections")
      .select(
        "id,connection_name,sort_order,destination:rooms!room_connections_from_room_id_fkey(id,name)",
      )
      .eq("to_room_id", room.id)
      .eq("is_two_way", true)
      .order("sort_order"),
  ]);

  if (outgoingResult.error) {
    throw new Error(outgoingResult.error.message);
  }

  if (incomingResult.error) {
    throw new Error(incomingResult.error.message);
  }

  const exits = [
    ...(outgoingResult.data as RoomExit[]),
    ...(incomingResult.data as RoomExit[]),
  ];

  const areaRelation = room.areas as Area | Area[] | null;
  const area = Array.isArray(areaRelation) ? areaRelation[0] : areaRelation;

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <RoomRealtime roomId={room.id} />

      <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="font-serif text-2xl tracking-[0.22em] text-[#d9bd82]"
          >
            SEPULCHRIA
          </Link>

          <nav className="flex gap-5 text-xs uppercase tracking-[0.2em] text-[#a98b61]">
            <Link href="/character">Character</Link>
            <Link href="/">Dashboard</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
          <aside className="space-y-6">
            <section className="border border-[#654b2e]/50 bg-[#17110d] p-5">
              <div className="flex items-center gap-4">
                <Portrait
                  src={character.portrait_url}
                  name={character.display_name}
                  size="large"
                />

                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[#826b4d]">
                    Playing as
                  </p>
                  <p className="mt-1 truncate font-serif text-xl text-[#dec69a]">
                    {character.display_name}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <PresenceHeartbeat initialStatus={initialPresenceStatus} />
              </div>
            </section>

            <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
                Present characters
              </p>

              <div className="mt-4 space-y-3">
                {((presentCharacters ?? []) as PresentCharacter[]).map((presence) => {
                  const person = Array.isArray(presence.character)
                    ? presence.character[0]
                    : presence.character;

                  if (!person) {
                    return null;
                  }

                  return (
                    <Link
                      key={presence.character_id}
                      href={`/character/${person.id}`}
                      className="flex items-center gap-3 border border-[#59432c]/50 bg-[#100c09] p-3 hover:border-[#927047]"
                    >
                      <Portrait
                        src={person.portrait_url}
                        name={person.display_name}
                      />

                      <div className="min-w-0">
                        <p className="truncate font-serif text-sm text-[#d8bf91]">
                          {person.display_name}
                        </p>
                        <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-[#77664e]">
                          {presence.status}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </aside>

          <section className="min-w-0">
            <article className="overflow-hidden border border-[#6a5032]/50 bg-[#17110d]">
              {room.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={room.image_url}
                  alt={room.name}
                  className="h-64 w-full object-cover sm:h-80"
                />
              ) : null}

              <div className="border-t border-[#59432c]/40 px-6 py-6 sm:px-8">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">
                  {area?.name ?? "Unknown area"}
                </p>
                <h1 className="mt-2 font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
                  {room.name}
                </h1>
              </div>

              <p className="whitespace-pre-line px-6 py-7 text-sm leading-8 text-[#b0a18d] sm:px-8 sm:text-base">
                {room.description ??
                  "No description has been written for this location yet."}
              </p>
            </article>

            <article className="mt-6 border border-[#6a5032]/50 bg-[#17110d]">
              <div className="border-b border-[#59432c]/40 px-6 py-5 sm:px-8">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">
                  Room chronicle
                </p>
                <h2 className="mt-2 font-serif text-3xl text-[#dfc79c]">
                  Live roleplay
                </h2>
              </div>

              <RoomMessageList
                messages={visibleMessages}
                olderBefore={olderBefore}
              />
              <RoomChatForm />
            </article>
          </section>

          <aside className="space-y-6">
            <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
                Current area
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[#d6bd91]">
                {area?.name ?? "Unknown area"}
              </h2>
              <p className="mt-3 text-xs leading-6 text-[#8f8271]">
                {area?.description ??
                  "No description has been written for this area yet."}
              </p>
            </section>

            <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
                Available exits
              </p>

              <div className="mt-4 space-y-3">
                {exits.map((exit) => {
                  const destination = Array.isArray(exit.destination)
                    ? exit.destination[0]
                    : exit.destination;

                  if (!destination) {
                    return null;
                  }

                  return (
                    <form key={exit.id} action={moveCharacter}>
                      <input
                        type="hidden"
                        name="roomId"
                        value={destination.id}
                      />
                      <button
                        type="submit"
                        className="w-full border border-[#765937] bg-[#271c12] px-4 py-3 text-left hover:bg-[#3b2919]"
                      >
                        <span className="block font-serif text-base text-[#d8bf91]">
                          {destination.name}
                        </span>
                        <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-[#846a49]">
                          {exit.connection_name ?? "Passage"}
                        </span>
                      </button>
                    </form>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Portrait({
  src,
  name,
  size = "small",
}: {
  src: string | null;
  name: string;
  size?: "small" | "large";
}) {
  const classes = size === "large" ? "h-16 w-16" : "h-10 w-10";

  return (
    <div
      className={`${classes} shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait of ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full items-center justify-center">?</span>
      )}
    </div>
  );
}

function MissingLocation({ name }: { name: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#100d0b] px-5 text-[#e7d5b0]">
      <section className="border border-[#654b2e]/50 bg-[#17110d] p-8 text-center">
        <h1 className="font-serif text-3xl text-[#dec69a]">
          {name} has no current location
        </h1>
        <Link href="/" className="mt-6 inline-block text-[#efd4a0]">
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
