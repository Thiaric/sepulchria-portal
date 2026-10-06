import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

const ACTIVE_PORTAL_SESSION_MINUTES =
  60;

type Options = {
  includeAppearOffline?: boolean;
};

export async function getActivePortalCharacterIds({
  includeAppearOffline = false,
}: Options = {}): Promise<string[]> {
  const admin =
    createAdminClient();

  const activeSince =
    new Date(
      Date.now() -
        ACTIVE_PORTAL_SESSION_MINUTES *
          60_000,
    ).toISOString();

  const {
    data: sessions,
    error: sessionError,
  } = await admin
    .from("portal_active_sessions")
    .select("user_id")
    .gte(
      "last_seen_at",
      activeSince,
    );

  if (sessionError) {
    throw new Error(
      `Unable to load active Portal sessions: ${sessionError.message}`,
    );
  }

  const userIds =
    Array.from(
      new Set(
        (sessions ?? [])
          .map(
            (row) =>
              row.user_id as string,
          )
          .filter(Boolean),
      ),
    );

  if (userIds.length === 0) {
    return [];
  }

  const {
    data: characters,
    error: characterError,
  } = await admin
    .from("characters")
    .select("id")
    .in(
      "user_id",
      userIds,
    )
    .eq(
      "status",
      "approved",
    )
    .eq(
      "is_system",
      false,
    );

  if (characterError) {
    throw new Error(
      `Unable to resolve active Portal Characters: ${characterError.message}`,
    );
  }

  const characterIds =
    Array.from(
      new Set(
        (characters ?? [])
          .map(
            (row) =>
              row.id as string,
          )
          .filter(Boolean),
      ),
    );

  if (
    includeAppearOffline ||
    characterIds.length === 0
  ) {
    return characterIds;
  }

  const {
    data: hiddenRows,
    error: hiddenError,
  } = await admin
    .from("character_presence")
    .select("character_id")
    .in(
      "character_id",
      characterIds,
    )
    .eq(
      "appear_offline",
      true,
    );

  if (hiddenError) {
    throw new Error(
      `Unable to apply Appear Offline visibility: ${hiddenError.message}`,
    );
  }

  const hiddenIds =
    new Set(
      (hiddenRows ?? []).map(
        (row) =>
          row.character_id as string,
      ),
    );

  return characterIds.filter(
    (id) =>
      !hiddenIds.has(id),
  );
}
