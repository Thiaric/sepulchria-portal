import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MESSAGE_PAGE_SIZE } from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  PresenceStatus,
  RoomMessage,
} from "@/types/game";

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

type RoomRelation = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  area_id: string;
  areas: Area | Area[] | null;
};

export default function GamePage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-5 text-[#a98b61]">
          Entering Sepulchria...
        </div>
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

  const { data: character, error: characterError } =
    await supabase
      .from("characters")
      .select(
        "id, display_name, portrait_url, current_room_id",
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  if (!character.current_room_id) {
    return (
      <MissingLocation name={character.display_name} />
    );
  }

  const { data: rawRoom, error: roomError } = await supabase
    .from("rooms")
    .select(
      "id, name, description, image_url, area_id, areas(id,name,description)",
    )
    .eq("id", character.current_room_id)
    .maybeSingle();

  if (roomError) {
    throw new Error(roomError.message);
  }

  if (!rawRoom) {
    return (
      <MissingLocation name={character.display_name} />
    );
  }

  const room = rawRoom as RoomRelation;

  const { data: ownPresence, error: ownPresenceError } =
    await supabase
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

  let messageQuery = supabase
    .from("room_messages")
    .select(
      `
        id,
        message,
        created_at,
        character_id,
        character:characters!room_messages_character_id_fkey(
          id,
          display_name,
          portrait_url
        )
      `,
    )
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);

  if (before && !Number.isNaN(Date.parse(before))) {
    messageQuery = messageQuery.lt(
      "created_at",
      before,
    );
  }

  const {
    data: rawMessages = [],
    error: messagesError,
  } = await messageQuery;

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const safeMessages = rawMessages ?? [];
  const hasOlderMessages =
    safeMessages.length > MESSAGE_PAGE_SIZE;

  const visibleMessages = safeMessages
    .slice(0, MESSAGE_PAGE_SIZE)
    .reverse() as RoomMessage[];

  const olderBefore = hasOlderMessages
    ? visibleMessages[0]?.created_at
    : undefined;

  const areaRelation = room.areas;
  const area = Array.isArray(areaRelation)
    ? areaRelation[0]
    : areaRelation;

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <RoomRealtime roomId={room.id} />

      <PresenceHeartbeat
  characterId={character.id}
  roomId={room.id}
  initialStatus={initialPresenceStatus}
/>

      <div className="mx-auto max-w-5xl">
        <article className="overflow-hidden border border-[#6a5032]/50 bg-[#17110d]">
          {room.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={room.image_url}
              alt={room.name}
              className="h-56 w-full object-cover sm:h-72 lg:h-80"
            />
          ) : null}

          <div className="border-t border-[#59432c]/40 px-5 py-6 sm:px-8">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">
              {area?.name ?? "Unknown area"}
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
              {room.name}
            </h1>
          </div>

          <p className="whitespace-pre-line px-5 pb-7 text-sm leading-8 text-[#b0a18d] sm:px-8 sm:text-base">
            {room.description ??
              "No description has been written for this location yet."}
          </p>
        </article>

        <article className="mt-6 border border-[#6a5032]/50 bg-[#17110d]">
          <div className="border-b border-[#59432c]/40 px-5 py-5 sm:px-8">
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
      </div>
    </div>
  );
}

function MissingLocation({
  name,
}: {
  name: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-5 text-[#e7d5b0]">
      <section className="max-w-xl border border-[#654b2e]/50 bg-[#17110d] p-8 text-center">
        <h1 className="font-serif text-3xl text-[#dec69a]">
          {name} has no current location
        </h1>

        <p className="mt-4 text-sm leading-7 text-[#9e907d]">
          This character must be assigned to a room before
          entering the game.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block text-[#efd4a0] transition hover:text-white"
        >
          Return to dashboard
        </Link>
      </section>
    </div>
  );
}