import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

export async function getStaffSession(): Promise<
  StaffSession | null
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

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
}

export async function requireStaff(): Promise<StaffSession> {
  const session =
    await getStaffSession();

  if (!session) {
    redirect("/");
  }

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
    redirect("/admin");
  }

  return session;
}