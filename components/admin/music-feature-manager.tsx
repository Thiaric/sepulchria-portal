"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

const MAX_AUDIO_BYTES =
  30 * 1024 * 1024;

async function responseJson(
  response: Response,
) {
  const text = await response.text();

  if (!text.trim()) {
    return {} as {
      error?: string;
      tracks?: MusicTrackAdminRow[];
      path?: string;
      token?: string;
    };
  }

  try {
    return JSON.parse(text) as {
      error?: string;
      tracks?: MusicTrackAdminRow[];
      path?: string;
      token?: string;
    };
  } catch {
    return {
      error:
        response.ok
          ? "The server returned an invalid response."
          : `Upload failed (${response.status}). The file may be too large for the request.`,
    };
  }
}

type MusicLocationUsage = {
  id: string;
  name: string;
};

export function MusicFeatureManager({
  initialTracks,
  initialLocationsByTrack,
}: {
  initialTracks: MusicTrackAdminRow[];
  initialLocationsByTrack: Record<
    string,
    MusicLocationUsage[]
  >;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [tracks, setTracks] = useState(initialTracks);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function reload() {
    const r = await fetch("/api/admin/music", { cache: "no-store" });
    const d = await responseJson(r);
    if (!r.ok) throw new Error(d.error ?? "Unable to refresh music.");
    setTracks(d.tracks ?? []);
    window.requestAnimationFrame(() => {
      window.dispatchEvent(
        new Event(
          "sepulchria:admin-data-changed",
        ),
      );
    });
    router.refresh();
  }

  async function upload(fd: FormData) {
    const file = fd.get("file");

    if (!(file instanceof File)) {
      setFailed(true);
      setMessage(
        "Choose an audio file.",
      );
      return;
    }

    if (
      file.size > MAX_AUDIO_BYTES
    ) {
      setFailed(true);
      setMessage(
        `That file is ${(file.size / 1048576).toFixed(2)} MB. Music files must be 30 MB or smaller.`,
      );
      return;
    }

    setBusy(true);
    setMessage("");
    setFailed(false);

    try {
      const metadata = {
        track_key: String(
          fd.get("track_key") ?? "",
        ),
        name: String(
          fd.get("name") ?? "",
        ),
        description: String(
          fd.get("description") ?? "",
        ),
        sort_order: Number(
          fd.get("sort_order") ?? 0,
        ),
        is_active:
          fd.get("is_active") === "on",
        is_personal_selectable:
          fd.get(
            "is_personal_selectable",
          ) === "on",
        original_file_name:
          file.name,
        mime_type:
          file.type,
        file_size_bytes:
          file.size,
      };

      const ticketResponse =
        await fetch(
          "/api/admin/music/upload-ticket",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                metadata,
              ),
          },
        );

      const ticketData =
        await responseJson(
          ticketResponse,
        );

      if (!ticketResponse.ok) {
        throw new Error(
          ticketData.error ??
            "Unable to authorise upload.",
        );
      }

      const path = String(
        (
          ticketData as {
            path?: string;
          }
        ).path ?? "",
      );

      const token = String(
        (
          ticketData as {
            token?: string;
          }
        ).token ?? "",
      );

      if (!path || !token) {
        throw new Error(
          "The upload ticket was incomplete.",
        );
      }

      const supabase =
        createClient();

      const {
        error: uploadError,
      } = await supabase.storage
        .from("music")
        .uploadToSignedUrl(
          path,
          token,
          file,
          {
            contentType:
              file.type,
            cacheControl:
              "3600",
          },
        );

      if (uploadError) {
        throw new Error(
          `Unable to store audio: ${uploadError.message}`,
        );
      }

      const finalResponse =
        await fetch(
          "/api/admin/music",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ...metadata,
                storage_path:
                  path,
              }),
          },
        );

      const finalData =
        await responseJson(
          finalResponse,
        );

      if (!finalResponse.ok) {
        throw new Error(
          finalData.error ??
            "Unable to save track metadata.",
        );
      }

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      setMessage(
        "Music track uploaded.",
      );

      await reload();
    } catch (e) {
      setFailed(true);

      if (
        e instanceof TypeError &&
        /failed to fetch/i.test(
          e.message,
        )
      ) {
        setMessage(
          "The upload request was interrupted before the server could respond.",
        );
      } else {
        setMessage(
          e instanceof Error
            ? e.message
            : "Unable to upload track.",
        );
      }
    } finally {
      setBusy(false);
    }
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
      const d = await responseJson(r);
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
      const d = await responseJson(r);
      if (!r.ok) throw new Error(d.error ?? "Unable to delete track.");
      setMessage("Track deleted.");
      await reload();
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Unable to delete track.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] components_admin_music_feature_manager_section_section">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 components_admin_music_feature_manager_header_background_music">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))] components_admin_music_feature_manager_p_background_music">Collectible feature</p>
        <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] components_admin_music_feature_manager_h3_background_music">Background Music</h3>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_music_feature_manager_p_background_music_2">Upload location tracks and collectible personal tracks. Shop pricing comes later.</p>
      </header>

      {message ? <div className={[((`mx-5 mt-5 border px-4 py-3 text-xs ${failed ? "border-red-800/55 text-red-200" : "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-c5d7bd))]"}`)), "components_admin_music_feature_manager_div_container"].filter(Boolean).join(" ")}>{message}</div> : null}

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/30 xl:grid-cols-[360px_minmax(0,1fr)] components_admin_music_feature_manager_div_container_2">
        <form
          id="music-new"
          className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5 components_admin_music_feature_manager_form_music_new"
          onSubmit={(event) => {
            event.preventDefault();
            void upload(
              new FormData(event.currentTarget),
            );
          }}
        >
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))] components_admin_music_feature_manager_p_music_new">Add Track</p>
          <div className="mt-4 space-y-3 components_admin_music_feature_manager_div_active">
            <input name="track_key" required pattern="[a-z0-9]+(?:_[a-z0-9]+)*" placeholder="moonlit_sepulchria" className={[((input)), "components_admin_music_feature_manager_input_moonlit_sepulchria"].filter(Boolean).join(" ")} />
            <input name="name" required placeholder="Moonlit Sepulchria" className={[((input)), "components_admin_music_feature_manager_input_name"].filter(Boolean).join(" ")} />
            <textarea name="description" rows={3} maxLength={1500} placeholder="Description" className={[((`${input} resize-y`)), "components_admin_music_feature_manager_textarea_description"].filter(Boolean).join(" ")} />
            <input ref={fileRef} name="file" type="file" required accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac" className="block w-full text-xs text-[rgb(var(--sep-colour-a99472))] components_admin_music_feature_manager_input_file" />
            <p className="text-[8px] text-[rgb(var(--sep-colour-6f6252))] components_admin_music_feature_manager_p_active">MP3, OGG, WAV, M4A/MP4 or AAC - max 30 MB</p>
            <label className="block components_admin_music_feature_manager_label_active">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_admin_music_feature_manager_span_active">
                Sort order
              </span>
              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className={[((input)), "components_admin_music_feature_manager_input_sort_order"].filter(Boolean).join(" ")}
              />
            </label>
            <label className="flex gap-2 text-xs components_admin_music_feature_manager_label_active_2"><input className="components_admin_music_feature_manager_input_active" type="checkbox" name="is_active" defaultChecked /> Active</label>
            <label className="flex gap-2 text-xs components_admin_music_feature_manager_label_active_3"><input className="components_admin_music_feature_manager_input_personal_selectable" type="checkbox" name="is_personal_selectable" defaultChecked /> Personal selectable</label>
            <button
              type="submit"
              disabled={busy}
              className={[((button)), "components_admin_music_feature_manager_button_active"].filter(Boolean).join(" ")}
            >
              {busy ? "Working..." : "Upload Track"}
            </button>
          </div>
        </form>

        <div className="bg-[rgb(var(--sep-colour-120d0a))] p-5 components_admin_music_feature_manager_div_music_catalogue">
          <h4 className="font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_admin_music_feature_manager_h4_music_catalogue">Music Catalogue - {tracks.length}</h4>
          <div className="mt-4 space-y-3 components_admin_music_feature_manager_div_music_catalogue_2">
            {tracks.map((track) => (
              <form
                key={track.id}
                id={`admin-music-${track.id}`}
                data-admin-music-track-id={track.id}
                data-admin-music-track-name={track.name}
                data-admin-music-track-active={String(track.is_active)}
                data-admin-music-track-personal={String(track.is_personal_selectable)}
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4 components_admin_music_feature_manager_form_form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void update(
                    track,
                    new FormData(event.currentTarget),
                  );
                }}
              >
                <div className="flex flex-wrap justify-between gap-3 components_admin_music_feature_manager_div_container_3">
                  <div className="components_admin_music_feature_manager_div_container_4">
                    <p className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))] components_admin_music_feature_manager_p_text">{track.name}</p>
                    <p className="font-mono text-[9px] text-[rgb(var(--sep-colour-6f665b))] components_admin_music_feature_manager_p_text_2">{track.track_key}</p>
                    <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-746958))] components_admin_music_feature_manager_p_text_3">{track.original_file_name ?? track.storage_path} - {sizeLabel(track.file_size_bytes)}</p>

                    {(initialLocationsByTrack[track.id] ?? []).length > 0 ? (
                      <div className="mt-2 text-[8px] leading-4 text-[rgb(var(--sep-colour-9e8d73))] components_admin_music_feature_manager_div_container_5">
                        <span className="uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] components_admin_music_feature_manager_span_text">
                          Used in:
                        </span>{" "}
                        {(initialLocationsByTrack[track.id] ?? [])
                          .map((room) => room.name)
                          .join(", ")}
                      </div>
                    ) : (
                      <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-625747))] components_admin_music_feature_manager_p_text_4">
                        Not assigned to any location
                      </p>
                    )}
                  </div>
                  <span className="text-[7px] uppercase text-[rgb(var(--sep-colour-b59b74))] components_admin_music_feature_manager_span_text_2">{track.is_personal_selectable ? "Personal" : "Location only"}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 components_admin_music_feature_manager_div_container_6">
                  <input name="name" required defaultValue={track.name} className={[((input)), "components_admin_music_feature_manager_input_name_2"].filter(Boolean).join(" ")} />
                  <label className="components_admin_music_feature_manager_label_label">
                    <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_admin_music_feature_manager_span_text_3">
                      Sort order
                    </span>
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={track.sort_order}
                      className={[((input)), "components_admin_music_feature_manager_input_sort_order_2"].filter(Boolean).join(" ")}
                    />
                  </label>
                  <textarea name="description" rows={2} defaultValue={track.description} className={[((`${input} resize-y md:col-span-2`)), "components_admin_music_feature_manager_textarea_description_2"].filter(Boolean).join(" ")} />
                </div>
                <div className="mt-3 flex flex-wrap gap-5 text-xs components_admin_music_feature_manager_div_active_2">
                  <label className="flex gap-2 components_admin_music_feature_manager_label_active_4"><input className="components_admin_music_feature_manager_input_active_2" type="checkbox" name="is_active" defaultChecked={track.is_active} /> Active</label>
                  <label className="flex gap-2 components_admin_music_feature_manager_label_active_5"><input className="components_admin_music_feature_manager_input_personal_selectable_2" type="checkbox" name="is_personal_selectable" defaultChecked={track.is_personal_selectable} /> Personal selection</label>
                </div>
                <div className="mt-4 flex justify-end gap-2 components_admin_music_feature_manager_div_container_7">
                  <button type="button" disabled={busy} onClick={() => void remove(track)} className="border border-red-900/60 px-3 py-2 text-[7px] uppercase text-red-300 disabled:opacity-45 components_admin_music_feature_manager_button_delete">Delete</button>
                  <button
                    type="submit"
                    disabled={busy}
                    className={[((button)), "components_admin_music_feature_manager_button_save_track"].filter(Boolean).join(" ")}
                  >
                    Save Track
                  </button>
                </div>
              </form>
            ))}
            {tracks.length === 0 ? <p className="py-8 text-center text-xs text-[rgb(var(--sep-colour-746958))] components_admin_music_feature_manager_p_music_catalogue">No music tracks yet.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
