from pathlib import Path
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED = "4b1d1442e082b2d967ac7cb45b92f09756acc7a9"

def stop(msg):
    print(f"\nERROR: {msg}\n")
    sys.exit(1)

def load(path):
    p = ROOT / path
    if not p.exists():
        stop(f"Missing {path}")
    return p.read_text(encoding="utf-8")

def save(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print(f"updated {path}")

def once(text, old, new, label):
    if old not in text:
        stop(f"Could not find expected block: {label}")
    return text.replace(old, new, 1)

head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
if head != EXPECTED:
    stop(f"Expected HEAD {EXPECTED}, found {head}")

print("Applying Sepulchria Background Music Phase 1...")

p = "lib/auth/admin-section-access.ts"
t = load(p)
t = once(t, '  | "expertise"\n  | "gifts"', '  | "expertise"\n  | "features"\n  | "gifts"', "features union")
t = once(t, '  expertise: ["owner", "admin", "master"],\n  gifts: ["owner"],',
         '  expertise: ["owner", "admin", "master"],\n  features: ["owner"],\n  gifts: ["owner"],',
         "features roles")
save(p, t)

p = "app/(portal)/admin/layout.tsx"
t = load(p)
marker = '''            {can("gifts") ? (
              <AdminNavigationLink href="/admin/gifts">
                Feats
              </AdminNavigationLink>
            ) : null}
'''
insert = '''            {can("features") ? (
              <AdminNavigationLink href="/admin/features">
                Features
              </AdminNavigationLink>
            ) : null}

''' + marker
t = once(t, marker, insert, "features nav")
save(p, t)

p = "components/portal/admin-context-panel.tsx"
t = load(p)
t = once(t, '  | "experience"\n  | "trophies"', '  | "experience"\n  | "features"\n  | "trophies"', "context union")
t = once(t,
'''  if (pathname === "/admin/experience") {
    return "experience";
  }

  if (pathname === "/admin/trophies") {''',
'''  if (pathname === "/admin/experience") {
    return "experience";
  }

  if (pathname === "/admin/features") {
    return "features";
  }

  if (pathname === "/admin/trophies") {''',
"context route")
save(p, t)

save("app/(portal)/admin/features/page.tsx", '''import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MusicFeatureManager,
  type MusicTrackAdminRow,
} from "@/components/admin/music-feature-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminFeaturesPage() {
  await requireAdminSection("features");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("music_tracks")
    .select("id, track_key, name, description, storage_path, original_file_name, mime_type, file_size_bytes, is_active, is_personal_selectable, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`Unable to load Background Music: ${error.message}`);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Administration</p>
        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Features</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">Manage optional and collectible portal features.</p>
        <MusicFeatureManager initialTracks={(data ?? []) as MusicTrackAdminRow[]} />
      </div>
    </main>
  );
}
''')

save("components/admin/music-feature-manager.tsx", '''"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type MusicTrackAdminRow = {
  id: string;
  track_key: string;
  name: string;
  description: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  is_active: boolean;
  is_personal_selectable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const input = "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]";
const button = "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] disabled:opacity-45";

function sizeLabel(bytes: number | null) {
  if (bytes == null) return "Unknown size";
  return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
}

export function MusicFeatureManager({ initialTracks }: { initialTracks: MusicTrackAdminRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [tracks, setTracks] = useState(initialTracks);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function reload() {
    const r = await fetch("/api/admin/music", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Unable to refresh music.");
    setTracks(d.tracks ?? []);
    router.refresh();
  }

  async function upload(fd: FormData) {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const r = await fetch("/api/admin/music", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Unable to upload track.");
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Music track uploaded.");
      await reload();
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Unable to upload track.");
    } finally { setBusy(false); }
  }

  async function update(track: MusicTrackAdminRow, fd: FormData) {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const r = await fetch("/api/admin/music", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: track.id,
          name: String(fd.get("name") ?? ""),
          description: String(fd.get("description") ?? ""),
          sort_order: Number(fd.get("sort_order") ?? 0),
          is_active: fd.get("is_active") === "on",
          is_personal_selectable: fd.get("is_personal_selectable") === "on",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Unable to save track.");
      setMessage("Track saved.");
      await reload();
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Unable to save track.");
    } finally { setBusy(false); }
  }

  async function remove(track: MusicTrackAdminRow) {
    if (!window.confirm(`Delete "${track.name}" permanently?`)) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const r = await fetch(`/api/admin/music?id=${encodeURIComponent(track.id)}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Unable to delete track.");
      setMessage("Track deleted.");
      await reload();
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Unable to delete track.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))]">Collectible feature</p>
        <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Background Music</h3>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">Upload location tracks and collectible personal tracks. Shop pricing comes later.</p>
      </header>

      {message ? <div className={`mx-5 mt-5 border px-4 py-3 text-xs ${failed ? "border-red-800/55 text-red-200" : "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-c5d7bd))]"}`}>{message}</div> : null}

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/30 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form action={(fd) => void upload(fd)} className="bg-[rgb(var(--sep-colour-17110d))] p-5">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">Add Track</p>
          <div className="mt-4 space-y-3">
            <input name="track_key" required pattern="[a-z0-9]+(?:_[a-z0-9]+)*" placeholder="moonlit_sepulchria" className={input} />
            <input name="name" required placeholder="Moonlit Sepulchria" className={input} />
            <textarea name="description" rows={3} maxLength={1500} placeholder="Description" className={`${input} resize-y`} />
            <input ref={fileRef} name="file" type="file" required accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac" className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]" />
            <p className="text-[8px] text-[rgb(var(--sep-colour-6f6252))]">MP3, OGG, WAV, M4A/MP4 or AAC - max 30 MB</p>
            <input name="sort_order" type="number" defaultValue={0} className={input} />
            <label className="flex gap-2 text-xs"><input type="checkbox" name="is_active" defaultChecked /> Active</label>
            <label className="flex gap-2 text-xs"><input type="checkbox" name="is_personal_selectable" defaultChecked /> Personal selectable</label>
            <button disabled={busy} className={button}>{busy ? "Working..." : "Upload Track"}</button>
          </div>
        </form>

        <div className="bg-[rgb(var(--sep-colour-120d0a))] p-5">
          <h4 className="font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Music Catalogue - {tracks.length}</h4>
          <div className="mt-4 space-y-3">
            {tracks.map((track) => (
              <form key={track.id} action={(fd) => void update(track, fd)} className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))]">{track.name}</p>
                    <p className="font-mono text-[9px] text-[rgb(var(--sep-colour-6f665b))]">{track.track_key}</p>
                    <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-746958))]">{track.original_file_name ?? track.storage_path} - {sizeLabel(track.file_size_bytes)}</p>
                  </div>
                  <span className="text-[7px] uppercase text-[rgb(var(--sep-colour-b59b74))]">{track.is_personal_selectable ? "Personal" : "Location only"}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input name="name" required defaultValue={track.name} className={input} />
                  <input name="sort_order" type="number" defaultValue={track.sort_order} className={input} />
                  <textarea name="description" rows={2} defaultValue={track.description} className={`${input} resize-y md:col-span-2`} />
                </div>
                <div className="mt-3 flex flex-wrap gap-5 text-xs">
                  <label className="flex gap-2"><input type="checkbox" name="is_active" defaultChecked={track.is_active} /> Active</label>
                  <label className="flex gap-2"><input type="checkbox" name="is_personal_selectable" defaultChecked={track.is_personal_selectable} /> Personal selection</label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" disabled={busy} onClick={() => void remove(track)} className="border border-red-900/60 px-3 py-2 text-[7px] uppercase text-red-300 disabled:opacity-45">Delete</button>
                  <button disabled={busy} className={button}>Save Track</button>
                </div>
              </form>
            ))}
            {tracks.length === 0 ? <p className="py-8 text-center text-xs text-[rgb(var(--sep-colour-746958))]">No music tracks yet.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
''')

save("app/api/admin/music/route.ts", '''import { NextRequest, NextResponse } from "next/server";
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
''')

print("\nPhase 1 patch applied.")
print("Next: npm run build")
