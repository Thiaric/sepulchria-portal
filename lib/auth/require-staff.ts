import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { setAuditActorContext } from "@/lib/audit/actor-context";

export type StaffRole =
  | "owner"
  | "admin"
  | "moderator"
  | "master";

export type StaffSession = {
  userId: string;
  email: string | null;
  role: StaffRole;
};

export type AdminSection =
  | "overview"
  | "races"
  | "areas"
  | "associations"
  | "codex"
  | "characters"
  | "events"
  | "expertise"
  | "gifts"
  | "items"
  | "jobs"
  | "market"
  | "forum"
  | "communication_logs"
  | "character_logs"
  | "safety"
  | "rooms"
  | "orders"
  | "rules"
  | "shapes"
  | "tidings"
  | "tickets"
  | "sanctions"
  | "media"
  | "users"
  | "new_register"
  | "world";

export type StaffCapability =
  | "character_edit"
  | "character_delete"
  | "character_economy"
  | "character_warping"
  | "character_age_admin";

const STAFF_ROLES: StaffRole[] = [
  "owner",
  "admin",
  "moderator",
  "master",
];

const ADMIN_ROLES: StaffRole[] = [
  "owner",
  "admin",
];

const SECTION_ROLES: Record<
  AdminSection,
  readonly StaffRole[]
> = {
  overview: ["owner"],
  races: ["owner"],
  areas: ["owner"],
  associations: ["owner"],
  codex: ["owner", "admin"],
  characters: ["owner", "admin", "moderator", "master"],
  events: ["owner", "admin", "master"],
  expertise: ["owner", "admin", "master"],
  gifts: ["owner"],
  items: ["owner"],
  jobs: ["owner"],
  market: ["owner", "admin"],
  forum: ["owner", "admin", "moderator"],
  communication_logs: ["owner", "admin", "moderator"],
  character_logs: ["owner", "admin", "moderator"],
  safety: ["owner"],
  rooms: ["owner"],
  orders: ["owner"],
  rules: ["owner"],
  shapes: ["owner"],
  tidings: ["owner", "admin", "moderator", "master"],
  tickets: ["owner", "admin", "moderator", "master"],
  sanctions: ["owner", "admin", "moderator"],
  media: ["owner"],
  users: ["owner"],
  new_register: ["owner"],
  world: ["owner", "admin", "master"],
};

const CAPABILITY_ROLES: Record<
  StaffCapability,
  readonly StaffRole[]
> = {
  character_edit: ["owner", "admin", "master"],
  character_delete: ["owner", "admin"],
  character_economy: ["owner", "admin"],
  character_warping: ["owner", "admin", "master"],
  character_age_admin: ["owner", "admin"],
};

function isStaffRole(
  value: unknown,
): value is StaffRole {
  return (
    typeof value === "string" &&
    STAFF_ROLES.includes(
      value as StaffRole,
    )
  );
}

export function canAccessAdminSection(
  role: StaffRole,
  section: AdminSection,
): boolean {
  return SECTION_ROLES[
    section
  ].includes(role);
}

export function hasStaffCapability(
  role: StaffRole,
  capability: StaffCapability,
): boolean {
  return CAPABILITY_ROLES[
    capability
  ].includes(role);
}

export function canHandleTicketCategory(
  role: StaffRole,
  category: string | null,
): boolean {
  if (role === "master") {
    return category !== "report";
  }

  return true;
}

export function defaultAdminPath(
  role: StaffRole,
): string {
  if (role === "owner") {
    return "/admin";
  }

  return "/admin/characters";
}

export const getStaffSession = cache(async (): Promise<
  StaffSession | null
> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const {
    data: staffMember,
    error: staffError,
  } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    staffError ||
    !staffMember ||
    !isStaffRole(staffMember.role)
  ) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: staffMember.role,
  };
});

export async function requireStaff(): Promise<StaffSession> {
  const session =
    await getStaffSession();

  if (!session) {
    redirect("/");
  }

  setAuditActorContext({
    userId: session.userId,
    role: session.role,
  });

  return session;
}

export async function requireAdmin(): Promise<StaffSession> {
  const session =
    await requireStaff();

  if (
    !ADMIN_ROLES.includes(
      session.role,
    )
  ) {
    redirect(
      defaultAdminPath(
        session.role,
      ),
    );
  }

  return session;
}

export async function requireAdminSection(
  section: AdminSection,
): Promise<StaffSession> {
  const session =
    await requireStaff();

  if (
    !canAccessAdminSection(
      session.role,
      section,
    )
  ) {
    redirect(
      defaultAdminPath(
        session.role,
      ),
    );
  }

  return session;
}

export async function requireStaffCapability(
  capability: StaffCapability,
): Promise<StaffSession> {
  const session =
    await requireStaff();

  if (
    !hasStaffCapability(
      session.role,
      capability,
    )
  ) {
    redirect(
      defaultAdminPath(
        session.role,
      ),
    );
  }

  return session;
}
