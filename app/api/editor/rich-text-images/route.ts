import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getStaffSession } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "rich-text-images";
const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

async function requireImageStaff() {
  const staff = await getStaffSession();

  if (
    !staff ||
    !["owner", "admin", "master"].includes(
      staff.role,
    )
  ) {
    return null;
  }

  return staff;
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

export async function GET(
  request: NextRequest,
) {
  const staff =
    await requireImageStaff();

  if (!staff) {
    return bad(
      "Not authorised.",
      403,
    );
  }

  if (
    request.nextUrl.searchParams.get(
      "probe",
    ) === "1"
  ) {
    return NextResponse.json({
      ok: true,
      canUpload: true,
    });
  }

  const q =
    String(
      request.nextUrl.searchParams.get(
        "q",
      ) ?? "",
    )
      .trim()
      .slice(0, 120);

  const limit = Math.min(
    200,
    Math.max(
      1,
      Number(
        request.nextUrl.searchParams.get(
          "limit",
        ) ?? 100,
      ) || 100,
    ),
  );

  const admin =
    createAdminClient();

  let query =
    admin
      .from("rich_text_images")
      .select(
        "id, public_url, original_name, mime_type, size_bytes, sha256, created_at",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(limit);

  if (q) {
    query =
      query.ilike(
        "original_name",
        `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
      );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    return bad(
      error.message,
      500,
    );
  }

  return NextResponse.json({
    ok: true,
    images: data ?? [],
  });
}

export async function POST(
  request: NextRequest,
) {
  const staff =
    await requireImageStaff();

  if (!staff) {
    return bad(
      "Not authorised.",
      403,
    );
  }

  const formData =
    await request.formData();

  const file =
    formData.get("file");

  if (!(file instanceof File)) {
    return bad(
      "Choose an image.",
    );
  }

  if (
    file.size <= 0 ||
    file.size > MAX_BYTES
  ) {
    return bad(
      "Images cannot exceed 8 MB.",
    );
  }

  const extension =
    ALLOWED_TYPES.get(
      file.type,
    );

  if (!extension) {
    return bad(
      "Images must be PNG, JPEG, WEBP or GIF.",
    );
  }

  const bytes =
    Buffer.from(
      await file.arrayBuffer(),
    );

  const sha256 =
    createHash("sha256")
      .update(bytes)
      .digest("hex");

  const admin =
    createAdminClient();

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("rich_text_images")
    .select(
      "id, public_url, original_name, mime_type, size_bytes, sha256, created_at",
    )
    .eq(
      "sha256",
      sha256,
    )
    .maybeSingle();

  if (existingError) {
    return bad(
      existingError.message,
      500,
    );
  }

  if (existing) {
    return NextResponse.json({
      ok: true,
      reused: true,
      image: existing,
    });
  }

  const storagePath =
    `${sha256}.${extension}`;

  const {
    error: uploadError,
  } = await admin.storage
    .from(BUCKET)
    .upload(
      storagePath,
      bytes,
      {
        contentType:
          file.type,
        upsert: false,
        cacheControl: "31536000",
      },
    );

  if (
    uploadError &&
    !uploadError.message
      .toLowerCase()
      .includes("already exists")
  ) {
    return bad(
      uploadError.message,
      500,
    );
  }

  const publicUrl =
    admin.storage
      .from(BUCKET)
      .getPublicUrl(
        storagePath,
      )
      .data.publicUrl;

  const {
    data: inserted,
    error: insertError,
  } = await admin
    .from("rich_text_images")
    .insert({
      sha256,
      storage_path:
        storagePath,
      public_url:
        publicUrl,
      original_name:
        file.name ||
        `clipboard.${extension}`,
      mime_type:
        file.type,
      size_bytes:
        file.size,
      uploaded_by_user_id:
        staff.userId,
    })
    .select(
      "id, public_url, original_name, mime_type, size_bytes, sha256, created_at",
    )
    .single();

  if (insertError) {
    if (
      insertError.code ===
      "23505"
    ) {
      const {
        data: raced,
      } = await admin
        .from("rich_text_images")
        .select(
          "id, public_url, original_name, mime_type, size_bytes, sha256, created_at",
        )
        .eq(
          "sha256",
          sha256,
        )
        .maybeSingle();

      if (raced) {
        return NextResponse.json({
          ok: true,
          reused: true,
          image: raced,
        });
      }
    }

    return bad(
      insertError.message,
      500,
    );
  }

  return NextResponse.json({
    ok: true,
    reused: false,
    image: inserted,
  });
}
