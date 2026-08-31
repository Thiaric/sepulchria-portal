"use client";

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
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void upload(
              new FormData(event.currentTarget),
            );
          }}
          className="bg-[rgb(var(--sep-colour-17110d))] p-5"
        >
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">Add Track</p>
          <div className="mt-4 space-y-3">
            <input name="track_key" required pattern="[a-z0-9]+(?:_[a-z0-9]+)*" placeholder="moonlit_sepulchria" className={input} />
            <input name="name" required placeholder="Moonlit Sepulchria" className={input} />
            <textarea name="description" rows={3} maxLength={1500} placeholder="Description" className={`${input} resize-y`} />
            <input ref={fileRef} name="file" type="file" required accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac" className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))]" />
            <p className="text-[8px] text-[rgb(var(--sep-colour-6f6252))]">MP3, OGG, WAV, M4A/MP4 or AAC - max 30 MB</p>
            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Sort order
              </span>
              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className={input}
              />
            </label>
            <label className="flex gap-2 text-xs"><input type="checkbox" name="is_active" defaultChecked /> Active</label>
            <label className="flex gap-2 text-xs"><input type="checkbox" name="is_personal_selectable" defaultChecked /> Personal selectable</label>
            <button
              type="submit"
              disabled={busy}
              className={button}
            >
              {busy ? "Working..." : "Upload Track"}
            </button>
          </div>
        </form>

        <div className="bg-[rgb(var(--sep-colour-120d0a))] p-5">
          <h4 className="font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Music Catalogue - {tracks.length}</h4>
          <div className="mt-4 space-y-3">
            {tracks.map((track) => (
              <form
                key={track.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  void update(
                    track,
                    new FormData(event.currentTarget),
                  );
                }}
                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4"
              >
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
                  <label>
                    <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                      Sort order
                    </span>
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={track.sort_order}
                      className={input}
                    />
                  </label>
                  <textarea name="description" rows={2} defaultValue={track.description} className={`${input} resize-y md:col-span-2`} />
                </div>
                <div className="mt-3 flex flex-wrap gap-5 text-xs">
                  <label className="flex gap-2"><input type="checkbox" name="is_active" defaultChecked={track.is_active} /> Active</label>
                  <label className="flex gap-2"><input type="checkbox" name="is_personal_selectable" defaultChecked={track.is_personal_selectable} /> Personal selection</label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" disabled={busy} onClick={() => void remove(track)} className="border border-red-900/60 px-3 py-2 text-[7px] uppercase text-red-300 disabled:opacity-45">Delete</button>
                  <button
                    type="submit"
                    disabled={busy}
                    className={button}
                  >
                    Save Track
                  </button>
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
