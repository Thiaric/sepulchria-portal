import type { SupabaseClient } from "@supabase/supabase-js";

export type ClientForumStaffRole =
  | "owner"
  | "admin"
  | "moderator"
  | "master";

export type ClientForumAccessContext = {
  isStaff: boolean;
  staffRole: ClientForumStaffRole | null;
  orderId: string | null;
};

export type ClientForumSectionAccess = {
  visibility: string;
  order_id: string | null;
  staff_read_roles?: string[] | null;
};

function normaliseStaffReadRoles(
  roles: string[] | null | undefined,
): Array<"admin" | "moderator" | "master"> {
  if (roles == null) {
    return [
      "admin",
      "moderator",
      "master",
    ];
  }

  return roles.filter(
    (
      role,
    ): role is
      | "admin"
      | "moderator"
      | "master" =>
      role === "admin" ||
      role === "moderator" ||
      role === "master",
  );
}

export function canClientReadForumSection(
  context: ClientForumAccessContext,
  section: ClientForumSectionAccess,
): boolean {
  if (section.visibility === "staff") {
    if (context.staffRole === "owner") {
      return true;
    }

    if (
      context.staffRole !== "admin" &&
      context.staffRole !== "moderator" &&
      context.staffRole !== "master"
    ) {
      return false;
    }

    return normaliseStaffReadRoles(
      section.staff_read_roles,
    ).includes(context.staffRole);
  }

  if (!section.order_id) {
    return true;
  }

  if (context.isStaff) {
    return true;
  }

  return context.orderId === section.order_id;
}

export async function getClientForumAccessContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClientForumAccessContext> {
  const [
    staffResult,
    characterResult,
  ] = await Promise.all([
    supabase
      .from("staff_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("characters")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const role =
    staffResult.data?.role;

  const staffRole:
    ClientForumStaffRole | null =
    role === "owner" ||
    role === "admin" ||
    role === "moderator" ||
    role === "master"
      ? role
      : null;

  let orderId: string | null = null;

  if (characterResult.data?.id) {
    const { data: membership } =
      await supabase
        .from("order_memberships")
        .select("order_id")
        .eq(
          "character_id",
          characterResult.data.id,
        )
        .limit(1)
        .maybeSingle();

    orderId =
      membership?.order_id ?? null;
  }

  return {
    isStaff: staffRole !== null,
    staffRole,
    orderId,
  };
}
