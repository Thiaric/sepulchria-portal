import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MESSAGE_PAGE_SIZE } from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/server";
import type { RoomMessage } from "@/types/game";

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

async function GameContent({
  searchParams,
}: Props) {
  const { before } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
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
      <MissingLocation
        name={character.display_name}
      />
    );
  }

  const {
    data: rawRoom,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select(
      "id, name, description, image_url, area_id, areas(id,name,description)",
    )
    .eq(
      "id",
      character.current_room_id,
    )
    .maybeSingle();

  if (roomError) {
    throw new Error(roomError.message);
  }

  if (!rawRoom) {
    return (
      <MissingLocation
        name={character.display_name}
      />
    );
  }

  const room = rawRoom as RoomRelation;

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
          portrait_url,
          public_slug
        )
      `,
    )
    .eq("room_id", room.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(MESSAGE_PAGE_SIZE + 1);

  if (
    before &&
    !Number.isNaN(Date.parse(before))
  ) {
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

  return (
  <div className="h-[calc(100dvh-5rem)] overflow-hidden p-3 sm:p-4 lg:p-5">
    <RoomRealtime roomId={room.id} />

    <div className="mx-auto h-full max-w-5xl">
      <article className="flex h-full min-h-0 flex-col overflow-hidden border border-[#6a5032]/50 bg-[#17110d]">
        <RoomMessageList
          roomId={room.id}
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