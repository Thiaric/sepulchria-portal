import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "@/lib/auth/require-staff";

import {
  ORDER_LEVELS,
  isOrderLevel,
  type OrderLevel,
} from "@/lib/forum/order-levels";

export type ForumOrderMembership = {
  orderId: string;
  level: OrderLevel;
};

export type ForumViewerContext = {
  userId: string | null;
  isStaff: boolean;
  staffRole: StaffRole | null;
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
 * Level 6 Head / Staff:
 *   may choose any non-empty combination of Levels 1–6.
 *
 * Level 5:
 *   Levels 5 and 6 are forced; 1–4 are optional.
 *
 * Level 4:
 *   Levels 4,5,6 are forced; 1–3 are optional.
 *
 * ...and so on.
 *
 * Level 1 therefore always produces 1–6.
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
      staffRole: null,
      characterId: null,
      membership: null,
    };
  }

  const { data: staffMember } =
    await supabase
      .from("staff_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle<{ role: StaffRole }>();

  const staffRole =
    staffMember?.role === "owner" ||
    staffMember?.role === "admin" ||
    staffMember?.role === "moderator" ||
    staffMember?.role === "master"
      ? staffMember.role
      : null;

  const isStaff = staffRole !== null;

  const { data: characterData } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle<CharacterRow>();

  if (!characterData) {
    return {
      userId: user.id,
      isStaff,
      staffRole,
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
    staffRole,
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
    viewer.membership.level === 6
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

export type ForumStaffSectionRole =
  | "admin"
  | "moderator"
  | "master";

export type ForumSectionAccessRecord = {
  visibility: string;
  order_id: string | null;
  staff_read_roles?: string[] | null;
  staff_write_roles?: string[] | null;
};

const FORUM_STAFF_SECTION_ROLES: ForumStaffSectionRole[] = [
  "admin",
  "moderator",
  "master",
];

function normaliseForumStaffRoles(
  value: string[] | null | undefined,
): ForumStaffSectionRole[] {
  if (value == null) {
    return [...FORUM_STAFF_SECTION_ROLES];
  }

  return Array.from(
    new Set(
      value.filter(
        (role): role is ForumStaffSectionRole =>
          role === "admin" ||
          role === "moderator" ||
          role === "master",
      ),
    ),
  );
}

function staffRoleAllowed(
  viewer: ForumViewerContext,
  roles: string[] | null | undefined,
): boolean {
  if (viewer.staffRole === "owner") {
    return true;
  }

  if (
    viewer.staffRole !== "admin" &&
    viewer.staffRole !== "moderator" &&
    viewer.staffRole !== "master"
  ) {
    return false;
  }

  return normaliseForumStaffRoles(roles).includes(
    viewer.staffRole,
  );
}

export function canReadForumSection(
  viewer: ForumViewerContext,
  section: ForumSectionAccessRecord,
): boolean {
  if (section.visibility === "staff") {
    return staffRoleAllowed(
      viewer,
      section.staff_read_roles,
    );
  }

  return canAccessOrderSection(
    viewer,
    section.order_id,
  );
}

export function canWriteForumSection(
  viewer: ForumViewerContext,
  section: ForumSectionAccessRecord,
): boolean {
  if (section.visibility === "staff") {
    return (
      staffRoleAllowed(
        viewer,
        section.staff_read_roles,
      ) &&
      staffRoleAllowed(
        viewer,
        section.staff_write_roles,
      )
    );
  }

  return canAccessOrderSection(
    viewer,
    section.order_id,
  );
}

