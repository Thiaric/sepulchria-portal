import { NextResponse } from "next/server";

import {
  canAccessAdminSection,
  getStaffSession,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await getStaffSession();

  if (!staff || !canAccessAdminSection(staff.role, "orders")) {
    return NextResponse.json({ count: 0 }, { status: 403 });
  }

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("order_submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    console.error("Unable to count pending Order submissions:", error.message);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
