import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const RECENT_ROOM_ACTION_MINUTES = 60;

type RoomActionRow = {
  character_id: string | null;
  speaker_type: string | null;
  message_type: string | null;
  npc_snapshot: Record<string, unknown> | null;
};

function getActorCharacterId(
  row: RoomActionRow,
) {
  if (
    row.speaker_type === "npc" &&
    row.npc_snapshot
  ) {
    const npcCharacterId =
      row.npc_snapshot["character_id"];

    if (
      typeof npcCharacterId === "string" &&
      npcCharacterId
    ) {
      return npcCharacterId;
    }
  }

  return row.character_id;
}

export async function getRecentRoomActionCharacterIds(
  roomId: string,
) {
  const admin = createAdminClient();

  const since = new Date(
    Date.now() -
      RECENT_ROOM_ACTION_MINUTES * 60_000,
  ).toISOString();

  const { data, error } =
    await admin
      .from("room_messages")
      .select(
        "character_id, speaker_type, message_type, npc_snapshot",
      )
      .eq("room_id", roomId)
      .in(
        "message_type",
        ["action", "attribute_check"],
      )
      .gte("created_at", since)
      .order("created_at", {
        ascending: false,
      })
      .limit(5000);

  if (error) {
    throw new Error(
      `Unable to verify recent Location actions: ${error.message}`,
    );
  }

  return new Set(
    (data ?? [])
      .map((row) =>
        getActorCharacterId(
          row as RoomActionRow,
        ),
      )
      .filter(
        (id): id is string =>
          Boolean(id),
      ),
  );
}

export async function hasRecentRoomAction(
  roomId: string,
  characterId: string,
) {
  const ids =
    await getRecentRoomActionCharacterIds(
      roomId,
    );

  return ids.has(characterId);
}

export async function assertRecentRoomAction(
  roomId: string,
  characterId: string,
  label = "Character",
) {
  if (
    !(await hasRecentRoomAction(
      roomId,
      characterId,
    ))
  ) {
    throw new Error(
      `${label} must make a proper room action before using contextual mechanics.`,
    );
  }
}
