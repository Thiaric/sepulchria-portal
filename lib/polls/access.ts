import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type PollTarget = {
  target_type: string;
  target_id: string | null;
};

export type PollViewer = {
  userId: string;
  characterId: string | null;
  raceId: string | null;
  associationId: string | null;
  orderIds: string[];
  isStaff: boolean;
};

export async function getPollViewer(
  userId: string,
): Promise<PollViewer> {
  const admin = createAdminClient();

  const [
    characterResult,
    staffResult,
  ] = await Promise.all([
    admin
      .from("characters")
      .select(
        "id, race_id, association_id",
      )
      .eq("user_id", userId)
      .maybeSingle(),

    admin
      .from("staff_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (characterResult.error) {
    throw new Error(
      `Unable to load poll character: ${characterResult.error.message}`,
    );
  }

  if (staffResult.error) {
    throw new Error(
      `Unable to load poll staff state: ${staffResult.error.message}`,
    );
  }

  const character =
    characterResult.data;

  let orderIds: string[] = [];

  if (character?.id) {
    const { data, error } =
      await admin
        .from("order_memberships")
        .select("order_id")
        .eq(
          "character_id",
          character.id,
        );

    if (error) {
      throw new Error(
        `Unable to load poll Order memberships: ${error.message}`,
      );
    }

    orderIds = (data ?? [])
      .map((row) => row.order_id)
      .filter(
        (value): value is string =>
          typeof value === "string",
      );
  }

  return {
    userId,
    characterId:
      character?.id ?? null,
    raceId:
      character?.race_id ?? null,
    associationId:
      character?.association_id ??
      null,
    orderIds,
    isStaff:
      staffResult.data !== null,
  };
}

export function canViewPoll(
  viewer: PollViewer,
  targets: PollTarget[],
): boolean {
  if (targets.length === 0) {
    return false;
  }

  return targets.some((target) => {
    switch (target.target_type) {
      case "global":
        return (
          viewer.characterId !== null ||
          viewer.isStaff
        );

      case "staff":
        return viewer.isStaff;

      case "user":
        return (
          target.target_id ===
          viewer.userId
        );

      case "character":
        return (
          viewer.characterId !== null &&
          target.target_id ===
            viewer.characterId
        );

      case "ancestry":
        return (
          viewer.raceId !== null &&
          target.target_id ===
            viewer.raceId
        );

      case "association":
        return (
          viewer.associationId !== null &&
          target.target_id ===
            viewer.associationId
        );

      case "order":
        return (
          target.target_id !== null &&
          viewer.orderIds.includes(
            target.target_id,
          )
        );

      default:
        return false;
    }
  });
}
