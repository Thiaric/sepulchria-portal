import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const ORDER_LEVELS = [0, 1, 2, 3, 4, 5] as const;

export type OrderLevel = (typeof ORDER_LEVELS)[number];

export type ForumOrderMembership = {
  orderId: string;
  level: OrderLevel;
};

export type ForumViewerContext = {
  userId: string | null;
  isStaff: boolean;
  characterId: string | null;
  membership: ForumOrderMembership | null;
};

type CharacterRow = {
  id: string;
  status: string;
};

type MembershipRow = {
  order_id: string;
  level:
    | { level: number }
    | { level: number }[]
    | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function isOrderLevel(value: number): value is OrderLevel {
  return ORDER_LEVELS.includes(value as OrderLevel);
}

export function normaliseStoredVisibleLevels(
  value: number[] | null | undefined,
): OrderLevel[] {
  if (!value || value.length === 0) {
    return [...ORDER_LEVELS];
  }

  return Array.from(
    new Set(
      value.filter(
        (level): level is OrderLevel =>
          Number.isInteger(level) && isOrderLevel(level),
      ),
    ),
  ).sort((a, b) => a - b);
}

export function readRequestedVisibleLevels(
  formData: FormData,
): OrderLevel[] {
  return Array.from(
    new Set(
      formData
        .getAll("visibleOrderLevels")
        .map((value) => Number(value))
        .filter(
          (level): level is OrderLevel =>
            Number.isInteger(level) && isOrderLevel(level),
        ),
    ),
  ).sort((a, b) => a - b);
}

/**
 * Level rules:
 *
 * Level 5 Head / Staff:
 *   may choose any non-empty combination of Levels 0–5.
 *
 * Level 4:
 *   Levels 4 and 5 are forced; 0–3 are optional.
 *
 * Level 3:
 *   Levels 3,4,5 are forced; 0–2 are optional.
 *
 * ...and so on.
 *
 * Level 0 therefore always produces 0–5.
 */
export function resolveVisibleLevelsForActor({
  requestedLevels,
  actorLevel,
  unrestricted,
}: {
  requestedLevels: OrderLevel[];
  actorLevel: OrderLevel | null;
  unrestricted: boolean;
}): OrderLevel[] {
  const requested = Array.from(
    new Set(requestedLevels),
  ).sort((a, b) => a - b);

  if (unrestricted) {
    if (requested.length === 0) {
      throw new Error(
        "Choose at least one Order Level that may access this discussion.",
      );
    }

    return requested;
  }

  if (actorLevel === null) {
    throw new Error(
      "An Order membership is required to set discussion visibility.",
    );
  }

  const forced = ORDER_LEVELS.filter(
    (level) => level >= actorLevel,
  );

  return Array.from(
    new Set([
      ...requested.filter(
        (level) => level < actorLevel,
      ),
      ...forced,
    ]),
  ).sort((a, b) => a - b);
}

export async function getForumViewerContext(
  supabase: SupabaseClient,
): Promise<ForumViewerContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      isStaff: false,
      characterId: null,
      membership: null,
    };
  }

  const { data: staffResult } =
    await supabase.rpc("current_user_is_staff");

  const isStaff = staffResult === true;

  const { data: characterData } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle<CharacterRow>();

  if (!characterData) {
    return {
      userId: user.id,
      isStaff,
      characterId: null,
      membership: null,
    };
  }

  const { data: membershipData } = await supabase
    .from("order_memberships")
    .select(`
      order_id,
      level:order_levels!order_memberships_order_level_id_fkey(
        level
      )
    `)
    .eq("character_id", characterData.id)
    .limit(1)
    .maybeSingle<MembershipRow>();

  const levelRecord = membershipData
    ? one(membershipData.level)
    : null;

  const level =
    levelRecord &&
    isOrderLevel(levelRecord.level)
      ? levelRecord.level
      : null;

  return {
    userId: user.id,
    isStaff,
    characterId: characterData.id,
    membership:
      membershipData && level !== null
        ? {
            orderId: membershipData.order_id,
            level,
          }
        : null,
  };
}

export function isOrderHeadFor(
  viewer: ForumViewerContext,
  orderId: string,
): boolean {
  return (
    viewer.membership?.orderId === orderId &&
    viewer.membership.level === 5
  );
}

export function canAccessOrderSection(
  viewer: ForumViewerContext,
  orderId: string | null,
): boolean {
  if (!orderId) {
    return true;
  }

  if (viewer.isStaff) {
    return true;
  }

  return viewer.membership?.orderId === orderId;
}

export function canCreateOrderTopic(
  viewer: ForumViewerContext,
  orderId: string,
): boolean {
  return (
    viewer.isStaff ||
    viewer.membership?.orderId === orderId
  );
}

export function canManageOrderTopic(
  viewer: ForumViewerContext,
  orderId: string,
  authorUserId: string | null,
): boolean {
  if (viewer.isStaff) {
    return true;
  }

  if (
    viewer.userId &&
    authorUserId === viewer.userId &&
    viewer.membership?.orderId === orderId
  ) {
    return true;
  }

  return isOrderHeadFor(viewer, orderId);
}

export function canViewOrderTopic({
  viewer,
  orderId,
  visibleLevels,
}: {
  viewer: ForumViewerContext;
  orderId: string;
  visibleLevels: number[] | null | undefined;
}): boolean {
  if (viewer.isStaff || isOrderHeadFor(viewer, orderId)) {
    return true;
  }

  if (viewer.membership?.orderId !== orderId) {
    return false;
  }

  const levels =
    normaliseStoredVisibleLevels(visibleLevels);

  return levels.includes(
    viewer.membership.level,
  );
}
