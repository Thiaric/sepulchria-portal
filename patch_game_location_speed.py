from pathlib import Path
import subprocess
import sys
import shutil

EXPECTED_HEAD = "053dd40"

ROOT = Path.cwd()
GAME = ROOT / "app/(portal)/game/page.tsx"
ACTIONS = ROOT / "app/(portal)/game/actions.ts"


def fail(msg: str):
    print(f"\nERROR: {msg}")
    sys.exit(1)


def read(path: Path) -> str:
    if not path.exists():
        fail(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")


def write_backup(path: Path):
    backup = path.with_suffix(path.suffix + ".before-game-speed-patch.bak")
    if not backup.exists():
        shutil.copy2(path, backup)
        print(f"Backup: {backup}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exact block once, found {count}. No changes written.")
    return text.replace(old, new, 1)


try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception as exc:
    fail(f"Could not read Git HEAD: {exc}")

if not head.startswith(EXPECTED_HEAD):
    fail(
        f"This patch was prepared for commit {EXPECTED_HEAD}, "
        f"but current HEAD is {head}."
    )

game = read(GAME)
actions = read(ACTIONS)

# ACTIONS: skip redundant CURRENT-room access check only when entering a new room.
actions = replace_once(
    actions,
    '''async function getOwnedCharacter(): Promise<{
  supabase: SupabaseClient;
  character: OwnedCharacter;
}> {''',
    '''async function getOwnedCharacter(
  options?: {
    skipCurrentAccessCheck?: boolean;
  },
): Promise<{
  supabase: SupabaseClient;
  character: OwnedCharacter;
}> {''',
    "getOwnedCharacter signature",
)

actions = replace_once(
    actions,
    '''  if (
    ownedCharacter.current_room_id
  ) {''',
    '''  if (
    ownedCharacter.current_room_id &&
    options?.skipCurrentAccessCheck !== true
  ) {''',
    "getOwnedCharacter current access guard",
)

enter_start = actions.find("export async function enterRoomFromMap(")
if enter_start < 0:
    fail("Could not find enterRoomFromMap.")
enter_end = actions.find("\ntype WhisperRecipient", enter_start)
if enter_end < 0:
    fail("Could not find end of enterRoomFromMap section.")

enter_section = actions[enter_start:enter_end]
old_enter_owned = '''  const { supabase, character } =
    await getOwnedCharacter();'''
new_enter_owned = '''  const { supabase, character } =
    await getOwnedCharacter({
      skipCurrentAccessCheck: true,
    });'''

if enter_section.count(old_enter_owned) != 1:
    fail(
        "enterRoomFromMap: expected its getOwnedCharacter call once, "
        f"found {enter_section.count(old_enter_owned)}."
    )

enter_section = enter_section.replace(old_enter_owned, new_enter_owned, 1)
actions = actions[:enter_start] + enter_section + actions[enter_end:]

# GAME PAGE: start independent data loads together.
old_initial = '''  const attributeBreakdown =
    await getCharacterAttributeBreakdown(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      },
    );

  const {
    data: ownedGiftRows,
    error: ownedGiftError,
  } = await supabase
    .from("character_gifts")
    .select(`
      id,
      gift:gifts(
        id,
        name,
        description,
        is_active,
        effect_mode,
        target_mode,
        damage_dice,
        damage_type,
        success_die,
        success_threshold,
        success_attribute,
        duration_minutes,
        cooldown_minutes,
        health_delta,
        max_health_modifier,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        shrewd_modifier,
        brains_modifier,
        presence_modifier,
        warping_affinity_modifier,
        warps_per_day_modifier
      ),
      activations:gift_activations(
        activated_at,
        expires_at,
        ended_at,
        health_reverted_at
      )
    `)
    .eq(
      "character_id",
      character.id,
    );'''

new_initial = '''  const activeSince = new Date(
    Date.now() -
      PRESENCE_ACTIVE_MINUTES *
        60_000,
  ).toISOString();

  const attributeBreakdownPromise =
    getCharacterAttributeBreakdown(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      },
    );

  const ownedGiftRowsPromise =
    supabase
      .from("character_gifts")
      .select(`
        id,
        gift:gifts(
          id,
          name,
          description,
          is_active,
          effect_mode,
          target_mode,
          damage_dice,
          damage_type,
          success_die,
          success_threshold,
          success_attribute,
          duration_minutes,
          cooldown_minutes,
          health_delta,
          max_health_modifier,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier,
          warping_affinity_modifier,
          warps_per_day_modifier
        ),
        activations:gift_activations(
          activated_at,
          expires_at,
          ended_at,
          health_reverted_at
        )
      `)
      .eq(
        "character_id",
        character.id,
      );

  const rawInventoryRowsPromise =
    supabase.rpc(
      "get_public_character_inventory",
      {
        p_character_id:
          character.id,
      },
    );

  const latestMessagePromise =
    supabase
      .from("room_messages")
      .select("created_at")
      .eq("room_id", room.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  const presentResultPromise =
    supabase
      .from("character_presence")
      .select(`
        character_id,
        character:characters!character_presence_character_id_fkey(
          id,
          display_name
        )
      `)
      .eq("room_id", room.id)
      .gte(
        "last_seen_at",
        activeSince,
      );

  const staffSessionPromise =
    getStaffSession();

  const headquartersManageDataPromise =
    getOrderHeadquartersManageData(
      room.id,
      character.id,
    );

  const oddJobsPromise =
    room.slug === "odd-jobs-bureau"
      ? supabase.rpc(
          "get_my_odd_jobs_state",
        )
      : Promise.resolve({
          data: [],
          error: null,
        });

  const [
    attributeBreakdown,
    ownedGiftResult,
    rawInventoryResult,
    latestMessageResult,
    presentResult,
    staffSession,
    headquartersManageData,
    oddJobsResult,
  ] = await Promise.all([
    attributeBreakdownPromise,
    ownedGiftRowsPromise,
    rawInventoryRowsPromise,
    latestMessagePromise,
    presentResultPromise,
    staffSessionPromise,
    headquartersManageDataPromise,
    oddJobsPromise,
  ]);

  const {
    data: ownedGiftRows,
    error: ownedGiftError,
  } = ownedGiftResult;

  const {
    data: rawInventoryRows,
    error: chatInventoryError,
  } = rawInventoryResult;

  const {
    data: latestMessage,
    error: latestMessageError,
  } = latestMessageResult;'''

game = replace_once(game, old_initial, new_initial, "initial game data block")

old_inventory_fetch = '''  const {
    data: rawInventoryRows,
    error: chatInventoryError,
  } = await supabase.rpc(
    "get_public_character_inventory",
    { p_character_id: character.id },
  );

'''
game = replace_once(game, old_inventory_fetch, "", "duplicate inventory fetch")

old_latest_fetch = '''  const {
    data: latestMessage,
    error: latestMessageError,
  } = await supabase
    .from("room_messages")
    .select("created_at")
    .eq("room_id", room.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

'''
game = replace_once(game, old_latest_fetch, "", "duplicate latest-message fetch")

old_presence_block = '''  const activeSince = new Date(
    Date.now() -
      PRESENCE_ACTIVE_MINUTES *
        60_000,
  ).toISOString();

  const [
    presentResult,
    staffSession,
  ] = await Promise.all([
    supabase
      .from(
        "character_presence",
      )
      .select(`
        character_id,
        character:characters!character_presence_character_id_fkey(
          id,
          display_name
        )
      `)
      .eq("room_id", room.id)
      .gte(
        "last_seen_at",
        activeSince,
      ),

    getStaffSession(),
  ]);

'''
game = replace_once(game, old_presence_block, "", "duplicate presence/staff fetch")

old_hq_odd = '''  const headquartersManageData =
    await getOrderHeadquartersManageData(
      room.id,
      character.id,
    );

  let oddJobs: OddJobStateRow[] = [];

  if (room.slug === "odd-jobs-bureau") {
    const { data: oddJobsData, error: oddJobsError } =
      await supabase.rpc("get_my_odd_jobs_state");

    if (oddJobsError) {
      throw new Error(`Unable to load Odd Jobs Bureau: ${oddJobsError.message}`);
    }

    oddJobs = (oddJobsData ?? []) as OddJobStateRow[];
  }
'''

new_hq_odd = '''  const {
    data: oddJobsData,
    error: oddJobsError,
  } = oddJobsResult;

  if (oddJobsError) {
    throw new Error(
      `Unable to load Odd Jobs Bureau: ${oddJobsError.message}`,
    );
  }

  const oddJobs =
    (oddJobsData ?? []) as OddJobStateRow[];
'''

game = replace_once(game, old_hq_odd, new_hq_odd, "HQ/Odd Jobs late fetch block")

if game.count("const activeSince = new Date(") != 1:
    fail("Sanity check failed: activeSince count is not 1.")
if game.count("data: latestMessage,") != 1:
    fail("Sanity check failed: latestMessage count is not 1.")
if game.count("data: rawInventoryRows,") != 1:
    fail("Sanity check failed: rawInventoryRows count is not 1.")

write_backup(GAME)
write_backup(ACTIONS)

GAME.write_text(game, encoding="utf-8")
ACTIONS.write_text(actions, encoding="utf-8")

print("\nPATCH APPLIED SUCCESSFULLY")
print("Preserved:")
print("  - full room history window and batching")
print("  - Feats")
print("  - inventory/items/cooldowns")
print("  - presence")
print("  - staff/Fate permissions")
print("  - private-location/HQ destination access checks")
print("  - HQ management")
print("  - Odd Jobs")
print("\nOptimized:")
print("  - independent /game queries now start together")
print("  - current-room access is not redundantly checked before entering another room")
print("\nNext: npm run build")
