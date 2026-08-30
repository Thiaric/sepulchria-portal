from pathlib import Path

BASELINE = "1d2041e"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from the sepulchria-portal repository root.")
    return p.read_text(encoding="utf-8")

def write(path, text):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print(f"✓ {path}")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(
            f"Could not patch {label}. Expected baseline {BASELINE} or an already-applied patch."
        )
    return text.replace(old, new, 1)

FILES = {'components/admin/admin-mission-form.tsx': '"use client";\n\nimport {\n  useActionState,\n  useEffect,\n  useState,\n  type ReactNode,\n} from "react";\nimport { useFormStatus } from "react-dom";\n\nexport type AdminMissionActionState = {\n  ok: boolean | null;\n  message: string;\n};\n\nconst INITIAL_STATE: AdminMissionActionState = {\n  ok: null,\n  message: "",\n};\n\nfunction SaveButton() {\n  const { pending } = useFormStatus();\n\n  return (\n    <button\n      type="submit"\n      disabled={pending}\n      className="min-w-[88px] border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d9c092))] transition-colors enabled:hover:border-[rgb(var(--sep-colour-a07945))] enabled:hover:bg-[rgb(var(--sep-colour-302116))] disabled:cursor-wait disabled:opacity-60"\n    >\n      {pending ? "Saving..." : "Save"}\n    </button>\n  );\n}\n\nexport function AdminMissionForm({\n  action,\n  children,\n  id,\n  className,\n}: {\n  action: (\n    previousState: AdminMissionActionState,\n    formData: FormData,\n  ) => Promise<AdminMissionActionState>;\n  children: ReactNode;\n  id?: string;\n  className?: string;\n}) {\n  const [state, formAction] =\n    useActionState(action, INITIAL_STATE);\n\n  const [visible, setVisible] =\n    useState(false);\n\n  useEffect(() => {\n    if (state.ok === null) return;\n\n    setVisible(true);\n\n    window.dispatchEvent(\n      new CustomEvent(\n        "sepulchria:admin-data-changed",\n      ),\n    );\n\n    const timer = window.setTimeout(\n      () => setVisible(false),\n      5000,\n    );\n\n    return () =>\n      window.clearTimeout(timer);\n  }, [state]);\n\n  return (\n    <form\n      id={id}\n      action={formAction}\n      className={`${className ?? ""} relative pb-16`}\n    >\n      {children}\n\n      <div className="absolute bottom-4 right-4 flex min-w-[180px] flex-col items-end gap-1.5">\n        <SaveButton />\n\n        <div\n          aria-live="polite"\n          className={[\n            "min-h-[18px] max-w-[280px] text-right text-[10px] leading-4 transition-opacity",\n            visible\n              ? "opacity-100"\n              : "pointer-events-none opacity-0",\n            state.ok === false\n              ? "text-[rgb(var(--sep-colour-d26d60))]"\n              : "text-[rgb(var(--sep-colour-bfa471))]",\n          ].join(" ")}\n        >\n          {visible ? state.message : ""}\n        </div>\n      </div>\n    </form>\n  );\n}\n', 'app/(portal)/admin/missions/actions.ts': '"use server";\n\nimport { revalidatePath } from "next/cache";\nimport { requireAdminSection } from "@/lib/auth/require-staff";\nimport { createAdminClient } from "@/lib/supabase/admin";\nimport type {\n  AdminMissionActionState,\n} from "@/components/admin/admin-mission-form";\n\nfunction text(formData: FormData, key: string) {\n  return String(formData.get(key) ?? "").trim();\n}\n\nfunction success(message: string): AdminMissionActionState {\n  return { ok: true, message };\n}\n\nfunction failure(message: string): AdminMissionActionState {\n  return { ok: false, message };\n}\n\nexport async function updateDailyMissionDefinition(\n  _previousState: AdminMissionActionState,\n  formData: FormData,\n): Promise<AdminMissionActionState> {\n  await requireAdminSection("missions");\n\n  try {\n    const admin = createAdminClient();\n\n    const id = text(formData, "id");\n    const targetValue = Number(text(formData, "target_value"));\n    const rewardRemnants = Number(text(formData, "reward_remnants"));\n    const rewardItemQuantity = Number(text(formData, "reward_item_quantity"));\n    const rewardItemId = text(formData, "reward_item_id") || null;\n    const isActive = formData.get("is_active") === "on";\n    const countsToward =\n      formData.get("counts_toward_milestones") === "on";\n\n    if (!id) return failure("Mission is required.");\n\n    if (!Number.isSafeInteger(targetValue) || targetValue < 1) {\n      return failure("Target must be a positive whole number.");\n    }\n\n    if (!Number.isSafeInteger(rewardRemnants) || rewardRemnants < 0) {\n      return failure("Remnant reward must be zero or more.");\n    }\n\n    if (\n      !Number.isSafeInteger(rewardItemQuantity) ||\n      rewardItemQuantity < 0\n    ) {\n      return failure("Item quantity must be zero or more.");\n    }\n\n    const missionName =\n      text(formData, "name") || "Daily Mission";\n\n    const { error } = await admin\n      .from("daily_mission_definitions")\n      .update({\n        name: missionName,\n        description: text(formData, "description"),\n        target_value: targetValue,\n        difficulty: text(formData, "difficulty"),\n        reward_remnants: rewardRemnants,\n        reward_item_id: rewardItemId,\n        reward_item_quantity: rewardItemId ? rewardItemQuantity : 0,\n        is_active: isActive,\n        counts_toward_milestones: countsToward,\n      })\n      .eq("id", id);\n\n    if (error) return failure(error.message);\n\n    if (!isActive) {\n      const today = new Date().toISOString().slice(0, 10);\n\n      const { data: dayRows, error: dayError } = await admin\n        .from("daily_mission_days")\n        .select("id")\n        .eq("mission_date", today);\n\n      if (dayError) return failure(dayError.message);\n\n      const dayIds = (dayRows ?? []).map((row) => row.id);\n\n      if (dayIds.length > 0) {\n        const { error: assignmentError } = await admin\n          .from("daily_mission_assignments")\n          .update({\n            counts_toward_milestones: false,\n          })\n          .eq("mission_definition_id", id)\n          .in("day_id", dayIds);\n\n        if (assignmentError) {\n          return failure(assignmentError.message);\n        }\n      }\n    }\n\n    revalidatePath("/admin/missions");\n    revalidatePath("/missions");\n\n    return success(`${missionName} saved.`);\n  } catch (error) {\n    return failure(\n      error instanceof Error\n        ? error.message\n        : "Could not save mission.",\n    );\n  }\n}\n\nexport async function updateDailyMilestoneDefinition(\n  _previousState: AdminMissionActionState,\n  formData: FormData,\n): Promise<AdminMissionActionState> {\n  await requireAdminSection("missions");\n\n  try {\n    const admin = createAdminClient();\n\n    const milestoneKey = text(formData, "milestone_key");\n    const rewardRemnants = Number(text(formData, "reward_remnants"));\n    const rewardItemQuantity = Number(\n      text(formData, "reward_item_quantity"),\n    );\n    const rewardItemId = text(formData, "reward_item_id") || null;\n\n    if (!milestoneKey) return failure("Milestone is required.");\n\n    if (!Number.isSafeInteger(rewardRemnants) || rewardRemnants < 0) {\n      return failure("Remnant reward must be zero or more.");\n    }\n\n    if (\n      !Number.isSafeInteger(rewardItemQuantity) ||\n      rewardItemQuantity < 0\n    ) {\n      return failure("Item quantity must be zero or more.");\n    }\n\n    const milestoneName =\n      text(formData, "name") || "Daily Milestone";\n\n    const { error } = await admin\n      .from("daily_mission_milestone_definitions")\n      .update({\n        name: milestoneName,\n        description: text(formData, "description"),\n        reward_remnants: rewardRemnants,\n        reward_item_id: rewardItemId,\n        reward_item_quantity: rewardItemId ? rewardItemQuantity : 0,\n        is_active: formData.get("is_active") === "on",\n      })\n      .eq("milestone_key", milestoneKey);\n\n    if (error) return failure(error.message);\n\n    revalidatePath("/admin/missions");\n    revalidatePath("/missions");\n\n    return success(`${milestoneName} saved.`);\n  } catch (error) {\n    return failure(\n      error instanceof Error\n        ? error.message\n        : "Could not save milestone.",\n    );\n  }\n}\n', 'components/portal/admin-missions-context.tsx': '"use client";\n\nimport Link from "next/link";\nimport {\n  useCallback,\n  useEffect,\n  useMemo,\n  useState,\n} from "react";\n\nimport { createClient } from "@/lib/supabase/client";\n\ntype MissionLink = {\n  id: string;\n  code: string;\n  family: string;\n  name: string;\n  sort_order: number;\n};\n\ntype MilestoneLink = {\n  milestone_key: string;\n  name: string;\n  sort_order: number;\n};\n\nexport function AdminMissionsContext() {\n  const supabase = useMemo(\n    () => createClient(),\n    [],\n  );\n\n  const [missions, setMissions] =\n    useState<MissionLink[]>([]);\n\n  const [milestones, setMilestones] =\n    useState<MilestoneLink[]>([]);\n\n  const [search, setSearch] =\n    useState("");\n\n  const load = useCallback(async () => {\n    const [missionResult, milestoneResult] =\n      await Promise.all([\n        supabase\n          .from("daily_mission_definitions")\n          .select("id, code, family, name, sort_order")\n          .order("sort_order", { ascending: true }),\n        supabase\n          .from("daily_mission_milestone_definitions")\n          .select("milestone_key, name, sort_order")\n          .order("sort_order", { ascending: true }),\n      ]);\n\n    if (!missionResult.error) {\n      setMissions(\n        (missionResult.data ?? []) as MissionLink[],\n      );\n    }\n\n    if (!milestoneResult.error) {\n      setMilestones(\n        (milestoneResult.data ?? []) as MilestoneLink[],\n      );\n    }\n  }, [supabase]);\n\n  useEffect(() => {\n    void load();\n\n    const handleChanged = () => {\n      void load();\n    };\n\n    window.addEventListener(\n      "sepulchria:admin-data-changed",\n      handleChanged,\n    );\n\n    return () => {\n      window.removeEventListener(\n        "sepulchria:admin-data-changed",\n        handleChanged,\n      );\n    };\n  }, [load]);\n\n  const query = search.trim().toLocaleLowerCase();\n\n  const visibleMissions = missions.filter(\n    (mission) =>\n      !query ||\n      `${mission.family} ${mission.name}`\n        .toLocaleLowerCase()\n        .includes(query),\n  );\n\n  const visibleMilestones = milestones.filter(\n    (milestone) =>\n      !query ||\n      milestone.name\n        .toLocaleLowerCase()\n        .includes(query),\n  );\n\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <div>\n        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-a88658))]">\n          Mission management\n        </p>\n\n        <h2 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))]">\n          Daily Missions\n        </h2>\n      </div>\n\n      <div className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3">\n        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">\n          Daily rules\n        </p>\n\n        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-948672))]">\n          Reset: midnight UTC. Unclaimed rewards expire.\n          Mission rewards never create Daily Mission progress.\n        </p>\n      </div>\n\n      <input\n        type="search"\n        value={search}\n        onChange={(event) =>\n          setSearch(event.target.value)\n        }\n        placeholder="Search missions..."\n        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))]"\n      />\n\n      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />\n\n      <p className="mb-2 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">\n        Missions · {visibleMissions.length}\n      </p>\n\n      <div\n        data-portal-scroll\n        className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"\n      >\n        {visibleMissions.map((mission) => (\n          <Link\n            key={mission.id}\n            href={`/admin/missions#mission-${mission.code}`}\n            className="block border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[rgb(var(--sep-colour-a7977f))] transition-colors hover:border-[rgb(var(--sep-colour-80613b))]/50 hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-d8c19a))]"\n          >\n            <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f45))]">\n              {mission.family}\n            </span>\n\n            <span className="mt-0.5 block truncate font-serif text-[13px]">\n              {mission.name}\n            </span>\n          </Link>\n        ))}\n\n        {visibleMilestones.length > 0 ? (\n          <>\n            <div className="my-3 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />\n\n            <p className="mb-2 px-1 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">\n              Daily Milestones\n            </p>\n\n            {visibleMilestones.map((milestone) => (\n              <Link\n                key={milestone.milestone_key}\n                href={`/admin/missions#milestone-${milestone.milestone_key}`}\n                className="block border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[rgb(var(--sep-colour-a7977f))] transition-colors hover:border-[rgb(var(--sep-colour-80613b))]/50 hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-d8c19a))]"\n              >\n                <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f45))]">\n                  Milestone\n                </span>\n\n                <span className="mt-0.5 block truncate font-serif text-[13px]">\n                  {milestone.name}\n                </span>\n              </Link>\n            ))}\n          </>\n        ) : null}\n      </div>\n    </div>\n  );\n}\n', 'components/missions/missions-live-sync.tsx': '"use client";\n\nimport {\n  useCallback,\n  useEffect,\n  useMemo,\n  useRef,\n} from "react";\n\nimport { createClient } from "@/lib/supabase/client";\n\ntype MissionLiveRow = {\n  id: string;\n  code_snapshot: string;\n  progress: number;\n  target_snapshot: number;\n  completed_at: string | null;\n  claimed_at: string | null;\n  counts_toward_milestones: boolean;\n};\n\ntype MilestoneLiveRow = {\n  id: string;\n  milestone_key: string;\n  target_count_snapshot: number | null;\n  is_all_snapshot: boolean;\n  claimed_at: string | null;\n};\n\nfunction setText(\n  root: HTMLElement,\n  selector: string,\n  value: string,\n) {\n  const node =\n    root.querySelector<HTMLElement>(selector);\n\n  if (node && node.textContent !== value) {\n    node.textContent = value;\n  }\n}\n\nfunction setHidden(\n  root: HTMLElement,\n  selector: string,\n  hidden: boolean,\n) {\n  const node =\n    root.querySelector<HTMLElement>(selector);\n\n  if (node && node.hidden !== hidden) {\n    node.hidden = hidden;\n  }\n}\n\nfunction updateBeads(\n  root: HTMLElement,\n  progress: number,\n  target: number,\n) {\n  const safeTarget = Math.max(1, target);\n\n  const beads =\n    root.querySelectorAll<HTMLElement>(\n      "[data-progress-bead]",\n    );\n\n  const segments = beads.length;\n\n  const filled = Math.min(\n    segments,\n    Math.floor(\n      (Math.min(progress, safeTarget) / safeTarget) *\n        segments,\n    ),\n  );\n\n  beads.forEach((bead, index) => {\n    const active = index < filled;\n\n    bead.classList.toggle(\n      "border-[rgb(var(--sep-colour-a67d47))]",\n      active,\n    );\n    bead.classList.toggle(\n      "bg-[rgb(var(--sep-colour-8f6738))]",\n      active,\n    );\n    bead.classList.toggle(\n      "border-[rgb(var(--sep-colour-59432c))]/55",\n      !active,\n    );\n    bead.classList.toggle(\n      "bg-[rgb(var(--sep-colour-17110d))]",\n      !active,\n    );\n  });\n}\n\nexport function MissionsLiveSync({\n  dayId,\n}: {\n  dayId: string;\n}) {\n  const supabase = useMemo(\n    () => createClient(),\n    [],\n  );\n\n  const previousRef =\n    useRef<string>("");\n\n  const sync = useCallback(async () => {\n    const { error: refreshError } =\n      await supabase.rpc(\n        "refresh_my_daily_mission_progress",\n      );\n\n    if (refreshError) {\n      console.warn(\n        "Daily Missions refresh:",\n        refreshError.message,\n      );\n      return;\n    }\n\n    const [missionResult, milestoneResult] =\n      await Promise.all([\n        supabase\n          .from("daily_mission_assignments")\n          .select(\n            "id, code_snapshot, progress, target_snapshot, completed_at, claimed_at, counts_toward_milestones",\n          )\n          .eq("day_id", dayId)\n          .order("sort_order", {\n            ascending: true,\n          }),\n        supabase\n          .from("daily_mission_milestone_claims")\n          .select(\n            "id, milestone_key, target_count_snapshot, is_all_snapshot, claimed_at",\n          )\n          .eq("day_id", dayId),\n      ]);\n\n    if (\n      missionResult.error ||\n      milestoneResult.error\n    ) {\n      console.warn(\n        "Daily Missions live sync:",\n        missionResult.error?.message ??\n          milestoneResult.error?.message,\n      );\n      return;\n    }\n\n    const missions =\n      (missionResult.data ?? []) as MissionLiveRow[];\n\n    const milestones =\n      (milestoneResult.data ?? []) as MilestoneLiveRow[];\n\n    const signature =\n      JSON.stringify({\n        missions,\n        milestones,\n      });\n\n    if (previousRef.current === signature) {\n      return;\n    }\n\n    previousRef.current = signature;\n\n    for (const mission of missions) {\n      const root =\n        document.querySelector<HTMLElement>(\n          `[data-mission-card="${mission.code_snapshot}"]`,\n        );\n\n      if (!root) continue;\n\n      const progress = Math.min(\n        mission.progress,\n        mission.target_snapshot,\n      );\n\n      setText(\n        root,\n        "[data-progress-count]",\n        `${progress} / ${mission.target_snapshot}`,\n      );\n\n      updateBeads(\n        root,\n        progress,\n        mission.target_snapshot,\n      );\n\n      setHidden(\n        root,\n        "[data-mission-complete]",\n        !mission.completed_at,\n      );\n\n      setHidden(\n        root,\n        "[data-mission-excluded]",\n        mission.counts_toward_milestones,\n      );\n\n      const button =\n        root.querySelector<HTMLButtonElement>(\n          "[data-mission-claim]",\n        );\n\n      if (button) {\n        button.disabled =\n          !mission.completed_at ||\n          Boolean(mission.claimed_at);\n\n        button.textContent =\n          mission.claimed_at\n            ? "Claimed"\n            : mission.completed_at\n              ? "Claim"\n              : "In Progress";\n      }\n    }\n\n    const countable = missions.filter(\n      (mission) =>\n        mission.counts_toward_milestones,\n    );\n\n    const completed = countable.filter(\n      (mission) =>\n        mission.completed_at !== null,\n    ).length;\n\n    const total = countable.length;\n\n    const summary =\n      document.querySelector<HTMLElement>(\n        "[data-mission-summary]",\n      );\n\n    if (summary) {\n      summary.textContent =\n        `${completed} / ${total} missions complete`;\n    }\n\n    for (const milestone of milestones) {\n      const root =\n        document.querySelector<HTMLElement>(\n          `[data-milestone-card="${milestone.milestone_key}"]`,\n        );\n\n      if (!root) continue;\n\n      const required =\n        milestone.is_all_snapshot\n          ? total\n          : Number(\n              milestone.target_count_snapshot ?? 0,\n            );\n\n      const safeRequired =\n        Math.max(required, 1);\n\n      const progress =\n        Math.min(completed, safeRequired);\n\n      setText(\n        root,\n        "[data-progress-count]",\n        `${progress} / ${safeRequired}`,\n      );\n\n      updateBeads(\n        root,\n        progress,\n        safeRequired,\n      );\n\n      const complete =\n        required > 0 &&\n        completed >= required;\n\n      const button =\n        root.querySelector<HTMLButtonElement>(\n          "[data-milestone-claim]",\n        );\n\n      if (button) {\n        button.disabled =\n          !complete ||\n          Boolean(milestone.claimed_at);\n\n        button.textContent =\n          milestone.claimed_at\n            ? "Claimed"\n            : complete\n              ? "Claim Reward"\n              : "In Progress";\n      }\n    }\n\n    window.dispatchEvent(\n      new CustomEvent(\n        "sepulchria:missions-live-updated",\n      ),\n    );\n  }, [dayId, supabase]);\n\n  useEffect(() => {\n    void sync();\n\n    const timer =\n      window.setInterval(\n        () => {\n          void sync();\n        },\n        30_000,\n      );\n\n    return () =>\n      window.clearInterval(timer);\n  }, [sync]);\n\n  return null;\n}\n'}

for path, text in FILES.items():
    write(path, text)

# Admin page -> client save wrappers
path = "app/(portal)/admin/missions/page.tsx"
text = read(path)

text = replace_once(
    text,
    """import {
  updateDailyMilestoneDefinition,
  updateDailyMissionDefinition,
} from "./actions";
""",
    """import {
  updateDailyMilestoneDefinition,
  updateDailyMissionDefinition,
} from "./actions";
import {
  AdminMissionForm,
} from "@/components/admin/admin-mission-form";
""",
    path,
)

text = replace_once(
    text,
    """          <form
            key={mission.id}
            id={`mission-${mission.code}`}
            action={updateDailyMissionDefinition}
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
          >""",
    """          <AdminMissionForm
            key={mission.id}
            id={`mission-${mission.code}`}
            action={updateDailyMissionDefinition}
            className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
          >""",
    path,
)

mission_button = """              <button type="submit" className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d9c092))] transition-colors hover:border-[rgb(var(--sep-colour-a07945))] hover:bg-[rgb(var(--sep-colour-302116))]">
                Save
              </button>
"""
text = replace_once(
    text,
    mission_button,
    """              <div aria-hidden="true" />
""",
    path,
)

text = replace_once(
    text,
    """          </form>
        ))}
""",
    """          </AdminMissionForm>
        ))}
""",
    path,
)

text = replace_once(
    text,
    """            <form
              key={milestone.milestone_key}
              id={`milestone-${milestone.milestone_key}`}
              action={updateDailyMilestoneDefinition}
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
            >""",
    """            <AdminMissionForm
              key={milestone.milestone_key}
              id={`milestone-${milestone.milestone_key}`}
              action={updateDailyMilestoneDefinition}
              className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
            >""",
    path,
)

milestone_button = """                <button type="submit" className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d9c092))] transition-colors hover:border-[rgb(var(--sep-colour-a07945))] hover:bg-[rgb(var(--sep-colour-302116))]">
                  Save
                </button>
"""
text = replace_once(
    text,
    milestone_button,
    """                <div aria-hidden="true" />
""",
    path,
)

text = replace_once(
    text,
    """            </form>
          ))}
""",
    """            </AdminMissionForm>
          ))}
""",
    path,
)

write(path, text)

# /missions: red exclusion badge + 30-sec targeted live sync
path = "app/(portal)/missions/page.tsx"
text = read(path)

text = replace_once(
    text,
    """import {
  claimDailyMilestone,
  claimDailyMission,
} from "./actions";
""",
    """import {
  claimDailyMilestone,
  claimDailyMission,
} from "./actions";
import {
  MissionsLiveSync,
} from "@/components/missions/missions-live-sync";
""",
    path,
)

text = replace_once(
    text,
    """  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-7 lg:px-9">
""",
    """  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-7 lg:px-9">
      <MissionsLiveSync dayId={String(dayId)} />
""",
    path,
)

text = replace_once(
    text,
    """          <p className="text-xs text-[rgb(var(--sep-colour-9e8b70))]">
            {completedCount} / {countableTotal} missions complete
          </p>
""",
    """          <p
            data-mission-summary
            className="text-xs text-[rgb(var(--sep-colour-9e8b70))]"
          >
            {completedCount} / {countableTotal} missions complete
          </p>
""",
    path,
)

text = replace_once(
    text,
    """              <article
                key={milestone.id}
                className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
              >""",
    """              <article
                key={milestone.id}
                data-milestone-card={milestone.milestone_key}
                className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
              >""",
    path,
)

text = replace_once(
    text,
    """                    <article
                      key={mission.id}
                      id={`mission-${mission.code_snapshot}`}
                      className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
                    >""",
    """                    <article
                      key={mission.id}
                      id={`mission-${mission.code_snapshot}`}
                      data-mission-card={mission.code_snapshot}
                      className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
                    >""",
    path,
)

text = replace_once(
    text,
    """                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                            {mission.difficulty_snapshot}
                            {!mission.counts_toward_milestones
                              ? " · does not count toward milestones"
                              : ""}
                          </p>
""",
    """                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                            {mission.difficulty_snapshot}
                          </p>
""",
    path,
)

text = replace_once(
    text,
    """                        {complete ? (
                          <span className="shrink-0 border border-[rgb(var(--sep-colour-80613b))]/60 px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d7bd8f))]">
                            Complete
                          </span>
                        ) : null}
""",
    """                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            data-mission-excluded
                            hidden={mission.counts_toward_milestones}
                            className="border border-red-700/70 bg-red-950/45 px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-red-300"
                          >
                            Does not count toward milestones
                          </span>

                          <span
                            data-mission-complete
                            hidden={!complete}
                            className="border border-[rgb(var(--sep-colour-80613b))]/60 px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d7bd8f))]"
                          >
                            Complete
                          </span>
                        </div>
""",
    path,
)

text = replace_once(
    text,
    """          <span
            key={index}
            className={[
""",
    """          <span
            key={index}
            data-progress-bead
            className={[
""",
    path,
)

text = replace_once(
    text,
    """      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[rgb(var(--sep-colour-d3bd97))]">
""",
    """      <span
        data-progress-count
        className="shrink-0 font-mono text-[11px] tabular-nums text-[rgb(var(--sep-colour-d3bd97))]"
      >
""",
    path,
)

text = replace_once(
    text,
    """                  <button
                    type="submit"
                    disabled={!complete || milestone.claimed_at !== null}
""",
    """                  <button
                    data-milestone-claim
                    type="submit"
                    disabled={!complete || milestone.claimed_at !== null}
""",
    path,
)

text = replace_once(
    text,
    """                          <button
                            type="submit"
                            disabled={!complete || mission.claimed_at !== null}
""",
    """                          <button
                            data-mission-claim
                            type="submit"
                            disabled={!complete || mission.claimed_at !== null}
""",
    path,
)

write(path, text)

print()
print("Patch applied from baseline 1d2041e.")
print("Now run: npm run build")
