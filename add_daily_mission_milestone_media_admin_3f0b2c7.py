from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "3f0b2c7f9d271f468cf08bba0ae6e2f2804e0cb0"

FILES = [
    ROOT / "app" / "(portal)" / "missions" / "page.tsx",
    ROOT / "app" / "(portal)" / "admin" / "jobs" / "page.tsx",
    ROOT / "app" / "(portal)" / "admin" / "jobs" / "actions.ts",
    ROOT / "app" / "(portal)" / "admin" / "missions" / "page.tsx",
    ROOT / "app" / "(portal)" / "admin" / "missions" / "actions.ts",
]

BACKUP = ROOT / ".mission-media-admin-backup"

def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return text.replace(old, new, 1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        f"This patch is locked to {EXPECTED_HEAD[:7]}; "
        f"your current HEAD is {head[:7]}."
    )

for path in FILES:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

if BACKUP.exists():
    shutil.rmtree(BACKUP)

for path in FILES:
    dest = BACKUP / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

def restore() -> None:
    for path in FILES:
        src = BACKUP / path.relative_to(ROOT)
        if src.exists():
            shutil.copy2(src, path)

try:
    # ===============================================================
    # /admin/jobs — image_url create/edit
    # ===============================================================
    jobs_actions = FILES[2].read_text(encoding="utf-8")

    jobs_actions = replace_once(
        jobs_actions,
        '''  const name = readText(formData, "name");
  const description = readText(formData, "description");

  validateJob(name, description);''',
        '''  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const imageUrl =
    readText(formData, "image_url") || null;

  validateJob(name, description);''',
        "createOddJob imageUrl",
    )

    jobs_actions = replace_once(
        jobs_actions,
        '''    description,
    is_active: true,''',
        '''    description,
    image_url: imageUrl,
    is_active: true,''',
        "createOddJob image_url insert",
    )

    # second name/description block belongs to updateOddJob
    marker = '''export async function updateOddJob(formData: FormData) {'''
    before, after = jobs_actions.split(marker, 1)
    after = replace_once(
        after,
        '''  const name = readText(formData, "name");
  const description = readText(formData, "description");

  if (!jobId)''',
        '''  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const imageUrl =
    readText(formData, "image_url") || null;

  if (!jobId)''',
        "updateOddJob imageUrl",
    )
    after = replace_once(
        after,
        '''      name,
      description,
      updated_at:''',
        '''      name,
      description,
      image_url: imageUrl,
      updated_at:''',
        "updateOddJob image_url update",
    )
    jobs_actions = before + marker + after
    FILES[2].write_text(jobs_actions, encoding="utf-8")

    jobs_page = FILES[1].read_text(encoding="utf-8")
    jobs_page = replace_once(
        jobs_page,
        '''  description: string;
  sort_order: number;''',
        '''  description: string;
  image_url: string | null;
  sort_order: number;''',
        "OddJobRow image_url",
    )
    jobs_page = replace_once(
        jobs_page,
        '''    .select("id, name, description, sort_order")''',
        '''    .select("id, name, description, image_url, sort_order")''',
        "Odd Jobs select image_url",
    )

    create_job_anchor = '''            <div className="flex justify-end admin_jobs_page_div_job_new">'''
    create_job_media = '''            <label className="admin_jobs_page_label_job_image">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                Background Image URL
              </span>
              <input
                type="text"
                name="image_url"
                maxLength={500}
                placeholder="/backgrounds/oddjobs/Example.png"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
              />
            </label>

'''
    jobs_page = replace_once(
        jobs_page,
        create_job_anchor,
        create_job_media + create_job_anchor,
        "Create Odd Job image field",
    )

    update_job_anchor = '''                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 admin_jobs_page_div_container_7">'''
    update_job_media = '''                <label className="admin_jobs_page_label_job_image_edit">
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                    Background Image URL
                  </span>
                  <input
                    type="text"
                    name="image_url"
                    maxLength={500}
                    defaultValue={job.image_url ?? ""}
                    placeholder="/backgrounds/oddjobs/Example.png"
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
                  />
                </label>

'''
    jobs_page = replace_once(
        jobs_page,
        update_job_anchor,
        update_job_media + update_job_anchor,
        "Edit Odd Job image field",
    )
    FILES[1].write_text(jobs_page, encoding="utf-8")

    # ===============================================================
    # /admin/missions actions — persist background + icon
    # ===============================================================
    actions = FILES[4].read_text(encoding="utf-8")

    # Create mission
    actions = replace_once(
        actions,
        '''    const difficulty = text(formData, "difficulty") || "easy";

    const targetValue''',
        '''    const difficulty = text(formData, "difficulty") || "easy";
    const backgroundImageUrl =
      text(formData, "background_image_url") || null;
    const iconUrl =
      text(formData, "icon_url") || null;

    const targetValue''',
        "Create mission media vars",
    )
    actions = replace_once(
        actions,
        '''        difficulty,
        reward_remnants: rewardRemnants,''',
        '''        difficulty,
        background_image_url: backgroundImageUrl,
        icon_url: iconUrl,
        reward_remnants: rewardRemnants,''',
        "Create mission media insert",
    )

    # Update mission
    update_mission_marker = "export async function updateDailyMissionDefinition("
    a, b = actions.split(update_mission_marker, 1)
    b = replace_once(
        b,
        '''    const rewardItemId =
      text(formData, "reward_item_id") || null;
    const isActive =''',
        '''    const rewardItemId =
      text(formData, "reward_item_id") || null;
    const backgroundImageUrl =
      text(formData, "background_image_url") || null;
    const iconUrl =
      text(formData, "icon_url") || null;
    const isActive =''',
        "Update mission media vars",
    )
    b = replace_once(
        b,
        '''        difficulty: text(
          formData,
          "difficulty",
        ),
        reward_remnants:''',
        '''        difficulty: text(
          formData,
          "difficulty",
        ),
        background_image_url: backgroundImageUrl,
        icon_url: iconUrl,
        reward_remnants:''',
        "Update mission media update",
    )
    actions = a + update_mission_marker + b

    # Create milestone
    create_ms_marker = "export async function createDailyMilestoneDefinition("
    a, b = actions.split(create_ms_marker, 1)
    b = replace_once(
        b,
        '''    const description = text(
      formData,
      "description",
    );

    const targetCount''',
        '''    const description = text(
      formData,
      "description",
    );
    const backgroundImageUrl =
      text(formData, "background_image_url") || null;
    const iconUrl =
      text(formData, "icon_url") || null;

    const targetCount''',
        "Create milestone media vars",
    )
    b = replace_once(
        b,
        '''        description,
        target_count: targetCount,''',
        '''        description,
        background_image_url: backgroundImageUrl,
        icon_url: iconUrl,
        target_count: targetCount,''',
        "Create milestone media insert",
    )
    actions = a + create_ms_marker + b

    # Update milestone
    update_ms_marker = "export async function updateDailyMilestoneDefinition("
    a, b = actions.split(update_ms_marker, 1)
    b = replace_once(
        b,
        '''    const rewardItemId =
      text(formData, "reward_item_id") || null;

    const isAll =''',
        '''    const rewardItemId =
      text(formData, "reward_item_id") || null;
    const backgroundImageUrl =
      text(formData, "background_image_url") || null;
    const iconUrl =
      text(formData, "icon_url") || null;

    const isAll =''',
        "Update milestone media vars",
    )
    b = replace_once(
        b,
        '''        description: text(
          formData,
          "description",
        ),
        target_count:''',
        '''        description: text(
          formData,
          "description",
        ),
        background_image_url: backgroundImageUrl,
        icon_url: iconUrl,
        target_count:''',
        "Update milestone media update",
    )
    actions = a + update_ms_marker + b

    FILES[4].write_text(actions, encoding="utf-8")

    # ===============================================================
    # /admin/missions page — create/edit media fields
    # ===============================================================
    admin_page = FILES[3].read_text(encoding="utf-8")

    mission_create_anchor = '''          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.4fr_100px_120px] admin_missions_page_div_family">'''
    media_create = '''          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <label className={labelClass}>
              Background Image URL
              <input
                name="background_image_url"
                maxLength={500}
                placeholder="/backgrounds/missions/code_background.png"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Icon URL
              <input
                name="icon_url"
                maxLength={500}
                placeholder="/backgrounds/missions/code_icon.png"
                className={inputClass}
              />
            </label>
          </div>

'''
    admin_page = replace_once(
        admin_page,
        mission_create_anchor,
        media_create + mission_create_anchor,
        "Create mission media inputs",
    )

    milestone_create_anchor = '''          <div className="mt-3 grid gap-3 md:grid-cols-[130px_110px_1fr_100px_100px_auto] md:items-end admin_missions_page_div_missions_required">'''
    admin_page = replace_once(
        admin_page,
        milestone_create_anchor,
        media_create + milestone_create_anchor,
        "Create milestone media inputs",
    )

    mission_edit_anchor = '''            <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_110px_auto_auto_auto] md:items-end admin_missions_page_div_remnants_2">'''
    mission_edit_media = '''            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className={labelClass}>
                Background Image URL
                <input
                  name="background_image_url"
                  maxLength={500}
                  defaultValue={mission.background_image_url ?? ""}
                  placeholder="/backgrounds/missions/code_background.png"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Icon URL
                <input
                  name="icon_url"
                  maxLength={500}
                  defaultValue={mission.icon_url ?? ""}
                  placeholder="/backgrounds/missions/code_icon.png"
                  className={inputClass}
                />
              </label>
            </div>

'''
    admin_page = replace_once(
        admin_page,
        mission_edit_anchor,
        mission_edit_media + mission_edit_anchor,
        "Edit mission media inputs",
    )

    milestone_edit_anchor = '''                <div className="mt-3 grid gap-3 md:grid-cols-[130px_110px_1fr_100px_auto_auto] md:items-end admin_missions_page_div_missions_required_2">'''
    milestone_edit_media = '''                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <label className={labelClass}>
                    Background Image URL
                    <input
                      name="background_image_url"
                      maxLength={500}
                      defaultValue={milestone.background_image_url ?? ""}
                      placeholder="/backgrounds/missions/key_background.png"
                      className={inputClass}
                    />
                  </label>

                  <label className={labelClass}>
                    Icon URL
                    <input
                      name="icon_url"
                      maxLength={500}
                      defaultValue={milestone.icon_url ?? ""}
                      placeholder="/backgrounds/missions/key_icon.png"
                      className={inputClass}
                    />
                  </label>
                </div>

'''
    admin_page = replace_once(
        admin_page,
        milestone_edit_anchor,
        milestone_edit_media + milestone_edit_anchor,
        "Edit milestone media inputs",
    )

    FILES[3].write_text(admin_page, encoding="utf-8")

    # ===============================================================
    # /missions — load definition media and show on cards
    # ===============================================================
    missions_page = FILES[0].read_text(encoding="utf-8")

    # Use server-side admin client only for the two public media columns,
    # avoiding any dependency on RLS policy changes for definitions.
    missions_page = replace_once(
        missions_page,
        '''import { createClient } from "@/lib/supabase/server";''',
        '''import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";''',
        "Missions admin client import",
    )

    missions_page = replace_once(
        missions_page,
        '''  sort_order: number;
};''',
        '''  sort_order: number;
  background_image_url: string | null;
  icon_url: string | null;
};''',
        "MissionRow media fields",
    )

    missions_page = replace_once(
        missions_page,
        '''  claimed_at: string | null;
};''',
        '''  claimed_at: string | null;
  background_image_url: string | null;
  icon_url: string | null;
};''',
        "MilestoneRow media fields",
    )

    missions_page = replace_once(
        missions_page,
        '''export default async function MissionsPage() {
  const supabase = await createClient();''',
        '''export default async function MissionsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();''',
        "Missions admin client",
    )

    old_rows = '''  const missions = (missionResult.data ?? []) as MissionRow[];
  const milestones = (milestoneResult.data ?? []) as MilestoneRow[];

  const countableMissions = missions.filter('''

    new_rows = '''  const missionBase =
    (missionResult.data ?? []) as Omit<
      MissionRow,
      "background_image_url" | "icon_url"
    >[];

  const milestoneBase =
    (milestoneResult.data ?? []) as Omit<
      MilestoneRow,
      "background_image_url" | "icon_url"
    >[];

  const [missionMediaResult, milestoneMediaResult] =
    await Promise.all([
      missionBase.length > 0
        ? admin
            .from("daily_mission_definitions")
            .select("code, background_image_url, icon_url")
            .in(
              "code",
              missionBase.map(
                (mission) => mission.code_snapshot,
              ),
            )
        : Promise.resolve({ data: [], error: null }),
      milestoneBase.length > 0
        ? admin
            .from(
              "daily_mission_milestone_definitions",
            )
            .select(
              "milestone_key, background_image_url, icon_url",
            )
            .in(
              "milestone_key",
              milestoneBase.map(
                (milestone) => milestone.milestone_key,
              ),
            )
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (missionMediaResult.error) {
    throw new Error(
      `Unable to load Daily Mission media: ${missionMediaResult.error.message}`,
    );
  }

  if (milestoneMediaResult.error) {
    throw new Error(
      `Unable to load Daily Milestone media: ${milestoneMediaResult.error.message}`,
    );
  }

  const missionMediaByCode =
    new Map<
      string,
      {
        background_image_url: string | null;
        icon_url: string | null;
      }
    >(
      (missionMediaResult.data ?? []).map(
        (row) => [
          String(row.code),
          {
            background_image_url:
              row.background_image_url
                ? String(row.background_image_url)
                : null,
            icon_url: row.icon_url
              ? String(row.icon_url)
              : null,
          },
        ],
      ),
    );

  const milestoneMediaByKey =
    new Map<
      string,
      {
        background_image_url: string | null;
        icon_url: string | null;
      }
    >(
      (milestoneMediaResult.data ?? []).map(
        (row) => [
          String(row.milestone_key),
          {
            background_image_url:
              row.background_image_url
                ? String(row.background_image_url)
                : null,
            icon_url: row.icon_url
              ? String(row.icon_url)
              : null,
          },
        ],
      ),
    );

  const missions: MissionRow[] =
    missionBase.map((mission) => {
      const media =
        missionMediaByCode.get(
          mission.code_snapshot,
        );

      return {
        ...mission,
        background_image_url:
          media?.background_image_url ?? null,
        icon_url: media?.icon_url ?? null,
      };
    });

  const milestones: MilestoneRow[] =
    milestoneBase.map((milestone) => {
      const media =
        milestoneMediaByKey.get(
          milestone.milestone_key,
        );

      return {
        ...milestone,
        background_image_url:
          media?.background_image_url ?? null,
        icon_url: media?.icon_url ?? null,
      };
    });

  const countableMissions = missions.filter('''

    missions_page = replace_once(
        missions_page,
        old_rows,
        new_rows,
        "Mission media merge",
    )

    # Milestone cards: background + icon next to heading
    milestone_article_old = '''                className={[(([
                  "border p-4 transition-all duration-200",
                  complete &&
                  milestone.claimed_at === null
                    ? "border-[rgb(var(--sep-colour-b98c50))] bg-[rgb(var(--sep-colour-21170f))] shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]"
                    : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]",
                ].join(" "))), "missions_page_article_article"].filter(Boolean).join(" ")}
              >
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] missions_page_p_text">
                  Milestone
                </p>
                <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-cbb28a))] missions_page_h3_heading">
                  {milestone.name_snapshot}
                </h3>'''

    milestone_article_new = '''                className={[(([
                  "border bg-cover bg-center bg-no-repeat p-4 transition-all duration-200",
                  complete &&
                  milestone.claimed_at === null
                    ? "border-[rgb(var(--sep-colour-b98c50))] bg-[rgb(var(--sep-colour-21170f))] shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]"
                    : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]",
                ].join(" "))), "missions_page_article_article"].filter(Boolean).join(" ")}
                style={
                  milestone.background_image_url
                    ? {
                        backgroundImage: `linear-gradient(
                          rgb(var(--sep-colour-100d0b) / 82%),
                          rgb(var(--sep-colour-100d0b) / 88%)
                        ),
                        url("${milestone.background_image_url}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : undefined
                }
              >
                <div className="flex items-start gap-3">
                  {milestone.icon_url ? (
                    <img
                      src={milestone.icon_url}
                      alt=""
                      aria-hidden="true"
                      className="h-12 w-12 shrink-0 object-contain"
                    />
                  ) : null}

                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] missions_page_p_text">
                      Milestone
                    </p>
                    <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-cbb28a))] missions_page_h3_heading">
                      {milestone.name_snapshot}
                    </h3>
                  </div>
                </div>'''

    missions_page = replace_once(
        missions_page,
        milestone_article_old,
        milestone_article_new,
        "Milestone card media",
    )

    # Mission cards: background
    mission_class_old = '''                      className={[(([
                        "scroll-mt-6 border p-4 transition-all duration-200",'''
    mission_class_new = '''                      className={[(([
                        "scroll-mt-6 border bg-cover bg-center bg-no-repeat p-4 transition-all duration-200",'''
    missions_page = replace_once(
        missions_page,
        mission_class_old,
        mission_class_new,
        "Mission card background classes",
    )

    mission_open_old = '''                      ].join(" "))), "missions_page_article_article_2"].filter(Boolean).join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4 missions_page_div_container_8">
                        <div className="min-w-0 missions_page_div_container_9">'''

    mission_open_new = '''                      ].join(" "))), "missions_page_article_article_2"].filter(Boolean).join(" ")}
                      style={
                        mission.background_image_url
                          ? {
                              backgroundImage: `linear-gradient(
                                rgb(var(--sep-colour-100d0b) / 82%),
                                rgb(var(--sep-colour-100d0b) / 88%)
                              ),
                              url("${mission.background_image_url}")`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-4 missions_page_div_container_8">
                        <div className="flex min-w-0 items-start gap-3 missions_page_div_container_9">
                          {mission.icon_url ? (
                            <img
                              src={mission.icon_url}
                              alt=""
                              aria-hidden="true"
                              className="h-12 w-12 shrink-0 object-contain"
                            />
                          ) : null}

                          <div className="min-w-0">'''

    missions_page = replace_once(
        missions_page,
        mission_open_old,
        mission_open_new,
        "Mission card background style and icon",
    )

    mission_heading_close_old = '''                          <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-cbb28a))] missions_page_h3_heading_2">
                            {mission.name_snapshot}
                          </h3>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5 missions_page_div_container_10">'''

    mission_heading_close_new = '''                          <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-cbb28a))] missions_page_h3_heading_2">
                            {mission.name_snapshot}
                          </h3>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5 missions_page_div_container_10">'''

    missions_page = replace_once(
        missions_page,
        mission_heading_close_old,
        mission_heading_close_new,
        "Mission icon wrapper close",
    )

    FILES[0].write_text(missions_page, encoding="utf-8")

    # ===============================================================
    # Parse validation
    # ===============================================================
    validator = '''
const fs = require("fs");
const ts = require("typescript");

for (const file of process.argv.slice(1)) {
  const source = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );

  if (sf.parseDiagnostics.length) {
    console.error("Parse diagnostics for", file);
    console.error(sf.parseDiagnostics);
    process.exit(1);
  }
}
'''

    subprocess.run(
        ["node", "-e", validator, *[str(p) for p in FILES]],
        cwd=ROOT,
        check=True,
    )

except Exception as error:
    restore()
    fail(
        f"{error}\n"
        "All modified files were restored automatically."
    )

print("\nDAILY MISSION / MILESTONE MEDIA PATCH APPLIED")
print("")
print("Changed:")
for path in FILES:
    print(f"  {path.relative_to(ROOT)}")
print("")
print("Added:")
print("  - Daily Mission background + icon rendering")
print("  - Daily Milestone background + icon rendering")
print("  - /admin/jobs background URL create/edit")
print("  - /admin/missions mission background/icon create/edit")
print("  - /admin/missions milestone background/icon create/edit")
print("")
print("NEXT:")
print("  npm run build")
