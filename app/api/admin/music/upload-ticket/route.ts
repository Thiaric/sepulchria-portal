import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  canAccessAdminSection,
  getStaffSession,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "music";
const MAX = 30 * 1024 * 1024;
const TYPES = new Set([
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
]);

function bad(
  error: string,
  status = 400,
) {
  return NextResponse.json(
    { error },
    { status },
  );
}

async function allowed() {
  const staff =
    await getStaffSession();

  return (
    !!staff &&
    canAccessAdminSection(
      staff.role,
      "music",
    )
  );
}

function ext(type: string) {
  return (
    {
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/mp4": "m4a",
      "audio/aac": "aac",
    } as Record<string, string>
  )[type] ?? "bin";
}

export async function POST(
  req: NextRequest,
) {
  if (!(await allowed())) {
    return bad(
      "Not authorised.",
      403,
    );
  }

  const body =
    (await req.json()) as {
      track_key?: string;
      mime_type?: string;
      file_size_bytes?: number;
    };

  const key = String(
    body.track_key ?? "",
  )
    .trim()
    .toLowerCase();

  const mimeType = String(
    body.mime_type ?? "",
  );

  const fileSize = Number(
    body.file_size_bytes ?? 0,
  );

  if (
    !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(
      key,
    )
  ) {
    return bad(
      "Invalid track key.",
    );
  }

  if (!TYPES.has(mimeType)) {
    return bad(
      "Unsupported audio type.",
    );
  }

  if (
    !Number.isFinite(fileSize) ||
    fileSize <= 0 ||
    fileSize > MAX
  ) {
    return bad(
      "Audio files must be 30 MB or smaller.",
    );
  }

  const admin =
    createAdminClient();

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("music_tracks")
    .select("id")
    .eq("track_key", key)
    .maybeSingle();

  if (existingError) {
    return bad(
      existingError.message,
      500,
    );
  }

  if (existing) {
    return bad(
      "That track key already exists.",
      409,
    );
  }

  const path =
    `tracks/${key}.${ext(mimeType)}`;

  const {
    data,
    error,
  } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    return bad(
      error?.message ??
        "Unable to authorise audio upload.",
      500,
    );
  }

  return NextResponse.json({
    path,
    token: data.token,
  });
}
