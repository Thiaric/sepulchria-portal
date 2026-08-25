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
        reason: "not_authenticated",
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
        reason: "invalid_instance",
      },
      { status: 400 },
    );
  }

  const admin =
    createAdminClient();

  const {
    data: activeSession,
    error,
  } = await admin
    .from("portal_active_sessions")
    .select("portal_instance_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to check active portal login:",
      error.message,
    );

    return NextResponse.json(
      {
        ok: false,
        reason: "server_error",
      },
      { status: 500 },
    );
  }

  if (!activeSession) {
    const now =
      new Date().toISOString();

    const { error: claimError } =
      await admin
        .from("portal_active_sessions")
        .insert({
          user_id: user.id,
          portal_instance_id:
            instanceId,
          claimed_at: now,
          last_seen_at: now,
        });

    if (!claimError) {
      return NextResponse.json({
        ok: true,
        current: true,
      });
    }

    const {
      data: racedSession,
      error: racedError,
    } = await admin
      .from("portal_active_sessions")
      .select("portal_instance_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (racedError) {
      return NextResponse.json(
        {
          ok: false,
          reason: "server_error",
        },
        { status: 500 },
      );
    }

    if (
      racedSession?.portal_instance_id !==
      instanceId
    ) {
      return NextResponse.json(
        {
          ok: false,
          reason: "replaced",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      current: true,
    });
  }

  if (
    activeSession.portal_instance_id !==
    instanceId
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason: "replaced",
      },
      { status: 409 },
    );
  }

  const { error: seenError } =
    await admin
      .from("portal_active_sessions")
      .update({
        last_seen_at:
          new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq(
        "portal_instance_id",
        instanceId,
      );

  if (seenError) {
    console.warn(
      "Unable to update portal login last_seen_at:",
      seenError.message,
    );
  }

  return NextResponse.json({
    ok: true,
    current: true,
  });
}
