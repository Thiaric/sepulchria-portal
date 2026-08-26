import {
  NextResponse,
} from "next/server";

import {
  canAccessAdminSection,
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const staff =
    await getStaffSession();

  if (
    !staff ||
    !canAccessAdminSection(
      staff.role,
      "new_register",
    )
  ) {
    return NextResponse.json(
      { count: 0 },
      { status: 403 },
    );
  }

  const admin =
    createAdminClient();

  const {
    count,
    error,
  } = await admin
    .from(
      "registration_applications",
    )
    .select(
      "id",
      {
        count: "exact",
        head: true,
      },
    )
    .eq(
      "status",
      "pending",
    );

  if (error) {
    console.error(
      "Unable to count pending registration applications:",
      error.message,
    );

    return NextResponse.json(
      { count: 0 },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      count:
        count ?? 0,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
