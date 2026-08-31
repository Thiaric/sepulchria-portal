import { setCharacterMusicEntitlement } from "@/app/(portal)/admin/characters/music-actions";

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

  return (
    <section className="mt-6 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
          Music ownership
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e1c89f))]">
          Personal Music Tracks
        </h2>
        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Owning at least one personal track unlocks My Music for this character.
        </p>
      </div>

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 lg:grid-cols-2">
        {tracks.map((track) => {
          const entitlement =
            byTrack.get(track.id);
          const enabled =
            entitlement?.enabled === true;

          return (
            <form
              key={track.id}
              action={
                setCharacterMusicEntitlement
              }
              className="bg-[rgb(var(--sep-colour-17110d))] p-5"
            >
              <input
                type="hidden"
                name="characterId"
                value={characterId}
              />
              <input
                type="hidden"
                name="musicTrackId"
                value={track.id}
              />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                    Music track
                  </p>
                  <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))]">
                    {track.name}
                  </h3>
                  <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                    {track.description ||
                      "Personal background music track."}
                  </p>
                </div>

                <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a99069))]">
                  {enabled
                    ? "Owned"
                    : "Not owned"}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <select
                  name="enabled"
                  defaultValue={
                    enabled
                      ? "true"
                      : "false"
                  }
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                >
                  <option value="false">
                    Not owned
                  </option>
                  <option value="true">
                    Owned
                  </option>
                </select>

                <select
                  name="source"
                  defaultValue={
                    entitlement?.source ??
                    "staff"
                  }
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                >
                  <option value="paid">
                    Real-money purchase
                  </option>
                  <option value="remnants">
                    Remnants purchase
                  </option>
                  <option value="staff">
                    Staff grant
                  </option>
                  <option value="reward">
                    Reward
                  </option>
                  <option value="event">
                    Event
                  </option>
                  <option value="promotion">
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
                  className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))]"
                >
                  Save ownership
                </button>
              </div>
            </form>
          );
        })}

        {tracks.length === 0 ? (
          <p className="bg-[rgb(var(--sep-colour-17110d))] p-5 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            No music tracks have been created yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
