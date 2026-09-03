import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  action?: "status" | "read";
  notificationIds?: unknown;
};

function normaliseIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.length > 0,
        )
        .slice(0, 500),
    ),
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const ids = normaliseIds(body.notificationIds);

  if (body.action !== "status" && body.action !== "read") {
    return NextResponse.json(
      { ok: false, error: "Invalid action." },
      { status: 400 },
    );
  }

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, readIds: [] });
  }

  const admin = createAdminClient();

  if (body.action === "status") {
    const { data, error } = await admin
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id)
      .in("notification_id", ids);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      readIds: (data ?? []).map((row) => row.notification_id),
    });
  }

  const readAt = new Date().toISOString();
  const { error } = await admin
    .from("notification_reads")
    .upsert(
      ids.map((notificationId) => ({
        user_id: user.id,
        notification_id: notificationId,
        viewed_at: readAt,
      })),
      { onConflict: "user_id,notification_id" },
    );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, readIds: ids });
}
