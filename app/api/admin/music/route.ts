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
  return !!staff && canAccessAdminSection(staff.role, "features");
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
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return bad("Choose an audio file.");
  if (!TYPES.has(file.type)) return bad("Unsupported audio type.");
  if (file.size <= 0 || file.size > MAX) return bad("Audio files must be 30 MB or smaller.");

  const key = String(fd.get("track_key") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key)) return bad("Invalid track key.");
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return bad("Track name is required.");
  const sort = Number(fd.get("sort_order") ?? 0);
  if (!Number.isInteger(sort)) return bad("Sort order must be a whole number.");

  const admin = createAdminClient();
  const path = `tracks/${key}.${ext(file.type)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploaded = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (uploaded.error) return bad(`Unable to store audio: ${uploaded.error.message}`, 500);

  const inserted = await admin.from("music_tracks").insert({
    track_key: key,
    name,
    description: String(fd.get("description") ?? "").trim(),
    storage_path: path,
    original_file_name: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    is_active: fd.get("is_active") === "on",
    is_personal_selectable: fd.get("is_personal_selectable") === "on",
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
    admin.from("rooms").select("id", { count: "exact", head: true }).eq("music_track_id", id),
    admin.from("character_music_entitlements").select("id", { count: "exact", head: true }).eq("music_track_id", id).eq("enabled", true),
  ]);
  if (rooms.error || owners.error) return bad((rooms.error ?? owners.error)!.message, 500);
  if ((rooms.count ?? 0) > 0) return bad("Remove this track from its locations before deleting it.", 409);
  if ((owners.count ?? 0) > 0) return bad("Revoke character ownership before deleting this track.", 409);

  const deleted = await admin.from("music_tracks").delete().eq("id", id);
  if (deleted.error) return bad(deleted.error.message, 500);
  const storage = await admin.storage.from(BUCKET).remove([track.data.storage_path]);
  if (storage.error) return bad(`Database record deleted, but audio cleanup failed: ${storage.error.message}`, 500);
  return NextResponse.json({ ok: true });
}
