from pathlib import Path

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run this from the sepulchria-portal repository root.")
    return p.read_text(encoding="utf-8")

def write(path, text):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print(f"✓ {path}")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Could not patch {label}. The expected block was not found.")
    return text.replace(old, new, 1)

component = '"use client";\n\nimport Link from "next/link";\nimport {\n  useCallback,\n  useEffect,\n  useMemo,\n  useState,\n} from "react";\n\nimport { createClient } from "@/lib/supabase/client";\n\ntype MissionJumpRow = {\n  id: string;\n  code_snapshot: string;\n  family_snapshot: string;\n  name_snapshot: string;\n  completed_at: string | null;\n  claimed_at: string | null;\n  sort_order: number;\n};\n\nexport function MissionsContextPanel() {\n  const supabase = useMemo(\n    () => createClient(),\n    [],\n  );\n\n  const [missions, setMissions] =\n    useState<MissionJumpRow[]>([]);\n\n  const [search, setSearch] =\n    useState("");\n\n  const [loading, setLoading] =\n    useState(true);\n\n  const loadMissions = useCallback(async () => {\n    setLoading(true);\n\n    const {\n      data: { user },\n    } = await supabase.auth.getUser();\n\n    if (!user) {\n      setMissions([]);\n      setLoading(false);\n      return;\n    }\n\n    const { data: character } = await supabase\n      .from("characters")\n      .select("id, status")\n      .eq("user_id", user.id)\n      .maybeSingle();\n\n    if (!character || character.status !== "approved") {\n      setMissions([]);\n      setLoading(false);\n      return;\n    }\n\n    const {\n      data: dayId,\n      error: dayError,\n    } = await supabase.rpc(\n      "ensure_my_daily_mission_day",\n    );\n\n    if (dayError || !dayId) {\n      console.error(\n        "Unable to load Daily Missions context:",\n        dayError?.message,\n      );\n      setMissions([]);\n      setLoading(false);\n      return;\n    }\n\n    await supabase.rpc(\n      "refresh_my_daily_mission_progress",\n    );\n\n    const {\n      data,\n      error,\n    } = await supabase\n      .from("daily_mission_assignments")\n      .select(\n        "id, code_snapshot, family_snapshot, name_snapshot, completed_at, claimed_at, sort_order",\n      )\n      .eq("day_id", dayId)\n      .order("sort_order", {\n        ascending: true,\n      });\n\n    if (error) {\n      console.error(\n        "Unable to load Daily Missions context:",\n        error.message,\n      );\n      setMissions([]);\n    } else {\n      setMissions(\n        (data ?? []) as MissionJumpRow[],\n      );\n    }\n\n    setLoading(false);\n  }, [supabase]);\n\n  useEffect(() => {\n    void loadMissions();\n\n    function handleFocus() {\n      void loadMissions();\n    }\n\n    function handleVisibility() {\n      if (\n        document.visibilityState ===\n        "visible"\n      ) {\n        void loadMissions();\n      }\n    }\n\n    window.addEventListener(\n      "focus",\n      handleFocus,\n    );\n\n    document.addEventListener(\n      "visibilitychange",\n      handleVisibility,\n    );\n\n    return () => {\n      window.removeEventListener(\n        "focus",\n        handleFocus,\n      );\n\n      document.removeEventListener(\n        "visibilitychange",\n        handleVisibility,\n      );\n    };\n  }, [loadMissions]);\n\n  const query =\n    search\n      .trim()\n      .toLocaleLowerCase();\n\n  const visibleMissions =\n    missions.filter((mission) => {\n      if (!query) {\n        return true;\n      }\n\n      return (\n        `${mission.family_snapshot} ${mission.name_snapshot}`\n          .toLocaleLowerCase()\n          .includes(query)\n      );\n    });\n\n  function jumpToMission(\n    event: React.MouseEvent<HTMLAnchorElement>,\n    code: string,\n  ) {\n    event.preventDefault();\n\n    const id = `mission-${code}`;\n    const target =\n      document.getElementById(id);\n\n    if (target) {\n      target.scrollIntoView({\n        behavior: "smooth",\n        block: "start",\n      });\n\n      window.history.replaceState(\n        null,\n        "",\n        `#${id}`,\n      );\n      return;\n    }\n\n    window.location.hash = id;\n  }\n\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <div>\n        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-a88658))]">\n          Daily Missions\n        </p>\n\n        <h2 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))]">\n          Today&apos;s Missions\n        </h2>\n      </div>\n\n      <input\n        type="search"\n        value={search}\n        onChange={(event) =>\n          setSearch(\n            event.target.value,\n          )\n        }\n        placeholder="Search missions..."\n        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))]"\n      />\n\n      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />\n\n      <p className="mb-2 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">\n        Missions · {visibleMissions.length}\n      </p>\n\n      <div\n        data-portal-scroll\n        className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"\n      >\n        {loading ? (\n          <p className="px-2 py-3 text-xs text-[rgb(var(--sep-colour-8f826f))]">\n            Loading missions...\n          </p>\n        ) : null}\n\n        {!loading &&\n        visibleMissions.length === 0 ? (\n          <p className="px-2 py-3 text-xs text-[rgb(var(--sep-colour-8f826f))]">\n            No matching missions.\n          </p>\n        ) : null}\n\n        {visibleMissions.map(\n          (mission) => {\n            const complete =\n              mission.completed_at !== null;\n\n            const claimed =\n              mission.claimed_at !== null;\n\n            return (\n              <Link\n                key={mission.id}\n                href={`/missions#mission-${mission.code_snapshot}`}\n                onClick={(event) =>\n                  jumpToMission(\n                    event,\n                    mission.code_snapshot,\n                  )\n                }\n                className="block border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[rgb(var(--sep-colour-a7977f))] transition-colors hover:border-[rgb(var(--sep-colour-80613b))]/50 hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-d8c19a))]"\n              >\n                <span className="flex items-center justify-between gap-2">\n                  <span className="block min-w-0">\n                    <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f45))]">\n                      {mission.family_snapshot}\n                    </span>\n\n                    <span className="mt-0.5 block truncate font-serif text-[13px]">\n                      {mission.name_snapshot}\n                    </span>\n                  </span>\n\n                  {claimed ? (\n                    <span className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-766b59))]">\n                      Claimed\n                    </span>\n                  ) : complete ? (\n                    <span className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-bb9764))]">\n                      Ready\n                    </span>\n                  ) : null}\n                </span>\n              </Link>\n            );\n          },\n        )}\n      </div>\n    </div>\n  );\n}\n'
write("components/portal/missions-context-panel.tsx", component)

path = "components/portal/portal-context-panel.tsx"
text = read(path)

text = replace_once(
    text,
    'import { GameContextPanel } from "@/components/portal/game-context-panel";\n',
    'import { GameContextPanel } from "@/components/portal/game-context-panel";\nimport { MissionsContextPanel } from "@/components/portal/missions-context-panel";\n',
    path,
)

text = replace_once(
    text,
    """if (pathname === "/ranking") {
  return <HallOfRenownContext />;
}

""",
    """if (pathname === "/ranking") {
  return <HallOfRenownContext />;
}

if (pathname === "/missions") {
  return <MissionsContextPanel />;
}

""",
    path,
)

write(path, text)

path = "app/(portal)/missions/page.tsx"
text = read(path)

text = replace_once(
    text,
    """                    <article
                      key={mission.id}
                      className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
                    >
""",
    """                    <article
                      key={mission.id}
                      id={`mission-${mission.code_snapshot}`}
                      className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
                    >
""",
    path,
)

write(path, text)

print()
print("Missions game context panel added.")
print("Now run: npm run build")
