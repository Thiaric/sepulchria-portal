import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  PRESENCE_ACTIVE_MINUTES,
  ROOM_HISTORY_BATCH_SIZE,
  ROOM_HISTORY_HOURS,
  ROOM_INACTIVITY_RESET_HOURS,
} from "@/lib/game/constants";
import { getStaffSession } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import type {
  PresentRoomCharacter,
  RoomMessage,
} from "@/types/game";

import RoomChatForm from "./components/RoomChatForm";
import RoomMessageList from "./components/RoomMessageList";
import RoomRealtime from "./components/RoomRealtime";
import { leaveCurrentRoom } from "./actions";

type Props = Record<string, never>;

type Area = {
  id: string;
  name: string;
  slug: string;
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

async function GameContent() {
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
      `
        id,
        display_name,
        portrait_url,
        current_room_id,
        status,
        muscles,
        reflexes,
        vigor,
        brains,
        shrewd,
        presence_score
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  if (character.status !== "approved") {
    redirect(
      `/character?error=${encodeURIComponent(
        "Your character must be approved by the staff before entering the city.",
      )}`,
    );
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
  "id, name, description, image_url, area_id, areas(id,name,slug,description)",
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

  const roomArea =
  Array.isArray(room.areas)
    ? room.areas[0] ?? null
    : room.areas;

  const messageSelect = `
    id,
    message,
    message_type,
    roll_label,
    dice_sides,
    dice_result,
    attribute_key,
    attribute_value,
    roll_total,
    whisper_recipient_character_id,
    created_at,
    character_id,

    character:characters!room_messages_character_id_fkey(
  id,
  first_name,
  display_name,
  portrait_url,
  public_slug,

  race:races!characters_race_id_fkey(
    id,
    name,
    slug,
    icon_url
  ),

  association:associations!characters_association_id_fkey(
    id,
    name,
    slug,
    icon_url
  )
),

    whisperRecipient:characters!room_messages_whisper_recipient_character_id_fkey(
  id,
  first_name,
  display_name,
  portrait_url,
  public_slug,

  race:races!characters_race_id_fkey(
    id,
    name,
    slug,
    icon_url
  ),

  association:associations!characters_association_id_fkey(
    id,
    name,
    slug,
    icon_url
  )
)
  `;

  const {
    data: latestMessage,
    error: latestMessageError,
  } = await supabase
    .from("room_messages")
    .select("created_at")
    .eq("room_id", room.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (latestMessageError) {
    throw new Error(
      `Unable to load the latest room entry: ${latestMessageError.message}`,
    );
  }

  let visibleMessages:
    RoomMessage[] = [];

  if (latestMessage) {
    const now = Date.now();

    const latestTimestamp =
      Date.parse(
        latestMessage.created_at,
      );

    const inactivityLimit =
      ROOM_INACTIVITY_RESET_HOURS *
      60 *
      60 *
      1000;

    const roomIsStillActive =
      !Number.isNaN(
        latestTimestamp,
      ) &&
      now - latestTimestamp <
        inactivityLimit;

    if (roomIsStillActive) {
      const historyStart =
        new Date(
          now -
            ROOM_HISTORY_HOURS *
              60 *
              60 *
              1000,
        ).toISOString();

      let from = 0;

      while (true) {
        const to =
          from +
          ROOM_HISTORY_BATCH_SIZE -
          1;

        const {
          data: batch,
          error: batchError,
        } = await supabase
          .from("room_messages")
          .select(messageSelect)
          .eq("room_id", room.id)
          .gte(
            "created_at",
            historyStart,
          )
          .order("created_at", {
            ascending: true,
          })
          .range(from, to);

        if (batchError) {
          throw new Error(
            `Unable to load room entries: ${batchError.message}`,
          );
        }

        const typedBatch =
          (batch ??
            []) as unknown as RoomMessage[];

        visibleMessages.push(
          ...typedBatch,
        );

        if (
          typedBatch.length <
          ROOM_HISTORY_BATCH_SIZE
        ) {
          break;
        }

        from +=
          ROOM_HISTORY_BATCH_SIZE;
      }
    }
  }

  const activeSince = new Date(
    Date.now() -
      PRESENCE_ACTIVE_MINUTES *
        60_000,
  ).toISOString();

  const [
    presentResult,
    staffSession,
  ] = await Promise.all([
    supabase
      .from(
        "character_presence",
      )
      .select(`
        character_id,
        character:characters!character_presence_character_id_fkey(
          id,
          display_name
        )
      `)
      .eq("room_id", room.id)
      .gte(
        "last_seen_at",
        activeSince,
      ),

    getStaffSession(),
  ]);

  if (presentResult.error) {
    throw new Error(
      `Unable to load present characters: ${presentResult.error.message}`,
    );
  }

  const presentCharacters =
    (
      presentResult.data ?? []
    )
      .map((entry) => {
        const relation =
          Array.isArray(
            entry.character,
          )
            ? entry.character[0]
            : entry.character;

        if (
          !relation ||
          relation.id ===
            character.id
        ) {
          return null;
        }

        return {
          id: relation.id,
          display_name:
            relation.display_name,
        };
      })
      .filter(
        (
          entry,
        ): entry is PresentRoomCharacter =>
          entry !== null,
      )
      .sort((first, second) =>
        first.display_name.localeCompare(
          second.display_name,
        ),
      );

  const canUseFate =
    staffSession !== null &&
    [
      "owner",
      "admin",
      "master",
    ].includes(
      staffSession.role,
    );

  const canViewAllWhispers =
    staffSession !== null;

  return (
  <div className="h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4">
    <RoomRealtime roomId={room.id} />

    <div className="mx-auto flex h-full max-w-80dvh flex-col">
  <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border border-[#62492e]/45 bg-[#15100d] px-3 py-2">
    <div className="min-w-0">
      

      <p className="mt-1 truncate font-serif text-lg text-[#dec69a]">
        {room.name}
      </p>
    </div>

    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Link
  href="/game/export"
  title="Export the current game session as a file"
  className="border border-[#725c3d] bg-[#21190f] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#d6bb8d] transition hover:border-[#a17a49] hover:bg-[#352718] hover:text-[#f0d6a7]"
>
  Export role
</Link>

{roomArea ? (
  <Link
    href={`/areas/${roomArea.slug}`}
    title="Return to the area page"
    className="border border-[#725c3d] bg-[#21190f] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#d6bb8d] transition hover:border-[#a17a49] hover:bg-[#352718] hover:text-[#f0d6a7]"
  >
    ← Back to {roomArea.name}
  </Link>
) : null}

<form action={leaveCurrentRoom}>
  <button
    type="submit"
    title="Leave this location and return to the city, your presence won't be counted in locations, only in the portal"
    className="border border-[#8f3f36] bg-[#351714] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#e6a097] transition hover:border-[#c65a4d] hover:bg-[#4b1d19] hover:text-[#ffd0c9]"
  >
    Take Leave
  </button>
</form>

     
    </div>
  </div>

  <article className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#6a5032]/50 bg-[#17110d]">
    <RoomMessageList
      roomId={room.id}
      messages={visibleMessages}
      viewerCharacterId={
        character.id
      }
      canViewAllWhispers={
        canViewAllWhispers
      }
    />

    <RoomChatForm
      attributes={{
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      }}
      presentCharacters={
        presentCharacters
      }
      canUseFate={canUseFate}
    />
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