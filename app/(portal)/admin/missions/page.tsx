import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  updateDailyMilestoneDefinition,
  updateDailyMissionDefinition,
} from "./actions";
import {
  AdminMissionForm,
} from "@/components/admin/admin-mission-form";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  await requireAdminSection("missions");
  const admin = createAdminClient();

  const [missionResult, milestoneResult, itemResult] = await Promise.all([
    admin
      .from("daily_mission_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    admin
      .from("daily_mission_milestone_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    admin
      .from("items")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (missionResult.error) throw new Error(missionResult.error.message);
  if (milestoneResult.error) throw new Error(milestoneResult.error.message);
  if (itemResult.error) throw new Error(itemResult.error.message);

  const missions = missionResult.data ?? [];
  const milestones = milestoneResult.data ?? [];
  const items = itemResult.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-7 lg:px-9">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 pb-5">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))]">
          Mission management
        </p>
        <h2 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
          Daily Missions
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-ae9b7d))]">
          Configure targets, availability, milestone eligibility and rewards.
        </p>
      </header>

      <section id="mission-catalogue" className="mt-7 space-y-3">
        <div className="mb-3">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
            Catalogue
          </p>
          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
            Normal Daily Missions
          </h3>
        </div>

        {missions.map((mission) => (
          <AdminMissionForm
            key={mission.id}
            id={`mission-${mission.code}`}
            action={updateDailyMissionDefinition}
            className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
          >
            <input type="hidden" name="id" value={mission.id} />

            <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr_110px_120px]">
              <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Name
                <input name="name" defaultValue={mission.name} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
              </label>

              <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Description
                <input name="description" defaultValue={mission.description} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
              </label>

              <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Target
                <input name="target_value" type="number" min={1} step={1} defaultValue={mission.target_value} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
              </label>

              <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Difficulty
                <select name="difficulty" defaultValue={mission.difficulty} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_110px_auto_auto_auto] md:items-end">
              <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Remnants
                <input name="reward_remnants" type="number" min={0} step={1} defaultValue={mission.reward_remnants} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
              </label>

              <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Reward Item
                <select name="reward_item_id" defaultValue={mission.reward_item_id ?? ""} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none">
                  <option value="">None</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Quantity
                <input name="reward_item_quantity" type="number" min={0} step={1} defaultValue={mission.reward_item_quantity} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
              </label>

              <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                <input name="counts_toward_milestones" type="checkbox" defaultChecked={mission.counts_toward_milestones} />
                Milestones
              </label>

              <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                <input name="is_active" type="checkbox" defaultChecked={mission.is_active} />
                Active
              </label>

              <div aria-hidden="true" />
            </div>

            <p className="mt-2 text-[10px] text-[rgb(var(--sep-colour-746856))]">
              {mission.family} · {mission.objective_type} · {mission.code}
            </p>
          </AdminMissionForm>
        ))}
      </section>

      <section id="mission-milestones" className="mt-9">
        <div className="mb-3">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
            Completion rewards
          </p>
          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
            Daily Milestones
          </h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {milestones.map((milestone) => (
            <AdminMissionForm
              key={milestone.milestone_key}
              id={`milestone-${milestone.milestone_key}`}
              action={updateDailyMilestoneDefinition}
              className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
            >
              <input type="hidden" name="milestone_key" value={milestone.milestone_key} />

              <label className="block text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Name
                <input name="name" defaultValue={milestone.name} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
              </label>

              <label className="mt-3 block text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                Description
                <input name="description" defaultValue={milestone.description} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
              </label>

              <div className="mt-3 grid gap-3 md:grid-cols-[110px_1fr_100px_auto_auto] md:items-end">
                <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                  Remnants
                  <input name="reward_remnants" type="number" min={0} step={1} defaultValue={milestone.reward_remnants} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
                </label>

                <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                  Reward Item
                  <select name="reward_item_id" defaultValue={milestone.reward_item_id ?? ""} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none">
                    <option value="">None</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]">
                  Quantity
                  <input name="reward_item_quantity" type="number" min={0} step={1} defaultValue={milestone.reward_item_quantity} className="mt-1 w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 normal-case tracking-normal text-xs text-[rgb(var(--sep-colour-d5c09b))] outline-none" />
                </label>

                <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                  <input name="is_active" type="checkbox" defaultChecked={milestone.is_active} />
                  Active
                </label>

                <div aria-hidden="true" />
              </div>
            </AdminMissionForm>
          ))}
        </div>
      </section>
    </div>
  );
}
