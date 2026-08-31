import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminSection, getStaffSession } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "music";
const MAX = 30 * 1024 * 1024;
const TYPES = new Set(["audio/mpeg","audio/ogg","audio/wav","audio/x-wav","audio/mp4","audio/aac"]);

function bad(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
async function allowed() {
  const staff = await getStaffSession();
  return !!staff && canAccessAdminSection(staff.role, "music");
}
function ext(type: string) {
  return ({"audio/mpeg":"mp3","audio/ogg":"ogg","audio/wav":"wav","audio/x-wav":"wav","audio/mp4":"m4a","audio/aac":"aac"} as Record<string,string>)[type] ?? "bin";
}
async function tracks() {
  return createAdminClient().from("music_tracks")
    .select("id, track_key, name, description, storage_path, original_file_name, mime_type, file_size_bytes, is_active, is_personal_selectable, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true }).order("name", { ascending: true });
}

export async function GET() {
  if (!(await allowed())) return bad("Not authorised.", 403);
  const r = await tracks();
  if (r.error) return bad(r.error.message, 500);
  return NextResponse.json({ tracks: r.data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);

  const body = await req.json();

  const key = String(body.track_key ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const mimeType = String(body.mime_type ?? "");
  const fileSize = Number(body.file_size_bytes ?? 0);
  const sort = Number(body.sort_order ?? 0);
  const path = String(body.storage_path ?? "");

  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key)) return bad("Invalid track key.");
  if (!name) return bad("Track name is required.");
  if (!TYPES.has(mimeType)) return bad("Unsupported audio type.");
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX) {
    return bad("Audio files must be 30 MB or smaller.");
  }
  if (!Number.isInteger(sort)) return bad("Sort order must be a whole number.");

  const expectedPath = `tracks/${key}.${ext(mimeType)}`;

  if (path !== expectedPath) {
    return bad("Invalid uploaded storage path.");
  }

  const admin = createAdminClient();

  const inserted = await admin.from("music_tracks").insert({
    track_key: key,
    name,
    description: String(body.description ?? "").trim(),
    storage_path: path,
    original_file_name: String(body.original_file_name ?? "").trim() || null,
    mime_type: mimeType,
    file_size_bytes: fileSize,
    is_active: body.is_active === true,
    is_personal_selectable: body.is_personal_selectable === true,
    sort_order: sort,
  });

  if (inserted.error) {
    await admin.storage.from(BUCKET).remove([path]);
    return bad(inserted.error.message, 500);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);
  const body = await req.json();
  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim();
  const sort = Number(body.sort_order ?? 0);
  if (!id || !name) return bad("Track ID and name are required.");
  if (!Number.isInteger(sort)) return bad("Sort order must be a whole number.");

  const r = await createAdminClient().from("music_tracks").update({
    name,
    description: String(body.description ?? "").trim(),
    is_active: body.is_active === true,
    is_personal_selectable: body.is_personal_selectable === true,
    sort_order: sort,
  }).eq("id", id);
  if (r.error) return bad(r.error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await allowed())) return bad("Not authorised.", 403);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("Track ID is required.");
  const admin = createAdminClient();

  const track = await admin.from("music_tracks").select("id, storage_path").eq("id", id).maybeSingle();
  if (track.error) return bad(track.error.message, 500);
  if (!track.data) return bad("Track not found.", 404);

  const [rooms, owners] = await Promise.all([
    admin.from("rooms").select("id, name").eq("music_track_id", id).order("name", { ascending: true }),
    admin.from("character_music_entitlements").select("id", { count: "exact", head: true }).eq("music_track_id", id).eq("enabled", true),
  ]);
  if (rooms.error || owners.error) return bad((rooms.error ?? owners.error)!.message, 500);
  if ((rooms.data ?? []).length > 0) {
    return bad(
      `Remove this track from: ${(rooms.data ?? []).map((room) => room.name).join(", ")}.`,
      409,
    );
  }
  if ((owners.count ?? 0) > 0) return bad("Revoke character ownership before deleting this track.", 409);

  const deleted = await admin.from("music_tracks").delete().eq("id", id);
  if (deleted.error) return bad(deleted.error.message, 500);
  const storage = await admin.storage.from(BUCKET).remove([track.data.storage_path]);
  if (storage.error) return bad(`Database record deleted, but audio cleanup failed: ${storage.error.message}`, 500);
  return NextResponse.json({ ok: true });
}
