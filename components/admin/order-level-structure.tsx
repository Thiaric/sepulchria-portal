import { createClient } from "@/lib/supabase/server";

import {
  createOrderJob,
  deleteOrderJob,
  updateOrderJob,
  updateOrderLevel,
} from "@/app/(portal)/admin/orders/structure-actions";

type OrderJobRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type OrderLevelRow = {
  id: string;
  level: number;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  jobs: OrderJobRow[] | null;
};

const ATTRIBUTE_FIELDS = [
  { key: "muscles", label: "Muscles" },
  { key: "reflexes", label: "Reflexes" },
  { key: "vigour", label: "Vigour" },
  { key: "shrewd", label: "Shrewd" },
  { key: "brains", label: "Brains" },
  { key: "presence", label: "Presence" },
] as const;

export async function OrderLevelStructure({
  orderId,
}: {
  orderId: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_levels")
    .select(`
      id,
      level,
      muscles_modifier,
      reflexes_modifier,
      vigour_modifier,
      shrewd_modifier,
      brains_modifier,
      presence_modifier,
      jobs:order_jobs(
        id,
        name,
        description,
        sort_order
      )
    `)
    .eq("order_id", orderId)
    .order("level", { ascending: false });

  if (error) {
    return (
      <div className="mt-7 border border-red-900/50 bg-red-950/15 p-4 text-sm text-red-300">
        Unable to load this Order&apos;s level structure: {error.message}
      </div>
    );
  }

  const levels = ((data ?? []) as unknown as OrderLevelRow[]).map(
    (level) => ({
      ...level,
      jobs: [...(level.jobs ?? [])].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.name.localeCompare(b.name),
      ),
    }),
  );

  return (
    <section className="mt-8 border-t border-[#60482e]/35 pt-6">
      <div>
        <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
          Order hierarchy
        </p>
        <h4 className="mt-1 font-serif text-2xl text-[#dec69a]">
          Levels &amp; Jobs
        </h4>
        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#8f8271]">
          Every Order has Levels 0–5. The level determines authority and attribute
          modifiers; each level can contain several different jobs or titles.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {levels.map((level) => (
          <LevelCard key={level.id} orderId={orderId} level={level} />
        ))}
      </div>
    </section>
  );
}

function LevelCard({
  orderId,
  level,
}: {
  orderId: string;
  level: OrderLevelRow;
}) {
  return (
    <details
      open={level.level >= 4}
      className="border border-[#59432c]/45 bg-[#100c09]"
    >
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-serif text-lg text-[#d8bf91]">Level {level.level}</p>
            <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-[#756958]">
              {level.jobs?.length ?? 0} {(level.jobs?.length ?? 0) === 1 ? "job" : "jobs"}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-1.5">
            {ATTRIBUTE_FIELDS.map(({ key, label }) => {
              const value = level[
                `${key}_modifier` as keyof OrderLevelRow
              ];

              if (typeof value !== "number" || value === 0) {
                return null;
              }

              return (
                <span
                  key={key}
                  className="border border-[#60482e]/45 bg-[#18110d] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[#ae9470]"
                >
                  {label} {value > 0 ? "+" : ""}{value}
                </span>
              );
            })}
          </div>
        </div>
      </summary>

      <div className="border-t border-[#59432c]/35 p-4">
        <form action={updateOrderLevel}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="levelId" value={level.id} />
          <input type="hidden" name="level" value={level.level} />

          <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
            Attribute modifiers
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ATTRIBUTE_FIELDS.map(({ key, label }) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-[8px] uppercase tracking-[0.12em] text-[#776956]">
                  {label}
                </span>
                <input
                  type="number"
                  name={`${key}Modifier`}
                  min={-10}
                  max={10}
                  defaultValue={
                    level[
                      `${key}_modifier` as keyof OrderLevelRow
                    ] as number
                  }
                  className="w-full border border-[#60482e]/55 bg-[#15100d] px-2 py-2 text-center text-sm text-[#d7c4a5] outline-none focus:border-[#9b7446]"
                />
              </label>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="border border-[#765937]/60 bg-[#271c12] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[#d3b17b] transition hover:border-[#a17a49] hover:bg-[#352417]"
            >
              Save level modifiers
            </button>
          </div>
        </form>

        <div className="mt-5 border-t border-[#59432c]/30 pt-4">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
            Jobs &amp; Titles
          </p>

          <div className="mt-3 space-y-2">
            {(level.jobs ?? []).map((job) => (
              <form
                key={job.id}
                action={updateOrderJob}
                className="grid gap-2 border border-[#59432c]/35 bg-[#15100d] p-3 lg:grid-cols-[minmax(0,1fr)_90px_auto]"
              >
                <input type="hidden" name="orderId" value={orderId} />
                <input type="hidden" name="jobId" value={job.id} />

                <div className="grid gap-2">
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={job.name}
                    className="w-full border border-[#60482e]/50 bg-[#100c09] px-3 py-2 text-sm text-[#d7c4a5] outline-none focus:border-[#9b7446]"
                  />
                  <input
                    type="text"
                    name="description"
                    defaultValue={job.description ?? ""}
                    placeholder="Optional description"
                    className="w-full border border-[#60482e]/40 bg-[#100c09] px-3 py-2 text-[10px] text-[#a99b89] outline-none placeholder:text-[#5f574d] focus:border-[#9b7446]"
                  />
                </div>

                <label className="block">
                  <span className="mb-1 block text-[7px] uppercase tracking-[0.12em] text-[#756958]">
                    Order
                  </span>
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={job.sort_order}
                    className="w-full border border-[#60482e]/50 bg-[#100c09] px-2 py-2 text-center text-sm text-[#d7c4a5] outline-none focus:border-[#9b7446]"
                  />
                </label>

                <div className="flex items-center gap-2 lg:justify-end">
                  <button
                    type="submit"
                    className="border border-[#765937]/55 bg-[#261b12] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#ccb083] transition hover:border-[#9b7446]"
                  >
                    Save
                  </button>
                  <button
                    type="submit"
                    formAction={deleteOrderJob}
                    className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-red-300 transition hover:border-red-700"
                  >
                    Delete
                  </button>
                </div>
              </form>
            ))}

            {(level.jobs ?? []).length === 0 ? (
              <p className="border border-[#59432c]/25 bg-[#15100d]/60 p-3 text-[10px] italic text-[#746858]">
                No jobs or titles have been assigned to this level yet.
              </p>
            ) : null}
          </div>

          <form
            action={createOrderJob}
            className="mt-3 grid gap-2 border border-dashed border-[#765937]/40 bg-[#15100d]/60 p-3 lg:grid-cols-[minmax(0,1fr)_90px_auto]"
          >
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="levelId" value={level.id} />

            <div className="grid gap-2">
              <input
                type="text"
                name="name"
                required
                maxLength={120}
                placeholder="Add a job or title"
                className="w-full border border-[#60482e]/50 bg-[#100c09] px-3 py-2 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#9b7446]"
              />
              <input
                type="text"
                name="description"
                placeholder="Optional description"
                className="w-full border border-[#60482e]/40 bg-[#100c09] px-3 py-2 text-[10px] text-[#a99b89] outline-none placeholder:text-[#5f574d] focus:border-[#9b7446]"
              />
            </div>

            <label className="block">
              <span className="mb-1 block text-[7px] uppercase tracking-[0.12em] text-[#756958]">
                Order
              </span>
              <input
                type="number"
                name="sortOrder"
                defaultValue={(level.jobs?.length ?? 0) * 10}
                className="w-full border border-[#60482e]/50 bg-[#100c09] px-2 py-2 text-center text-sm text-[#d7c4a5] outline-none focus:border-[#9b7446]"
              />
            </label>

            <button
              type="submit"
              className="self-end border border-[#987344] bg-[#3b2919] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
            >
              Add job
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}
