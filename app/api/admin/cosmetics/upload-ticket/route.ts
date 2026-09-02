import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminSection, getStaffSession } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "cosmetics";
const MAX = 10 * 1024 * 1024;
const PREVIEW_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/svg+xml"]);
const ASSET_TYPES = new Set(["image/png", "image/webp", "image/svg+xml"]);

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function allowed() {
  const staff = await getStaffSession();
  return !!staff && canAccessAdminSection(staff.role, "cosmetics");
}

function extension(mimeType: string) {
  return ({
    "image/png": "png",
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/svg+xml": "svg",
  } as Record<string, string>)[mimeType] ?? "bin";
}

export async function POST(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);

  const body = (await req.json()) as {
    slug?: string;
    kind?: "preview" | "asset";
    mime_type?: string;
    file_size_bytes?: number;
    replace_existing?: boolean;
  };

  const slug = String(body.slug ?? "").trim().toLowerCase();
  const kind = String(body.kind ?? "");
  const mimeType = String(body.mime_type ?? "");
  const fileSize = Number(body.file_size_bytes ?? 0);
  const replaceExisting = body.replace_existing === true;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return bad("Invalid cosmetic slug.");
  if (kind !== "preview" && kind !== "asset") return bad("Invalid cosmetic upload type.");

  const allowedTypes = kind === "asset" ? ASSET_TYPES : PREVIEW_TYPES;
  if (!allowedTypes.has(mimeType)) {
    return bad(
      kind === "asset"
        ? "Cosmetic assets must be PNG, WebP or SVG."
        : "Preview images must be PNG, WebP, JPEG or SVG.",
    );
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX) {
    return bad("Cosmetic image files must be 10 MB or smaller.");
  }

  const admin = createAdminClient();
  const existing = await admin
    .from("cosmetic_items")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing.error) return bad(existing.error.message, 500);
  if (existing.data && !replaceExisting) {
    return bad("That cosmetic slug already exists.", 409);
  }
  if (!existing.data && replaceExisting) {
    return bad("That cosmetic does not exist.", 404);
  }

  const folder = kind === "asset" ? "assets" : "previews";
  const path = replaceExisting
    ? `${folder}/${slug}-${Date.now()}.${extension(mimeType)}`
    : `${folder}/${slug}.${extension(mimeType)}`;

  const ticket = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (ticket.error || !ticket.data?.token) {
    return bad(ticket.error?.message ?? "Unable to authorise cosmetic upload.", 500);
  }

  return NextResponse.json({ path, token: ticket.data.token });
}
