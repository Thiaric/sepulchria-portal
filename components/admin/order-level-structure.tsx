import { AdminActionForm } from "@/components/admin/admin-action-form";
import { createClient } from "@/lib/supabase/server";

import {
  OrderRoleProgressionEditor,
} from "@/components/admin/order-role-progression-editor";

import {
  PublicOrderRoleGraph,
  type PublicOrderGraphLink,
  type PublicOrderGraphRole,
} from "@/components/orders/public-order-role-graph";

import {
  createOrderJob,
  createOrderJobLink,
  deleteOrderJob,
  updateOrderLevel,
  deleteOrderJobLink,
  updateOrderJob,
} from "@/app/(portal)/admin/orders/structure-actions";

type ModifierFields = {
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

type OrderJobRow = ModifierFields & {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  order_level_id: string;
};

type OrderLevelRow = {
  id: string;
  level: number;
  monthly_pay: number;
  jobs: OrderJobRow[] | null;
};

type LinkRow = {
  id: string;
  from_job_id: string;
  to_job_id: string;
};

const ATTRIBUTE_FIELDS = [
  { key: "muscles", label: "Muscles" },
  { key: "reflexes", label: "Reflexes" },
  { key: "vigour", label: "Vigour" },
  { key: "shrewd", label: "Shrewd" },
  { key: "brains", label: "Brains" },
  { key: "presence", label: "Presence" },
] as const;

export async function OrderLevelStructure({ orderId }: { orderId: string }) {
  const supabase = await createClient();

  const [levelsResult, linksResult] = await Promise.all([
    supabase
      .from("order_levels")
      .select(`
        id,
        level,
        monthly_pay,
        jobs:order_jobs(
          id,
          order_level_id,
          name,
          description,
          sort_order,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
        )
      `)
      .eq("order_id", orderId)
      .order("level", { ascending: false }),
    supabase
      .from("order_job_links")
      .select("id, from_job_id, to_job_id"),
  ]);

  if (levelsResult.error) {
    return <div className="mt-7 border border-red-900/50 bg-red-950/15 p-4 text-sm text-red-300">Unable to load this Order&apos;s structure: {levelsResult.error.message}</div>;
  }
  if (linksResult.error) {
    return <div className="mt-7 border border-red-900/50 bg-red-950/15 p-4 text-sm text-red-300">Unable to load Role progression: {linksResult.error.message}</div>;
  }

  const levels = ((levelsResult.data ?? []) as unknown as OrderLevelRow[]).map((level) => ({
    ...level,
    jobs: [...(level.jobs ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }));

  const allJobs = levels.flatMap((level) =>
    (level.jobs ?? []).map((job) => ({ ...job, level: level.level })),
  );
  const roleIds = new Set(allJobs.map((job) => job.id));
  const links = ((linksResult.data ?? []) as LinkRow[]).filter(
    (link) => roleIds.has(link.from_job_id) && roleIds.has(link.to_job_id),
  );
  const jobById = new Map(allJobs.map((job) => [job.id, job]));

  const graphRoles = allJobs.map((job) => ({
  id: job.id,
  name: job.name,
  level: job.level,
  sort_order: job.sort_order,
  description: job.description,
  muscles_modifier: job.muscles_modifier,
  reflexes_modifier: job.reflexes_modifier,
  vigour_modifier: job.vigour_modifier,
  shrewd_modifier: job.shrewd_modifier,
  brains_modifier: job.brains_modifier,
  presence_modifier: job.presence_modifier,
}));

  const graphLinks = links.map((link) => ({
    id: link.id,
    from_job_id: link.from_job_id,
    to_job_id: link.to_job_id,
  })) satisfies PublicOrderGraphLink[];

  return (
    <section className="mt-8 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-6">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">Order hierarchy</p>
      <h4 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">Levels &amp; Roles</h4>
      <p className="mt-2 max-w-4xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Levels define authority. Roles define Attribute modifiers and progression. Link each Role to one or more Roles on the Level immediately above it to create branching or diamond structures.
      </p>

      <PublicOrderRoleGraph
        roles={graphRoles}
        links={graphLinks}
      />

      <OrderRoleProgressionEditor
        orderId={orderId}
        roles={allJobs.map((job) => ({
  id: job.id,
  name: job.name,
  level: job.level,
  sort_order: job.sort_order,
}))}
        initialLinks={links}
      />

      <div className="mt-5 space-y-4">
        {levels.map((level) => {
          const nextLevel = levels.find((candidate) => candidate.level === level.level + 1);
          return (
            <details key={level.id} className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]">
              <summary className="cursor-pointer list-none px-4 py-3">
                <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">Level {level.level}</p>
                <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">{level.jobs?.length ?? 0} {(level.jobs?.length ?? 0) === 1 ? "role" : "roles"}</p>
              </summary>

              <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4">
                <AdminActionForm
                  action={updateOrderLevel}
                  className="mb-4 flex flex-wrap items-end gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3"
                >
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="levelId" value={level.id} />

                  <label className="min-w-[180px] flex-1">
                    <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                      Monthly pay · Remnants
                    </span>
                    <input
                      type="number"
                      name="monthlyPay"
                      min={0}
                      step={1}
                      defaultValue={Number(level.monthly_pay ?? 0)}
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                    />
                  </label>

                  <button
                    type="submit"
                    className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-efd6a8))]"
                  >
                    Save Level Pay
                  </button>
                </AdminActionForm>

                <div className="space-y-4">
                  {(level.jobs ?? []).map((job) => {
                    const outgoing = links.filter((link) => link.from_job_id === job.id);
                    const incoming = links.filter((link) => link.to_job_id === job.id);
                    const linkedAbove = new Set(outgoing.map((link) => link.to_job_id));
                    return (
                      <div key={job.id} className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4">
                        <AdminActionForm action={updateOrderJob}>
                          <input type="hidden" name="orderId" value={orderId} />
                          <input type="hidden" name="jobId" value={job.id} />
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_100px_auto]">
                            <div className="grid gap-2">
                              <input type="text" name="name" required maxLength={120} defaultValue={job.name} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 font-serif text-base text-[rgb(var(--sep-colour-d7c4a5))]" />
                              <input type="text" name="description" defaultValue={job.description ?? ""} placeholder="Optional description" className="w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-a99b89))]" />
                            </div>
                            <input type="number" name="sortOrder" defaultValue={job.sort_order} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))]" />
                            <div className="flex items-end gap-2">
                              <button type="submit" className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-261b12))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-ccb083))]">Save Role</button>
                              <button type="submit" formAction={deleteOrderJob} className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase text-red-300">Delete</button>
                            </div>
                          </div>

                          <p className="mt-4 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Attribute modifiers</p>
                          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {ATTRIBUTE_FIELDS.map(({ key, label }) => (
                              <label key={key}>
                                <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-756958))]">{label}</span>
                                <input type="number" name={`${key}Modifier`} min={-10} max={10} defaultValue={job[`${key}_modifier` as keyof ModifierFields]} className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))]" />
                              </label>
                            ))}
                          </div>
                        </AdminActionForm>

                        <div className="mt-4 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4">
                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Progression</p>
                          <div className="mt-2 grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="text-[8px] text-[rgb(var(--sep-colour-756958))]">From lower Level</p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {incoming.length ? incoming.map((link) => {
                                  const source = jobById.get(link.from_job_id);
                                  return source ? <span key={link.id} className="border border-[rgb(var(--sep-colour-60482e))]/40 px-2 py-1 text-[8px] text-[rgb(var(--sep-colour-b49a75))]">L{source.level} · {source.name}</span> : null;
                                }) : <span className="text-[9px] italic text-[rgb(var(--sep-colour-665b4c))]">No incoming links.</span>}
                              </div>
                            </div>
                            <div>
                              <p className="text-[8px] text-[rgb(var(--sep-colour-756958))]">To higher Level</p>
                              <div className="mt-1 space-y-2">
                                {outgoing.map((link) => {
                                  const target = jobById.get(link.to_job_id);
                                  return target ? (
                                    <form key={link.id} action={deleteOrderJobLink} className="flex items-center justify-between gap-2 border border-[rgb(var(--sep-colour-60482e))]/35 px-2 py-1.5">
                                      <input type="hidden" name="orderId" value={orderId} />
                                      <input type="hidden" name="linkId" value={link.id} />
                                      <span className="text-[8px] text-[rgb(var(--sep-colour-b49a75))]">L{target.level} · {target.name}</span>
                                      <button type="submit" className="text-[7px] uppercase text-red-300">Remove</button>
                                    </form>
                                  ) : null;
                                })}
                                {nextLevel?.jobs?.length ? (
                                  <form action={createOrderJobLink} className="flex gap-2">
                                    <input type="hidden" name="orderId" value={orderId} />
                                    <input type="hidden" name="fromJobId" value={job.id} />
                                    <select name="toJobId" required defaultValue="" className="min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))]">
                                      <option value="" disabled>Link to Level {level.level + 1} Role</option>
                                      {(nextLevel.jobs ?? []).filter((candidate) => !linkedAbove.has(candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                                    </select>
                                    <button type="submit" className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-261b12))] px-3 py-2 text-[7px] uppercase text-[rgb(var(--sep-colour-ccb083))]">Link</button>
                                  </form>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <AdminActionForm action={createOrderJob} className="mt-4 border border-dashed border-[rgb(var(--sep-colour-765937))]/40 bg-[rgb(var(--sep-colour-15100d))]/60 p-3">
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="levelId" value={level.id} />
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Add Role to Level {level.level}</p>
                  <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_90px_auto]">
                    <div className="grid gap-2">
                      <input type="text" name="name" required maxLength={120} placeholder="Role name" className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]" />
                      <input type="text" name="description" placeholder="Optional description" className="w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-a99b89))]" />
                    </div>
                    <input type="number" name="sortOrder" defaultValue={(level.jobs?.length ?? 0) * 10} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))]" />
                    <button type="submit" className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-efd6a8))]">Add Role</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {ATTRIBUTE_FIELDS.map(({ key, label }) => (
                      <label key={key}>
                        <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-756958))]">{label}</span>
                        <input type="number" name={`${key}Modifier`} min={-10} max={10} defaultValue={0} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))]" />
                      </label>
                    ))}
                  </div>
                </AdminActionForm>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
