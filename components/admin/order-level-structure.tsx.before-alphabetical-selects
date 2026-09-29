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
    return <div className="mt-7 border border-red-900/50 bg-red-950/15 p-4 text-sm text-red-300 components_admin_order_level_structure_div_container">Unable to load this Order&apos;s structure: {levelsResult.error.message}</div>;
  }
  if (linksResult.error) {
    return <div className="mt-7 border border-red-900/50 bg-red-950/15 p-4 text-sm text-red-300 components_admin_order_level_structure_div_container_2">Unable to load Role progression: {linksResult.error.message}</div>;
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
    <section className="mt-8 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-6 components_admin_order_level_structure_section_levels_amp_roles">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] components_admin_order_level_structure_p_levels_amp_roles">Order hierarchy</p>
      <h4 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))] components_admin_order_level_structure_h4_levels_amp_roles">Levels &amp; Roles</h4>
      <p className="mt-2 max-w-4xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_order_level_structure_p_levels_amp_roles_2">
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

      <div className="mt-5 space-y-4 components_admin_order_level_structure_div_levels_amp_roles">
        {levels.map((level) => {
          const nextLevel = levels.find((candidate) => candidate.level === level.level + 1);
          return (
            <details key={level.id} className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] components_admin_order_level_structure_details_details">
              <summary className="cursor-pointer list-none px-4 py-3 components_admin_order_level_structure_summary_summary">
                <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] components_admin_order_level_structure_p_text">Level {level.level}</p>
                <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_level_structure_p_text_2">{level.jobs?.length ?? 0} {(level.jobs?.length ?? 0) === 1 ? "role" : "roles"}</p>
              </summary>

              <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4 components_admin_order_level_structure_div_container_3">
                <AdminActionForm
                  action={updateOrderLevel}
                  className="mb-4 flex flex-wrap items-end gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3"
                >
                  <input className="components_admin_order_level_structure_input_order_id" type="hidden" name="orderId" value={orderId} />
                  <input className="components_admin_order_level_structure_input_level_id" type="hidden" name="levelId" value={level.id} />

                  <label className="min-w-[180px] flex-1 components_admin_order_level_structure_label_label">
                    <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_level_structure_span_text">
                      Monthly pay · Remnants
                    </span>
                    <input
                      type="number"
                      name="monthlyPay"
                      min={0}
                      step={1}
                      defaultValue={Number(level.monthly_pay ?? 0)}
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_input_monthly_pay"
                    />
                  </label>

                  <button
                    type="submit"
                    className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-efd6a8))] components_admin_order_level_structure_button_save_level_pay"
                  >
                    Save Level Pay
                  </button>
                </AdminActionForm>

                <div className="space-y-4 components_admin_order_level_structure_div_container_4">
                  {(level.jobs ?? []).map((job) => {
                    const outgoing = links.filter((link) => link.from_job_id === job.id);
                    const incoming = links.filter((link) => link.to_job_id === job.id);
                    const linkedAbove = new Set(outgoing.map((link) => link.to_job_id));
                    return (
                      <div key={job.id} className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4 components_admin_order_level_structure_div_container_5">
                        <AdminActionForm action={updateOrderJob}>
                          <input className="components_admin_order_level_structure_input_order_id_2" type="hidden" name="orderId" value={orderId} />
                          <input className="components_admin_order_level_structure_input_job_id" type="hidden" name="jobId" value={job.id} />
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_100px_auto] components_admin_order_level_structure_div_container_6">
                            <div className="grid gap-2 components_admin_order_level_structure_div_container_7">
                              <input type="text" name="name" required maxLength={120} defaultValue={job.name} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 font-serif text-base text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_input_name" />
                              <input type="text" name="description" defaultValue={job.description ?? ""} placeholder="Optional description" className="w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-a99b89))] components_admin_order_level_structure_input_description" />
                            </div>
                            <input type="number" name="sortOrder" defaultValue={job.sort_order} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_input_sort_order" />
                            <div className="flex items-end gap-2 components_admin_order_level_structure_div_container_8">
                              <button type="submit" className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-261b12))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-ccb083))] components_admin_order_level_structure_button_save_role">Save Role</button>
                              <button type="submit" formAction={deleteOrderJob} className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase text-red-300 components_admin_order_level_structure_button_delete">Delete</button>
                            </div>
                          </div>

                          <p className="mt-4 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_order_level_structure_p_text_3">Attribute modifiers</p>
                          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 components_admin_order_level_structure_div_container_9">
                            {ATTRIBUTE_FIELDS.map(({ key, label }) => (
                              <label className="components_admin_order_level_structure_label_label_2" key={key}>
                                <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-756958))] components_admin_order_level_structure_span_text_2">{label}</span>
                                <input type="number" name={`${key}Modifier`} min={-10} max={10} defaultValue={job[`${key}_modifier` as keyof ModifierFields]} className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_input_field" />
                              </label>
                            ))}
                          </div>
                        </AdminActionForm>

                        <div className="mt-4 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4 components_admin_order_level_structure_div_container_10">
                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_order_level_structure_p_text_4">Progression</p>
                          <div className="mt-2 grid gap-3 md:grid-cols-2 components_admin_order_level_structure_div_container_11">
                            <div className="components_admin_order_level_structure_div_container_12">
                              <p className="text-[8px] text-[rgb(var(--sep-colour-756958))] components_admin_order_level_structure_p_text_5">From lower Level</p>
                              <div className="mt-1 flex flex-wrap gap-1.5 components_admin_order_level_structure_div_container_13">
                                {incoming.length ? incoming.map((link) => {
                                  const source = jobById.get(link.from_job_id);
                                  return source ? <span key={link.id} className="border border-[rgb(var(--sep-colour-60482e))]/40 px-2 py-1 text-[8px] text-[rgb(var(--sep-colour-b49a75))] components_admin_order_level_structure_span_text_3">L{source.level} · {source.name}</span> : null;
                                }) : <span className="text-[9px] italic text-[rgb(var(--sep-colour-665b4c))] components_admin_order_level_structure_span_text_4">No incoming links.</span>}
                              </div>
                            </div>
                            <div className="components_admin_order_level_structure_div_container_14">
                              <p className="text-[8px] text-[rgb(var(--sep-colour-756958))] components_admin_order_level_structure_p_text_6">To higher Level</p>
                              <div className="mt-1 space-y-2 components_admin_order_level_structure_div_container_15">
                                {outgoing.map((link) => {
                                  const target = jobById.get(link.to_job_id);
                                  return target ? (
                                    <form key={link.id} action={deleteOrderJobLink} className="flex items-center justify-between gap-2 border border-[rgb(var(--sep-colour-60482e))]/35 px-2 py-1.5 components_admin_order_level_structure_form_delete_order_job_link">
                                      <input className="components_admin_order_level_structure_input_order_id_3" type="hidden" name="orderId" value={orderId} />
                                      <input className="components_admin_order_level_structure_input_link_id" type="hidden" name="linkId" value={link.id} />
                                      <span className="text-[8px] text-[rgb(var(--sep-colour-b49a75))] components_admin_order_level_structure_span_text_5">L{target.level} · {target.name}</span>
                                      <button type="submit" className="text-[7px] uppercase text-red-300 components_admin_order_level_structure_button_remove">Remove</button>
                                    </form>
                                  ) : null;
                                })}
                                {nextLevel?.jobs?.length ? (
                                  <form action={createOrderJobLink} className="flex gap-2 components_admin_order_level_structure_form_create_order_job_link">
                                    <input className="components_admin_order_level_structure_input_order_id_4" type="hidden" name="orderId" value={orderId} />
                                    <input className="components_admin_order_level_structure_input_job_id_2" type="hidden" name="fromJobId" value={job.id} />
                                    <select name="toJobId" required defaultValue="" className="min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_select_job_id">
                                      <option className="components_admin_order_level_structure_option_job_id" value="" disabled>Link to Level {level.level + 1} Role</option>
                                      {(nextLevel.jobs ?? []).filter((candidate) => !linkedAbove.has(candidate.id)).map((candidate) => <option className="components_admin_order_level_structure_option_job_id_2" key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                                    </select>
                                    <button type="submit" className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-261b12))] px-3 py-2 text-[7px] uppercase text-[rgb(var(--sep-colour-ccb083))] components_admin_order_level_structure_button_link">Link</button>
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
                  <input className="components_admin_order_level_structure_input_order_id_5" type="hidden" name="orderId" value={orderId} />
                  <input className="components_admin_order_level_structure_input_level_id_2" type="hidden" name="levelId" value={level.id} />
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_order_level_structure_p_text_7">Add Role to Level {level.level}</p>
                  <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_90px_auto] components_admin_order_level_structure_div_container_16">
                    <div className="grid gap-2 components_admin_order_level_structure_div_container_17">
                      <input type="text" name="name" required maxLength={120} placeholder="Role name" className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_input_name_2" />
                      <input type="text" name="description" placeholder="Optional description" className="w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-a99b89))] components_admin_order_level_structure_input_description_2" />
                    </div>
                    <input type="number" name="sortOrder" defaultValue={(level.jobs?.length ?? 0) * 10} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_input_sort_order_2" />
                    <button type="submit" className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-efd6a8))] components_admin_order_level_structure_button_add_role">Add Role</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 components_admin_order_level_structure_div_container_18">
                    {ATTRIBUTE_FIELDS.map(({ key, label }) => (
                      <label className="components_admin_order_level_structure_label_label_3" key={key}>
                        <span className="mb-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-756958))] components_admin_order_level_structure_span_text_6">{label}</span>
                        <input type="number" name={`${key}Modifier`} min={-10} max={10} defaultValue={0} className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-center text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_order_level_structure_input_field_2" />
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
