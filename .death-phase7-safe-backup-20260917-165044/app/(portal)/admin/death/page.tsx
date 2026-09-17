import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createResurrectionMalus,
  resurrectCharacter,
  setCharacterResurrectionMalus,
  setDeadUntil,
  toggleGhostRoom,
  updateDeathRules,
  updateResurrectionMalus,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function minutesSince(value: string | null) {
  if (!value) return null;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;

  return Math.max(
    0,
    Math.floor((Date.now() - parsed) / 60_000),
  );
}

const input =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none";

const panel =
  "border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5";

export default async function DeathAdminPage() {
  const session =
    await requireAdminSection("death");

  if (
    !["owner", "admin", "master"].includes(
      session.role,
    )
  ) {
    return null;
  }

  const admin = createAdminClient();

  const [
    rulesResult,
    deadResult,
    roomsResult,
    malusesResult,
    activeMalusesResult,
    charactersResult,
  ] = await Promise.all([
    admin
      .from("character_death_rules")
      .select("*")
      .eq("singleton", true)
      .maybeSingle(),
    admin
      .from("characters")
      .select(
        "id,display_name,current_room_id,died_at,zero_hp_at,dead_until,current_health",
      )
      .eq("life_state", "dead")
      .eq("is_system", false)
      .order("died_at", { ascending: true }),
    admin
      .from("rooms")
      .select(
        "id,name,slug,is_active,allow_dead_ghosts",
      )
      .eq("is_active", true)
      .order("name", { ascending: true }),
    admin
      .from("death_resurrection_maluses")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    admin
      .from("character_resurrection_maluses")
      .select(
        "id,character_id,malus_id,narrative_text,applied_at,cleared_at",
      )
      .is("cleared_at", null)
      .order("applied_at", { ascending: false }),
    admin
      .from("characters")
      .select("id,display_name")
      .eq("is_system", false)
      .order("display_name", { ascending: true }),
  ]);

  const firstError =
    rulesResult.error ??
    deadResult.error ??
    roomsResult.error ??
    malusesResult.error ??
    activeMalusesResult.error ??
    charactersResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const rules = rulesResult.data ?? {
    death_duration_hours: 24,
    essence_window_minutes: 60,
    auto_revive_health: 1,
    ghost_chat_enabled: true,
    ghost_movement_enabled: true,
    death_announcement_template:
      "{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...",
  };

  const dead = deadResult.data ?? [];
  const rooms = roomsResult.data ?? [];
  const maluses = malusesResult.data ?? [];
  const activeMaluses =
    activeMalusesResult.data ?? [];
  const characters =
    charactersResult.data ?? [];

  const characterName =
    new Map(
      characters.map((character) => [
        character.id,
        character.display_name,
      ]),
    );

  const malusName =
    new Map(
      maluses.map((malus) => [
        malus.id,
        malus.name,
      ]),
    );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8b704e))]">
            Character state
          </p>
          <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
            Death System
          </h1>
          <p className="mt-2 max-w-4xl text-[10px] leading-5 text-[rgb(var(--sep-colour-9c8b72))]">
            Dead Characters cannot use Items, Shapes, Feats, attacks, Attributes or mechanical Counters. During the Essence Window they may still be restored by healing Items, Shapes or Feats that can affect another Character. After the Essence Window only a Level IX Resurrection Shape, staff intervention, or the Current&apos;s timed return can restore them. Delayed resurrection applies one random narrative Resurrection Malus.
          </p>
        </header>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Death Rules
          </h2>

          <form
            action={updateDeathRules}
            className="mt-4 grid gap-4 md:grid-cols-3"
          >
            <label>
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Standard Death Duration (hours)
              </span>
              <input
                className={input}
                type="number"
                min={1}
                name="death_duration_hours"
                defaultValue={
                  rules.death_duration_hours
                }
              />
            </label>

            <label>
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Essence Window (minutes)
              </span>
              <input
                className={input}
                type="number"
                min={1}
                name="essence_window_minutes"
                defaultValue={
                  rules.essence_window_minutes
                }
              />
            </label>

            <label>
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Natural Return Health
              </span>
              <input
                className={input}
                type="number"
                min={1}
                name="auto_revive_health"
                defaultValue={
                  rules.auto_revive_health
                }
              />
            </label>

            <label className="flex items-center gap-2 text-[10px]">
              <input
                type="checkbox"
                name="ghost_chat_enabled"
                defaultChecked={
                  rules.ghost_chat_enabled !== false
                }
              />
              Ghost location chat enabled
            </label>

            <label className="flex items-center gap-2 text-[10px]">
              <input
                type="checkbox"
                name="ghost_movement_enabled"
                defaultChecked={
                  rules.ghost_movement_enabled !== false
                }
              />
              Ghost movement enabled
            </label>

            <label className="md:col-span-3">
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Death Announcement
              </span>
              <textarea
                className={input}
                rows={5}
                name="death_announcement_template"
                defaultValue={
                  rules.death_announcement_template
                }
              />
              <span className="mt-1 block text-[8px] opacity-70">
                Available placeholders: {"{character}"} and {"{minutes}"}.
              </span>
            </label>

            <div className="md:col-span-3 flex justify-end">
              <button className="border px-4 py-2 text-[9px] uppercase tracking-[0.16em]">
                Save Death Rules
              </button>
            </div>
          </form>
        </section>

        <section className={panel}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
              Dead Characters
            </h2>
            <span className="text-[9px] uppercase tracking-[0.14em] opacity-70">
              {dead.length} dead
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {dead.length ? (
              dead.map((character) => {
                const diedAt =
                  character.died_at ??
                  character.zero_hp_at;
                const elapsed =
                  minutesSince(diedAt);
                const essenceRemaining =
                  elapsed === null
                    ? null
                    : Math.max(
                        0,
                        Number(
                          rules.essence_window_minutes ??
                            60,
                        ) - elapsed,
                      );

                return (
                  <article
                    key={character.id}
                    className="border border-[rgb(var(--sep-colour-60482e))]/35 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                      <div>
                        <h3 className="font-serif text-lg">
                          {character.display_name}
                        </h3>
                        <p className="mt-1 text-[9px] leading-5 opacity-75">
                          Died: {formatDate(diedAt)}
                          {" · "}
                          {essenceRemaining &&
                          essenceRemaining > 0
                            ? `Essence remaining: ${essenceRemaining} min`
                            : "Essence faded"}
                          {" · "}
                          Natural return:{" "}
                          {formatDate(
                            character.dead_until,
                          )}
                        </p>
                      </div>

                      <form
                        action={resurrectCharacter}
                        className="flex items-end gap-2"
                      >
                        <input
                          type="hidden"
                          name="character_id"
                          value={character.id}
                        />
                        <label>
                          <span className="mb-1 block text-[7px] uppercase">
                            HP
                          </span>
                          <input
                            className="w-20 border bg-transparent px-2 py-2 text-[10px]"
                            type="number"
                            min={1}
                            name="health"
                            defaultValue={1}
                          />
                        </label>
                        <button className="border px-3 py-2 text-[8px] uppercase">
                          Resurrect now
                        </button>
                      </form>
                    </div>

                    <form
                      action={setDeadUntil}
                      className="mt-3 flex flex-wrap items-end gap-2"
                    >
                      <input
                        type="hidden"
                        name="character_id"
                        value={character.id}
                      />
                      <label>
                        <span className="mb-1 block text-[7px] uppercase">
                          Dead until
                        </span>
                        <input
                          className={input}
                          type="datetime-local"
                          name="dead_until"
                          defaultValue={
                            character.dead_until
                              ? new Date(
                                  character.dead_until,
                                )
                                  .toISOString()
                                  .slice(0, 16)
                              : ""
                          }
                        />
                      </label>
                      <button className="border px-3 py-2 text-[8px] uppercase">
                        Change return time
                      </button>
                    </form>
                  </article>
                );
              })
            ) : (
              <p className="text-[10px] italic opacity-70">
                No Characters are currently dead.
              </p>
            )}
          </div>
        </section>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Ghost Locations
          </h2>
          <p className="mt-1 text-[9px] opacity-70">
            These flags control Ghost Location chat only. Ghosts may move normally anywhere they otherwise have access to.
          </p>

          <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <form
                action={toggleGhostRoom}
                key={room.id}
                className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/30 p-3"
              >
                <input
                  type="hidden"
                  name="room_id"
                  value={room.id}
                />
                <label className="flex items-center gap-2 text-[10px]">
                  <input
                    type="checkbox"
                    name="allow_dead_ghosts"
                    defaultChecked={
                      room.allow_dead_ghosts === true
                    }
                  />
                  {room.name}
                </label>
                <button className="border px-2 py-1 text-[7px] uppercase">
                  Save
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Resurrection Maluses
          </h2>
          <p className="mt-1 text-[9px] opacity-70">
            One active malus is chosen randomly only when resurrection occurs after the Essence Window. These effects are narrative only and remain indefinitely until staff changes or clears them.
          </p>

          <form
            action={createResurrectionMalus}
            className="mt-4 grid gap-2 md:grid-cols-[220px_1fr_auto]"
          >
            <input
              className={input}
              name="name"
              placeholder="New malus name"
            />
            <input
              className={input}
              name="description"
              placeholder="Narrative effect"
            />
            <button className="border px-3 py-2 text-[8px] uppercase">
              Add
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {maluses.map((malus) => (
              <form
                action={updateResurrectionMalus}
                key={malus.id}
                className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/30 p-3 md:grid-cols-[200px_1fr_80px_auto_auto]"
              >
                <input
                  type="hidden"
                  name="malus_id"
                  value={malus.id}
                />
                <input
                  className={input}
                  name="name"
                  defaultValue={malus.name}
                />
                <input
                  className={input}
                  name="description"
                  defaultValue={malus.description}
                />
                <input
                  className={input}
                  type="number"
                  name="sort_order"
                  defaultValue={malus.sort_order}
                />
                <label className="flex items-center gap-2 text-[8px] uppercase">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={
                      malus.is_active === true
                    }
                  />
                  Active
                </label>
                <button className="border px-3 py-2 text-[8px] uppercase">
                  Save
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Character Resurrection Maluses
          </h2>
          <p className="mt-1 text-[9px] opacity-70">
            Change or clear the currently active narrative malus for a resurrected Character.
          </p>

          <div className="mt-4 space-y-2">
            {activeMaluses.length ? (
              activeMaluses.map((entry) => (
                <form
                  action={setCharacterResurrectionMalus}
                  key={entry.id}
                  className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/30 p-3 md:grid-cols-[220px_1fr_auto]"
                >
                  <input
                    type="hidden"
                    name="character_id"
                    value={entry.character_id}
                  />
                  <div>
                    <p className="font-serif text-sm">
                      {characterName.get(
                        entry.character_id,
                      ) ?? entry.character_id}
                    </p>
                    <p className="mt-1 text-[8px] opacity-65">
                      Current:{" "}
                      {malusName.get(
                        entry.malus_id,
                      ) ?? "Custom / unknown"}
                    </p>
                  </div>
                  <select
                    className={input}
                    name="malus_id"
                    defaultValue={
                      entry.malus_id ?? ""
                    }
                  >
                    <option value="">
                      Clear malus
                    </option>
                    {maluses
                      .filter(
                        (malus) =>
                          malus.is_active,
                      )
                      .map((malus) => (
                        <option
                          key={malus.id}
                          value={malus.id}
                        >
                          {malus.name}
                        </option>
                      ))}
                  </select>
                  <button className="border px-3 py-2 text-[8px] uppercase">
                    Apply
                  </button>
                </form>
              ))
            ) : (
              <p className="text-[10px] italic opacity-70">
                No active Resurrection Maluses.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
