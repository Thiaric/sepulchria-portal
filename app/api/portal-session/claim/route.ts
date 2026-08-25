import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Your login is no longer valid. Please sign in again.",
      },
      { status: 401 },
    );
  }

  const body =
    (await request
      .json()
      .catch(() => null)) as
      | { instanceId?: unknown }
      | null;

  const instanceId =
    typeof body?.instanceId === "string"
      ? body.instanceId
      : "";

  if (!UUID_PATTERN.test(instanceId)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Invalid portal session identifier.",
      },
      { status: 400 },
    );
  }

  const now =
    new Date().toISOString();

  const admin =
    createAdminClient();

  const { error } =
    await admin
      .from("portal_active_sessions")
      .upsert(
        {
          user_id: user.id,
          portal_instance_id:
            instanceId,
          claimed_at: now,
          last_seen_at: now,
        },
        {
          onConflict: "user_id",
        },
      );

  if (error) {
    console.error(
      "Unable to claim active portal login:",
      error.message,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Unable to establish the active Sepulchria login.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
