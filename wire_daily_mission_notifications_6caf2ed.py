from __future__ import annotations

from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "6caf2ed5bd7c2f84f4e8973acda5810aae23fc95"
ROOT = Path.cwd()

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        fail(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, text: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print(f"Updated {path}")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception as exc:
    fail(f"Could not read git HEAD: {exc}")

if head != EXPECTED_HEAD:
    fail(
        "Repository HEAD does not match the version this patch was built for.\n"
        f"Expected: {EXPECTED_HEAD}\n"
        f"Actual:   {head}\n"
        "Stop here and ask ChatGPT to rebuild the patch against your current HEAD."
    )

mission_notifications = '''import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type MissionRow = {
  id: string;
  code_snapshot: string;
  name_snapshot: string;
  counts_toward_milestones: boolean;
  completed_at: string | null;
  claimed_at: string | null;
};

type MilestoneRow = {
  id: string;
  name_snapshot: string;
  target_count_snapshot: number | null;
  is_all_snapshot: boolean;
  claimed_at: string | null;
};

type DesiredNotification = {
  sourceType: "daily_mission" | "daily_milestone";
  sourceId: string;
  title: string;
  body: string;
  href: string;
};

function nextUtcMidnightIso() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  ).toISOString();
}

export async function syncMyDailyMissionNotifications() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { created: 0 };
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!character || character.status !== "approved") {
    return { created: 0 };
  }

  const { data: dayId, error: dayError } =
    await supabase.rpc(
      "ensure_my_daily_mission_day",
    );

  if (dayError || !dayId) {
    throw new Error(
      `Unable to ensure Daily Mission day: ${
        dayError?.message ?? "Unknown error"
      }`,
    );
  }

  const { error: refreshError } =
    await supabase.rpc(
      "refresh_my_daily_mission_progress",
    );

  if (refreshError) {
    throw new Error(
      `Unable to refresh Daily Mission progress: ${refreshError.message}`,
    );
  }

  const [missionResult, milestoneResult] =
    await Promise.all([
      supabase
        .from("daily_mission_assignments")
        .select(
          "id, code_snapshot, name_snapshot, counts_toward_milestones, completed_at, claimed_at",
        )
        .eq("day_id", dayId),
      supabase
        .from("daily_mission_milestone_claims")
        .select(
          "id, name_snapshot, target_count_snapshot, is_all_snapshot, claimed_at",
        )
        .eq("day_id", dayId),
    ]);

  if (missionResult.error) {
    throw new Error(
      `Unable to load Daily Missions: ${missionResult.error.message}`,
    );
  }

  if (milestoneResult.error) {
    throw new Error(
      `Unable to load Daily Mission milestones: ${milestoneResult.error.message}`,
    );
  }

  const missions =
    (missionResult.data ?? []) as MissionRow[];

  const milestones =
    (milestoneResult.data ?? []) as MilestoneRow[];

  const countable = missions.filter(
    (mission) =>
      mission.counts_toward_milestones,
  );

  const completedCount = countable.filter(
    (mission) =>
      mission.completed_at !== null,
  ).length;

  const countableTotal = countable.length;

  const desired: DesiredNotification[] = [];

  for (const mission of missions) {
    if (
      mission.completed_at &&
      !mission.claimed_at
    ) {
      desired.push({
        sourceType: "daily_mission",
        sourceId: mission.id,
        title: `Mission complete: ${mission.name_snapshot}`,
        body:
          "Your Daily Mission is complete. Claim your reward before the daily reset.",
        href:
          `/missions#mission-${mission.code_snapshot}`,
      });
    }
  }

  for (const milestone of milestones) {
    const required =
      milestone.is_all_snapshot
        ? countableTotal
        : Number(
            milestone.target_count_snapshot ??
              0,
          );

    const complete =
      required > 0 &&
      completedCount >= required;

    if (
      complete &&
      !milestone.claimed_at
    ) {
      desired.push({
        sourceType: "daily_milestone",
        sourceId: milestone.id,
        title: `Milestone complete: ${milestone.name_snapshot}`,
        body:
          "Your Daily Mission milestone is complete. Claim your reward before the daily reset.",
        href:
          "/missions#daily-milestones",
      });
    }
  }

  if (desired.length === 0) {
    return { created: 0 };
  }

  const admin = createAdminClient();
  const sourceIds = desired.map(
    (entry) => entry.sourceId,
  );

  const [
    existingResult,
    suppressionResult,
  ] = await Promise.all([
    admin
      .from("notifications")
      .select(
        "id, source_type, source_id",
      )
      .eq("source_trigger", "completed")
      .in("source_type", [
        "daily_mission",
        "daily_milestone",
      ])
      .in("source_id", sourceIds),
    admin
      .from("notification_suppressions")
      .select(
        "source_type, source_id",
      )
      .eq("source_trigger", "completed")
      .in("source_type", [
        "daily_mission",
        "daily_milestone",
      ])
      .in("source_id", sourceIds),
  ]);

  if (existingResult.error) {
    throw new Error(
      `Unable to check Daily Mission notifications: ${existingResult.error.message}`,
    );
  }

  if (suppressionResult.error) {
    throw new Error(
      `Unable to check Daily Mission notification suppression: ${suppressionResult.error.message}`,
    );
  }

  const key = (
    sourceType: string,
    sourceId: string,
  ) => `${sourceType}:${sourceId}`;

  const existingKeys = new Set(
    (existingResult.data ?? []).map(
      (row) =>
        key(
          String(row.source_type),
          String(row.source_id),
        ),
    ),
  );

  const suppressedKeys = new Set(
    (suppressionResult.data ?? []).map(
      (row) =>
        key(
          String(row.source_type),
          String(row.source_id),
        ),
    ),
  );

  const missing = desired.filter(
    (entry) => {
      const entryKey = key(
        entry.sourceType,
        entry.sourceId,
      );

      return (
        !existingKeys.has(entryKey) &&
        !suppressedKeys.has(entryKey)
      );
    },
  );

  if (missing.length === 0) {
    return { created: 0 };
  }

  const now = new Date().toISOString();
  const expiresAt = nextUtcMidnightIso();

  const {
    data: inserted,
    error: insertError,
  } = await admin
    .from("notifications")
    .insert(
      missing.map((entry) => ({
        type: "reward",
        title: entry.title,
        body: entry.body,
        href: entry.href,
        starts_at: now,
        expires_at: expiresAt,
        expires_game_at: null,
        created_by: user.id,
        is_automatic: true,
        source_type: entry.sourceType,
        source_id: entry.sourceId,
        source_trigger: "completed",
        staff_overridden: false,
        is_active: true,
      })),
    )
    .select(
      "id, source_type, source_id",
    );

  if (insertError || !inserted) {
    throw new Error(
      `Unable to create Daily Mission notifications: ${
        insertError?.message ??
        "Unknown error"
      }`,
    );
  }

  const { error: targetError } =
    await admin
      .from("notification_targets")
      .insert(
        inserted.map((notification) => ({
          notification_id:
            notification.id,
          target_type: "user",
          target_id: user.id,
        })),
      );

  if (targetError) {
    await admin
      .from("notifications")
      .delete()
      .in(
        "id",
        inserted.map((row) => row.id),
      );

    throw new Error(
      `Unable to create Daily Mission notification audience: ${targetError.message}`,
    );
  }

  return {
    created: inserted.length,
  };
}

export async function removeDailyMissionNotification(
  sourceType:
    | "daily_mission"
    | "daily_milestone",
  sourceId: string,
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .eq("source_trigger", "completed");

  if (error) {
    throw new Error(
      `Unable to remove Daily Mission notification: ${error.message}`,
    );
  }
}
'''

write(
    "lib/missions/notifications.ts",
    mission_notifications,
)

route = '''import { NextResponse } from "next/server";

import {
  syncMyDailyMissionNotifications,
} from "@/lib/missions/notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result =
      await syncMyDailyMissionNotifications();

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Daily Mission notification sync:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to synchronize Daily Mission notifications.",
      },
      { status: 500 },
    );
  }
}
'''

write(
    "app/api/missions/notifications/sync/route.ts",
    route,
)

actions_path = "app/(portal)/missions/actions.ts"
actions = read(actions_path)

old_import = 'import { createClient } from "@/lib/supabase/server";\n'
new_import = '''import { createClient } from "@/lib/supabase/server";
import {
  removeDailyMissionNotification,
} from "@/lib/missions/notifications";
'''

if old_import not in actions:
    fail(f"Could not find actions import anchor in {actions_path}")

actions = actions.replace(
    old_import,
    new_import,
    1,
)

old_mission = '''  revalidatePath("/missions");
  revalidatePath("/character");

  return {
    success: true,
    message: "Reward received.",
  };
}

export async function claimDailyMilestone(
'''

new_mission = '''  try {
    await removeDailyMissionNotification(
      "daily_mission",
      assignmentId,
    );
  } catch (notificationError) {
    console.error(
      "Unable to remove claimed Daily Mission notification:",
      notificationError,
    );
  }

  revalidatePath("/missions");
  revalidatePath("/character");

  return {
    success: true,
    message: "Reward received.",
  };
}

export async function claimDailyMilestone(
'''

if old_mission not in actions:
    fail(f"Could not find mission claim anchor in {actions_path}")

actions = actions.replace(
    old_mission,
    new_mission,
    1,
)

old_milestone = '''  revalidatePath("/missions");
  revalidatePath("/character");

  return {
    success: true,
    message: "Reward received.",
  };
}
'''

new_milestone = '''  try {
    await removeDailyMissionNotification(
      "daily_milestone",
      claimId,
    );
  } catch (notificationError) {
    console.error(
      "Unable to remove claimed Daily Mission milestone notification:",
      notificationError,
    );
  }

  revalidatePath("/missions");
  revalidatePath("/character");

  return {
    success: true,
    message: "Reward received.",
  };
}
'''

if old_milestone not in actions:
    fail(f"Could not find milestone claim anchor in {actions_path}")

actions = actions.replace(
    old_milestone,
    new_milestone,
    1,
)

write(actions_path, actions)

bell_path = "components/notifications/notification-bell.tsx"
bell = read(bell_path)

old_bell_load = '''  const load = useCallback(
    async () => {
      const { data, error } =
        await supabase.rpc(
          "get_my_notification_bundle",
        );
'''

new_bell_load = '''  const load = useCallback(
    async () => {
      await fetch(
        "/api/missions/notifications/sync",
        {
          method: "POST",
          cache: "no-store",
        },
      ).catch(() => null);

      const { data, error } =
        await supabase.rpc(
          "get_my_notification_bundle",
        );
'''

if old_bell_load not in bell:
    fail(f"Could not find bell load anchor in {bell_path}")

bell = bell.replace(
    old_bell_load,
    new_bell_load,
    1,
)

old_listener = '''    window.addEventListener(
      "sepulchria:admin-data-changed",
      handleAdminDataChanged,
    );

    const timer =
'''

new_listener = '''    window.addEventListener(
      "sepulchria:admin-data-changed",
      handleAdminDataChanged,
    );
    window.addEventListener(
      "sepulchria:notifications-changed",
      handleAdminDataChanged,
    );

    const timer =
'''

if old_listener not in bell:
    fail(f"Could not find bell listener anchor in {bell_path}")

bell = bell.replace(
    old_listener,
    new_listener,
    1,
)

old_cleanup = '''      window.removeEventListener(
        "sepulchria:admin-data-changed",
        handleAdminDataChanged,
      );
    };
'''

new_cleanup = '''      window.removeEventListener(
        "sepulchria:admin-data-changed",
        handleAdminDataChanged,
      );
      window.removeEventListener(
        "sepulchria:notifications-changed",
        handleAdminDataChanged,
      );
    };
'''

if old_cleanup not in bell:
    fail(f"Could not find bell cleanup anchor in {bell_path}")

bell = bell.replace(
    old_cleanup,
    new_cleanup,
    1,
)

write(bell_path, bell)

claim_path = "components/missions/daily-reward-claim.tsx"
claim = read(claim_path)

old_effect = '''useEffect(() => {
  if (!state.message) return;

  setShowMessage(true);

  const timer = window.setTimeout(() => {
    setShowMessage(false);
  }, 5000);

  return () => {
    window.clearTimeout(timer);
  };
}, [state]);  
'''

new_effect = '''useEffect(() => {
  if (!state.message) return;

  setShowMessage(true);

  if (state.success) {
    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:notifications-changed",
      ),
    );
  }

  const timer = window.setTimeout(() => {
    setShowMessage(false);
  }, 5000);

  return () => {
    window.clearTimeout(timer);
  };
}, [state]);
'''

if old_effect not in claim:
    fail(f"Could not find reward claim effect anchor in {claim_path}")

claim = claim.replace(
    old_effect,
    new_effect,
    1,
)

write(claim_path, claim)

print("\nPatch applied successfully.")
print("Files changed:")
print("  + lib/missions/notifications.ts")
print("  + app/api/missions/notifications/sync/route.ts")
print("  * app/(portal)/missions/actions.ts")
print("  * components/notifications/notification-bell.tsx")
print("  * components/missions/daily-reward-claim.tsx")
print("\nNext run:")
print("  npm run build")
