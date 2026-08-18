import { AdminActionForm } from "@/components/admin/admin-action-form";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  assignGiftToCharacter,
  createGift,
  deleteGift,
  removeGiftFromCharacter,
  updateGift,
} from "./actions";

type Race = { id: string; name: string };
type Character = { id: string; display_name: string };

type Gift = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_general: boolean;
  effect_mode: "none" | "passive" | "temporary";
  duration_minutes: number | null;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  sort_order: number;
  races: { race_id: string }[] | null;
  roles: { order_job_id: string }[] | null;
  assignments: {
    id: string;
    character_id: string;
    acquisition_source: "ancestry" | "order" | "staff";
  }[] | null;
};

type LevelRow = {
  level: number;
  order: { id: string; name: string } | { id: string; name: string }[] | null;
  roles: { id: string; name: string; sort_order: number }[] | null;
};

type Props = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function AdminGiftsPage({ searchParams }: Props) {
  await requireStaff();
  const params = (await searchParams) ?? {};
  const supabase = await createClient();

  const [giftsResult, racesResult, levelsResult, charactersResult] =
    await Promise.all([
      supabase
        .from("gifts")
        .select(`
          id, name, description, is_active, is_general, effect_mode,
          duration_minutes, muscles_modifier, reflexes_modifier,
          vigour_modifier, shrewd_modifier, brains_modifier,
          presence_modifier, sort_order,
          races:gift_races(race_id),
          roles:gift_order_jobs(order_job_id),
          assignments:character_gifts(
            id, character_id, acquisition_source
          )
        `)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("races")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("order_levels")
        .select(`
          level,
          order:orders(id, name),
          roles:order_jobs(id, name, sort_order)
        `)
        .order("level", { ascending: false }),

      supabase
        .from("characters")
        .select("id, display_name")
        .eq("status", "approved")
        .order("display_name", { ascending: true }),
    ]);

  const firstError =
    giftsResult.error ??
    racesResult.error ??
    levelsResult.error ??
    charactersResult.error;

  if (firstError) {
    throw new Error(`Unable to load Feat management: ${firstError.message}`);
  }

  const gifts = (giftsResult.data ?? []) as unknown as Gift[];
  const races = (racesResult.data ?? []) as Race[];
  const characters = (charactersResult.data ?? []) as Character[];

  const roles = ((levelsResult.data ?? []) as unknown as LevelRow[])
    .flatMap((level) => {
      const order = one(level.order);
      return (level.roles ?? []).map((role) => ({
        ...role,
        level: level.level,
        orderName: order?.name ?? "Unknown Order",
      }));
    })
    .sort(
      (a, b) =>
        a.orderName.localeCompare(b.orderName) ||
        b.level - a.level ||
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name),
    );

  const characterById = new Map(
    characters.map((character) => [character.id, character]),
  );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
            Administration
          </p>
          <h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">
            Feat Management
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
            Create Feats, configure Attribute effects, link Ancestries and
            Order Roles, and assign Feats directly to characters.
          </p>
        </div>

        {params.success ? (
          <div className="mt-6 border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400">
            {params.success}
          </div>
        ) : null}

        {params.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {params.error}
          </div>
        ) : null}

        <section
          id="gift-new"
          className="mt-8 scroll-mt-6 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
            New Feat
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[#dfc99f]">
            Create a Feat
          </h2>

          <GiftForm
            action={createGift}
            races={races}
            roles={roles}
          />
        </section>

        <div className="mt-6 space-y-4">
          {gifts.map((gift) => (
            <details
              key={gift.id}
              id={`gift-${gift.id}`}
              className="scroll-mt-6 border border-[#59432c]/45 bg-[#100c09]"
            >
              <summary className="cursor-pointer list-none px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg text-[#d8bf91]">
                      {gift.name}
                    </p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[#766956]">
                      {gift.effect_mode}
                      {gift.is_general ? " · General" : ""}
                      {" · "}
                      {gift.assignments?.length ?? 0} owners
                    </p>
                  </div>
                  <span className="text-[8px] uppercase tracking-[0.14em] text-[#9b8768]">
                    {gift.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </summary>

              <div className="border-t border-[#59432c]/35 p-4 sm:p-5">
                <GiftForm
                  action={updateGift}
                  gift={gift}
                  races={races}
                  roles={roles}
                />

                <div className="mt-6 border-t border-[#59432c]/35 pt-5">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Staff assignment
                  </p>

                  <AdminActionForm
                    action={assignGiftToCharacter}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input type="hidden" name="giftId" value={gift.id} />

                    <select
                      name="characterId"
                      required
                      defaultValue=""
                      className="min-w-[240px] flex-1 border border-[#60482e]/55 bg-[#15100d] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none"
                    >
                      <option value="" disabled>
                        Select character
                      </option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.display_name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="border border-[#987344] bg-[#3b2919] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[#efd6a8]"
                    >
                      Assign Feat
                    </button>
                  </AdminActionForm>

                  {gift.assignments?.length ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {gift.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between gap-3 border border-[#59432c]/35 bg-[#15100d] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-serif text-sm text-[#cab28a]">
                              {characterById.get(assignment.character_id)?.display_name ??
                                "Unknown character"}
                            </p>
                            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#6e6252]">
                              {assignment.acquisition_source}
                            </p>
                          </div>

                          <AdminActionForm action={removeGiftFromCharacter}>
                            <input
                              type="hidden"
                              name="assignmentId"
                              value={assignment.id}
                            />
                            <button
                              type="submit"
                              className="text-[7px] uppercase tracking-[0.12em] text-red-300"
                            >
                              Remove
                            </button>
                          </AdminActionForm>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 border-t border-[#59432c]/35 pt-5">
                  <AdminActionForm action={deleteGift} className="flex justify-end">
                    <input type="hidden" name="giftId" value={gift.id} />
                    <button
                      type="submit"
                      className="border border-red-900/55 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
                    >
                      Delete Feat
                    </button>
                  </AdminActionForm>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]";

function GiftForm({
  action,
  gift,
  races,
  roles,
}: {
  action: typeof createGift | typeof updateGift;
  gift?: Gift;
  races: Race[];
  roles: {
    id: string;
    name: string;
    level: number;
    orderName: string;
  }[];
}) {
  const selectedRaces = new Set(gift?.races?.map((item) => item.race_id) ?? []);
  const selectedRoles = new Set(gift?.roles?.map((item) => item.order_job_id) ?? []);

  return (
    <AdminActionForm action={action} className="mt-5">
      {gift ? <input type="hidden" name="giftId" value={gift.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            name="name"
            required
            defaultValue={gift?.name ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Sort order">
          <input
            type="number"
            name="sortOrder"
            defaultValue={gift?.sort_order ?? 0}
            className={inputClass}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Description">
            <textarea
              name="description"
              rows={5}
              defaultValue={gift?.description ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Effect mode">
          <select
            name="effectMode"
            defaultValue={gift?.effect_mode ?? "none"}
            className={inputClass}
          >
            <option value="none">None</option>
            <option value="passive">Passive</option>
            <option value="temporary">Temporary / activated</option>
          </select>
        </Field>

        <Field label="Temporary duration (minutes)">
          <input
            type="number"
            min={1}
            name="durationMinutes"
            defaultValue={gift?.duration_minutes ?? ""}
            className={inputClass}
          />
        </Field>

        <div className="md:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Muscles", "musclesModifier", gift?.muscles_modifier ?? 0],
            ["Reflexes", "reflexesModifier", gift?.reflexes_modifier ?? 0],
            ["Vigour", "vigourModifier", gift?.vigour_modifier ?? 0],
            ["Shrewd", "shrewdModifier", gift?.shrewd_modifier ?? 0],
            ["Brains", "brainsModifier", gift?.brains_modifier ?? 0],
            ["Presence", "presenceModifier", gift?.presence_modifier ?? 0],
          ].map(([label, name, value]) => (
            <Field key={String(name)} label={String(label)}>
              <input
                type="number"
                min={-10}
                max={10}
                name={String(name)}
                defaultValue={Number(value)}
                className={inputClass}
              />
            </Field>
          ))}
        </div>

        <Eligibility
          title="Ancestries"
          items={races.map((race) => ({
            id: race.id,
            label: race.name,
            checked: selectedRaces.has(race.id),
          }))}
          name="raceIds"
        />

        <Eligibility
          title="Order Roles"
          items={roles.map((role) => ({
            id: role.id,
            label: `${role.orderName} · L${role.level} · ${role.name}`,
            checked: selectedRoles.has(role.id),
          }))}
          name="roleIds"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-5">
          <Check
            name="isActive"
            label="Active"
            checked={gift?.is_active ?? true}
          />
          <Check
            name="isGeneral"
            label="General / staff route"
            checked={gift?.is_general ?? false}
          />
        </div>

        <button
          type="submit"
          className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[#efd6a8]"
        >
          {gift ? "Save Feat" : "Create Feat"}
        </button>
      </div>
    </AdminActionForm>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-[8px] uppercase tracking-[0.16em] text-[#756958]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] text-[#b6a58d]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-4 w-4 accent-[#8b673d]"
      />
      {label}
    </label>
  );
}

function Eligibility({
  title,
  items,
  name,
}: {
  title: string;
  name: string;
  items: { id: string; label: string; checked: boolean }[];
}) {
  return (
    <div className="border border-[#59432c]/40 bg-[#0d0a08] p-4">
      <p className="font-serif text-base text-[#d3ba8c]">{title}</p>
      <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 text-[10px] text-[#b6a58d]"
          >
            <input
              type="checkbox"
              name={name}
              value={item.id}
              defaultChecked={item.checked}
              className="h-4 w-4 accent-[#8b673d]"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}
