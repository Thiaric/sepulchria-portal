"use client";

import { setCharacterMusicEntitlement } from "@/app/(portal)/admin/characters/music-actions";
import {
  AdminSaveFeedbackMessage,
  useAdminEntitlementSubmit,
} from "@/components/admin/admin-entitlement-submit";

export type CharacterMusicTrackRow = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_personal_selectable: boolean;
};

export type CharacterMusicEntitlementRow = {
  music_track_id: string;
  enabled: boolean;
  source:
    | "paid"
    | "remnants"
    | "staff"
    | "reward"
    | "event"
    | "promotion";
  note: string | null;
};

export function AdminCharacterMusicAccess({
  characterId,
  tracks,
  entitlements,
}: {
  characterId: string;
  tracks: CharacterMusicTrackRow[];
  entitlements: CharacterMusicEntitlementRow[];
}) {
  const byTrack = new Map(
    entitlements.map((entry) => [
      entry.music_track_id,
      entry,
    ]),
  );

  const {
    enabledByKey,
    pendingKey,
    feedbackByKey,
    submit,
  } = useAdminEntitlementSubmit(
    Object.fromEntries(
      tracks.map((track) => [
        track.id,
        byTrack.get(track.id)?.enabled === true,
      ]),
    ),
  );

  return (
    <section className="mt-6 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] components_admin_admin_character_music_access_section_section">
      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 components_admin_admin_character_music_access_div_personal_music_tracks">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] components_admin_admin_character_music_access_p_personal_music_tracks">
          Music ownership
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e1c89f))] components_admin_admin_character_music_access_h2_personal_music_tracks">
          Personal Music Tracks
        </h2>
        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_music_access_p_personal_music_tracks_2">
          Owning at least one personal track unlocks My Music for this character.
        </p>
      </div>

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 lg:grid-cols-2 components_admin_admin_character_music_access_div_container">
        {tracks.map((track) => {
          const entitlement =
            byTrack.get(track.id);
          const enabled =
            enabledByKey[track.id] ??
            (entitlement?.enabled === true);

          return (
            <form
              key={track.id}
              id={`premium-feature-music-${track.id}`}
              data-admin-premium-feature="true"
              data-admin-feature-name={track.name}
              data-admin-feature-type="Music Track"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  track.id,
                  new FormData(event.currentTarget),
                  setCharacterMusicEntitlement,
                  "Ownership saved.",
                );
              }}
              className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5 components_admin_admin_character_music_access_form_form"
            >
              <input className="components_admin_admin_character_music_access_input_character_id"
                type="hidden"
                name="characterId"
                value={characterId}
              />
              <input className="components_admin_admin_character_music_access_input_music_track_id"
                type="hidden"
                name="musicTrackId"
                value={track.id}
              />

              <div className="flex items-start justify-between gap-4 components_admin_admin_character_music_access_div_container_2">
                <div className="components_admin_admin_character_music_access_div_container_3">
                  <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_music_access_p_text">
                    Music track
                  </p>
                  <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))] components_admin_admin_character_music_access_h3_heading">
                    {track.name}
                  </h3>
                  <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_music_access_p_text_2">
                    {track.description ||
                      "Personal background music track."}
                  </p>
                </div>

                <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a99069))] components_admin_admin_character_music_access_span_text">
                  {enabled
                    ? "Owned"
                    : "Not owned"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 components_admin_admin_character_music_access_div_container_4">
                <select
                  name="enabled"
                  defaultValue={
                    enabled
                      ? "true"
                      : "false"
                  }
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_music_access_select_enabled"
                >
                  <option className="components_admin_admin_character_music_access_option_enabled" value="false">
                    Not owned
                  </option>
                  <option className="components_admin_admin_character_music_access_option_enabled_2" value="true">
                    Owned
                  </option>
                </select>

                <select
                  name="source"
                  defaultValue={
                    entitlement?.source ??
                    "staff"
                  }
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_music_access_select_source"
                >
                  <option className="components_admin_admin_character_music_access_option_paid" value="paid">
                    Real-money purchase
                  </option>
                  <option className="components_admin_admin_character_music_access_option_remnants" value="remnants">
                    Remnants purchase
                  </option>
                  <option className="components_admin_admin_character_music_access_option_staff" value="staff">
                    Staff grant
                  </option>
                  <option className="components_admin_admin_character_music_access_option_reward" value="reward">
                    Reward
                  </option>
                  <option className="components_admin_admin_character_music_access_option_source" value="event">
                    Event
                  </option>
                  <option className="components_admin_admin_character_music_access_option_promotion" value="promotion">
                    Promotion
                  </option>
                </select>

                <textarea
                  name="note"
                  rows={2}
                  maxLength={1000}
                  defaultValue={
                    entitlement?.note ?? ""
                  }
                  placeholder="Optional staff note"
                  className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_music_access_textarea_note"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 components_admin_admin_character_music_access_div_container_5">
                <AdminSaveFeedbackMessage
                  feedback={feedbackByKey[track.id]}
                />

                <button
                  type="submit"
                  disabled={pendingKey === track.id}
                  className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] disabled:cursor-wait disabled:opacity-60 components_admin_admin_character_music_access_button_action"
                >
                  {pendingKey === track.id
                    ? "Saving..."
                    : "Save ownership"}
                </button>
              </div>
            </form>
          );
        })}

        {tracks.length === 0 ? (
          <p className="bg-[rgb(var(--sep-colour-17110d))] p-5 text-[11px] text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_music_access_p_text_3">
            No music tracks have been created yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
