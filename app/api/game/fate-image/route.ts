import { NextRequest, NextResponse } from "next/server";

import { getStaffSession } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "fate-images";
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

async function allowed() {
  const staff = await getStaffSession();

  return (
    staff !== null &&
    ["owner", "admin", "master"].includes(
      staff.role,
    )
  );
}

function bad(
  error: string,
  status = 400,
) {
  return NextResponse.json(
    { error },
    { status },
  );
}

export async function POST(
  request: NextRequest,
) {
  if (!(await allowed())) {
    return bad("Not authorised.", 403);
  }

  const formData =
    await request.formData();

  const file =
    formData.get("file");

  const roomId =
    String(
      formData.get("room_id") ?? "",
    ).trim();

  if (!roomId) {
    return bad("Room ID is required.");
  }

  if (!(file instanceof File)) {
    return bad("Choose an image.");
  }

  if (
    file.size <= 0 ||
    file.size > MAX_BYTES
  ) {
    return bad(
      "Fate images cannot exceed 5 MB.",
    );
  }

  const extension =
    ALLOWED_TYPES.get(file.type);

  if (!extension) {
    return bad(
      "Fate images must be PNG, JPEG, WEBP or GIF.",
    );
  }

  const admin =
    createAdminClient();

  const path =
    `${roomId}/${crypto.randomUUID()}.${extension}`;

  const {
    error: uploadError,
  } = await admin.storage
    .from(BUCKET)
    .upload(
      path,
      await file.arrayBuffer(),
      {
        contentType: file.type,
        upsert: false,
      },
    );

  if (uploadError) {
    return bad(
      uploadError.message,
      500,
    );
  }

  const publicUrl =
    admin.storage
      .from(BUCKET)
      .getPublicUrl(path)
      .data.publicUrl;

  return NextResponse.json({
    ok: true,
    path,
    publicUrl,
  });
}

export async function DELETE(
  request: NextRequest,
) {
  if (!(await allowed())) {
    return bad("Not authorised.", 403);
  }

  const body =
    await request.json();

  const path =
    String(
      body.path ?? "",
    ).trim();

  if (!path) {
    return bad("Image path is required.");
  }

  const admin =
    createAdminClient();

  const result =
    await admin.storage
      .from(BUCKET)
      .remove([path]);

  if (result.error) {
    return bad(
      result.error.message,
      500,
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
