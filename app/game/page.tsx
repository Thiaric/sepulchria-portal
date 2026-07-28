import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { moveCharacter, sendRoomMessage } from "./actions";
import RoomRealtime from "./components/RoomRealtime";

export default function GamePage() {
  return (
    <Suspense fallback={<GameLoading />}>
      <GameContent />
    </Suspense>
  );
}

async function GameContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select(
      `
        id,
        display_name,
        portrait_url,
        current_room_id
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to load character: ${characterError.message}`,
    );
  }

  if (!character) {
    redirect("/character/create");
  }

  if (!character.current_room_id) {
    return <MissingLocation characterName={character.display_name} />;
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select(
      `
        id,
        name,
        description,
        image_url,
        area_id,
        areas (
          id,
          name,
          description
        )
      `,
    )
    .eq("id", character.current_room_id)
    .maybeSingle();

  if (roomError) {
    throw new Error(`Unable to load room: ${roomError.message}`);
  }

  if (!room) {
    return <MissingLocation characterName={character.display_name} />;
  }

  const { error: presenceUpdateError } = await supabase
  .from("character_presence")
  .upsert(
    {
      character_id: character.id,
      room_id: room.id,
      status: "online",
      last_seen_at: new Date().toISOString(),
    },
    {
      onConflict: "character_id",
    },
  );

if (presenceUpdateError) {
  throw new Error(
    `Unable to update presence: ${presenceUpdateError.message}`,
  );
}

const fiveMinutesAgo = new Date(
  Date.now() - 5 * 60 * 1000,
).toISOString();

const { data: presentCharacters, error: presenceError } =
  await supabase
    .from("character_presence")
    .select(
      `
        character_id,
        status,
        last_seen_at,
        character:characters!character_presence_character_id_fkey (
          id,
          display_name,
          portrait_url
        )
      `,
    )
    .eq("room_id", room.id)
    .gte("last_seen_at", fiveMinutesAgo)
    .order("last_seen_at", { ascending: false });

if (presenceError) {
  throw new Error(
    `Unable to load present characters: ${presenceError.message}`,
  );
}


  const { data: roomMessages, error: messagesError } = await supabase
    .from("room_messages")
    .select(
      `
        id,
        message,
        created_at,
        character_id,
        character:characters!room_messages_character_id_fkey (
          id,
          display_name,
          portrait_url
        )
      `,
    )
    .eq("room_id", room.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (messagesError) {
    throw new Error(
      `Unable to load room messages: ${messagesError.message}`,
    );
  }

  const { data: outgoingConnections, error: outgoingError } =
    await supabase
      .from("room_connections")
      .select(
        `
          id,
          connection_name,
          sort_order,
          destination:rooms!room_connections_to_room_id_fkey (
            id,
            name
          )
        `,
      )
      .eq("from_room_id", room.id)
      .order("sort_order", { ascending: true });

  if (outgoingError) {
    throw new Error(
      `Unable to load exits: ${outgoingError.message}`,
    );
  }

  const { data: incomingConnections, error: incomingError } =
    await supabase
      .from("room_connections")
      .select(
        `
          id,
          connection_name,
          sort_order,
          destination:rooms!room_connections_from_room_id_fkey (
            id,
            name
          )
        `,
      )
      .eq("to_room_id", room.id)
      .eq("is_two_way", true)
      .order("sort_order", { ascending: true });

  if (incomingError) {
    throw new Error(
      `Unable to load reverse exits: ${incomingError.message}`,
    );
  }

  const exits = [
    ...(outgoingConnections || []),
    ...(incomingConnections || []),
  ];

  const area = Array.isArray(room.areas) ? room.areas[0] : room.areas;

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <RoomRealtime roomId={room.id} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,82,38,0.16),_transparent_38%),linear-gradient(to_bottom,_#18120e,_#0d0a08)]">
        <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90">
          <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-5 px-5 lg:px-8">
            <div>
              <Link
                href="/"
                className="font-serif text-2xl font-semibold tracking-[0.22em] text-[#d9bd82] sm:text-3xl"
              >
                SEPULCHRIA
              </Link>

              <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#887966]">
                Chronicle of the Veiled City
              </p>
            </div>

            <nav className="flex items-center gap-5">
              <Link
                href="/character"
                className="text-xs uppercase tracking-[0.2em] text-[#a98b61] transition hover:text-[#ecd29e]"
              >
                Character
              </Link>

              <Link
                href="/"
                className="text-xs uppercase tracking-[0.2em] text-[#a98b61] transition hover:text-[#ecd29e]"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            <aside className="space-y-6">
              <section className="border border-[#654b2e]/50 bg-[#17110d] p-5">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden border border-[#654b2e] bg-[#0d0a08]">
                    {character.portrait_url ? (
                      <img
                        src={character.portrait_url}
                        alt={`Portrait of ${character.display_name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-serif text-xl text-[#756956]">
                        ?
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-[#826b4d]">
                      Playing as
                    </p>

                    <p className="mt-1 truncate font-serif text-xl text-[#dec69a]">
                      {character.display_name}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
  <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
    Present characters
  </p>

  <div className="mt-4 space-y-3">
    {presentCharacters && presentCharacters.length > 0 ? (
      presentCharacters.map((presence) => {
        const presentCharacter = Array.isArray(presence.character)
          ? presence.character[0]
          : presence.character;

        if (!presentCharacter) {
          return null;
        }

        return (
          <Link
  key={presence.character_id}
  href={`/character/${presentCharacter.id}`}
  className="flex items-center gap-3 border border-[#59432c]/50 bg-[#100c09] p-3 transition hover:border-[#927047] hover:bg-[#1a120c]"
>
            <div className="h-10 w-10 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
              {presentCharacter.portrait_url ? (
                <img
                  src={presentCharacter.portrait_url}
                  alt={`Portrait of ${presentCharacter.display_name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-serif text-sm text-[#756956]">
                  ?
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate font-serif text-sm text-[#d8bf91]">
                {presentCharacter.display_name}
              </p>

              <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-[#77664e]">
                {presence.status}
              </p>
            </div>
          </Link>
        );
      })
    ) : (
      <div className="border border-dashed border-[#59432c]/60 bg-[#100c09] px-4 py-6 text-center">
        <p className="font-serif text-sm italic text-[#756956]">
          No characters are currently present.
        </p>
      </div>
    )}
  </div>
</section>
            </aside>

            <section className="min-w-0">
              <article className="overflow-hidden border border-[#6a5032]/50 bg-[#17110d]">
                {room.image_url ? (
                  <div className="h-64 border-b border-[#59432c]/40 sm:h-80">
                    <img
                      src={room.image_url}
                      alt={room.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center border-b border-[#59432c]/40 bg-[#110d0a]">
                    <p className="font-serif text-sm italic text-[#756956]">
                      No location image has been selected
                    </p>
                  </div>
                )}

                <div className="border-b border-[#59432c]/40 px-6 py-6 sm:px-8">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">
                    {area?.name || "Unknown area"}
                  </p>

                  <h1 className="mt-2 font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
                    {room.name}
                  </h1>
                </div>

                <div className="px-6 py-7 sm:px-8">
                  <p className="whitespace-pre-line text-sm leading-8 text-[#b0a18d] sm:text-base">
                    {room.description ||
                      "No description has been written for this location yet."}
                  </p>
                </div>
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

                <div className="max-h-[650px] min-h-72 overflow-y-auto">
                  {roomMessages && roomMessages.length > 0 ? (
                    <div className="divide-y divide-[#4f3b28]/35">
                      {roomMessages.map((roomMessage) => {
                        const author = Array.isArray(roomMessage.character)
                          ? roomMessage.character[0]
                          : roomMessage.character;

                        const formattedTime = new Intl.DateTimeFormat("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(roomMessage.created_at));

                        return (
                          <article key={roomMessage.id} className="flex gap-4 px-5 py-5 sm:px-7">
                            <div className="h-12 w-12 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
                              {author?.portrait_url ? (
                                <img
                                  src={author.portrait_url}
                                  alt={`Portrait of ${author.display_name}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center font-serif text-sm text-[#756956]">
                                  ?
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="font-serif text-lg text-[#d8bf91]">
                                  {author?.display_name || "Unknown character"}
                                </p>
                                <time className="text-[9px] uppercase tracking-[0.18em] text-[#776b5b]">
                                  {formattedTime}
                                </time>
                              </div>

                              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#b8aa96]">
                                {roomMessage.message}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-72 items-center justify-center px-6 py-10 text-center">
                      <div>
                        <p className="font-serif text-lg italic text-[#8e7d66]">
                          The room is silent.
                        </p>
                        <p className="mt-3 text-xs leading-6 text-[#756b5f]">
                          Write the first action in this location.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <form action={sendRoomMessage} className="border-t border-[#59432c]/40 p-4 sm:p-5">
                  <textarea
                    name="message"
                    required
                    maxLength={5000}
                    placeholder="Write your action..."
                    className="min-h-28 w-full resize-y border border-[#60482e]/50 bg-[#0f0c09] px-4 py-3 text-sm leading-7 text-[#d0bea1] outline-none transition placeholder:text-[#5f574d] focus:border-[#927047]"
                  />

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#685d50]">
                      Maximum 5,000 characters
                    </p>
                    <button
                      type="submit"
                      className="border border-[#85653c] bg-[#342617] px-6 py-3 text-xs uppercase tracking-[0.23em] text-[#efd4a0] transition hover:bg-[#4a351f]"
                    >
                      Send action
                    </button>
                  </div>
                </form>
              </article>
            </section>

            <aside className="space-y-6">
              <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
                  Current area
                </p>

                <h2 className="mt-3 font-serif text-2xl text-[#d6bd91]">
                  {area?.name || "Unknown area"}
                </h2>

                <p className="mt-3 text-xs leading-6 text-[#8f8271]">
                  {area?.description ||
                    "No description has been written for this area yet."}
                </p>
              </section>

              

              <section className="border border-[#60482e]/45 bg-[#15100d] p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
                  Available exits
                </p>

                <div className="mt-4 space-y-3">
                  {exits.length > 0 ? (
                    exits.map((exit) => {
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
                            className="w-full border border-[#765937] bg-[#271c12] px-4 py-3 text-left transition hover:bg-[#3b2919]"
                          >
                            <span className="block font-serif text-base text-[#d8bf91]">
                              {destination.name}
                            </span>

                            <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-[#846a49]">
                              {exit.connection_name}
                            </span>
                          </button>
                        </form>
                      );
                    })
                  ) : (
                    <div className="border border-dashed border-[#59432c]/60 bg-[#100c09] px-4 py-6 text-center">
                      <p className="font-serif text-sm italic text-[#756956]">
                        There are no visible exits.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function GameLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#100d0b] text-[#a98b61]">
      <p className="font-serif text-lg italic">Entering Sepulchria...</p>
    </main>
  );
}

type MissingLocationProps = {
  characterName: string;
};

function MissingLocation({ characterName }: MissingLocationProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#100d0b] px-5 text-[#e7d5b0]">
      <section className="w-full max-w-xl border border-[#654b2e]/50 bg-[#17110d] p-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
          Location unavailable
        </p>

        <h1 className="mt-3 font-serif text-3xl text-[#dec69a]">
          {characterName} has no current location
        </h1>

        <p className="mt-4 text-sm leading-7 text-[#928574]">
          Assign a valid room to this character before entering the game.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block border border-[#85653c] bg-[#342617] px-5 py-3 text-xs uppercase tracking-[0.22em] text-[#efd4a0] transition hover:bg-[#4a351f]"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}

type GameLinkProps = {
  href: string;
  label: string;
};

function GameLink({ href, label }: GameLinkProps) {
  return (
    <Link
      href={href}
      className="block border border-[#60482e]/45 bg-[#20170f] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[#c6a873] transition hover:bg-[#342617]"
    >
      {label}
    </Link>
  );
}

function DisabledLink({ label }: { label: string }) {
  return (
    <div className="border border-[#4d3b29]/30 bg-[#110d0a] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[#5f574d]">
      {label}
    </div>
  );
}