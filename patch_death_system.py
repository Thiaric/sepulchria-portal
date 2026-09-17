from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime

ROOT = Path.cwd()
EXPECTED = "87f1c990ae586b33c8601fbd530d2d51dc4496bc"

try:
    current_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
except Exception as exc:
    print("ERROR: Unable to read the current Git commit. Run this from the repository root.")
    print(exc)
    sys.exit(1)

if current_commit != EXPECTED:
    print("ERROR: This patch targets a specific Sepulchria commit.")
    print("Expected:", EXPECTED)
    print("Current: ", current_commit)
    print("No files were changed.")
    sys.exit(1)

required = [
    "app/(portal)/game/death-actions.ts",
    "app/(portal)/game/actions.ts",
    "app/(portal)/game/opposed-actions.ts",
    "app/(portal)/game/warping-actions.ts",
    "app/(portal)/game/components/CharacterDeathGate.tsx",
    "lib/gifts/gift-health-effects.ts",
    "lib/items/use-actions.ts",
    "lib/auth/admin-section-access.ts",
    "app/(portal)/admin/layout.tsx",
    "app/(portal)/admin/shapes/actions.ts",
    "app/(portal)/admin/shapes/page.tsx",
    "app/(portal)/messages/send-typed-message-action.ts",
    "app/(portal)/messages/actions.ts",
    "app/(portal)/messages/components/MessageComposer.tsx",
    "app/(portal)/messages/[id]/page.tsx",
    "app/(portal)/messages/components/group-conversation-view.tsx",
    "lib/forum/order-forum-access.ts",
    "app/(portal)/forum/actions.ts",
    "app/(portal)/forum/[sectionSlug]/[topicSlug]/page.tsx",
]

missing = [p for p in required if not (ROOT / p).exists()]
if missing:
    print("ERROR: Run this file from the sepulchria-portal repository root.")
    print("Missing:")
    for p in missing:
        print(" -", p)
    sys.exit(1)

files = {p: (ROOT / p).read_text(encoding="utf-8") for p in required}
originals = dict(files)

def fail(msg):
    print("ERROR:", msg)
    print("No files were changed.")
    sys.exit(1)

def replace_once(path, old, new, label):
    # Exact literal replacement against the known source.
    # Multiple identical occurrences are intentionally transformed together.
    # If a previous in-memory transformation already produced the exact
    # desired fragment, this call is treated as already satisfied.
    text = files[path]
    count = text.count(old)

    if count > 0:
        files[path] = text.replace(old, new)
        return

    if new in text:
        return

    fail(
        f"{label}: neither the expected source fragment nor the already-patched fragment was found in {path}."
    )

def regex_once(path, pattern, replacement, label, flags=re.S):
    text = files[path]
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        fail(f"{label}: expected exactly 1 regex match in {path}, found {count}.")
    files[path] = updated

# ---------------------------------------------------------------------------
# 1) Admin permission + nav
# ---------------------------------------------------------------------------
replace_once(
    "lib/auth/admin-section-access.ts",
    '  | "characters"\n  | "events"',
    '  | "characters"\n  | "death"\n  | "events"',
    "add death admin section type",
)
replace_once(
    "lib/auth/admin-section-access.ts",
    '  characters: ["owner", "admin", "moderator", "master"],\n  events:',
    '  characters: ["owner", "admin", "moderator", "master"],\n  death: ["owner", "admin", "master"],\n  events:',
    "add death admin section roles",
)
replace_once(
    "app/(portal)/admin/layout.tsx",
    '''            {can("codex") ? (
              <AdminNavigationLink href="/admin/codex">
                Codex
              </AdminNavigationLink>
            ) : null}
''',
    '''            {can("death") ? (
              <AdminNavigationLink href="/admin/death">
                Death
              </AdminNavigationLink>
            ) : null}

            {can("codex") ? (
              <AdminNavigationLink href="/admin/codex">
                Codex
              </AdminNavigationLink>
            ) : null}
''',
    "add Death navigation",
)

# ---------------------------------------------------------------------------
# 2) Shapes: explicit Level IX Resurrection flag
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# 3) Central death system import + death-actions refactor
# ---------------------------------------------------------------------------
replace_once(
    "app/(portal)/game/death-actions.ts",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  finaliseCharacterDeath,
  getDeathRules,
  reconcileExpiredCharacterDeath,
} from "@/lib/death/death-system";
''',
    "death actions imports",
)

replace_once(
    "app/(portal)/game/death-actions.ts",
    '  dead_until: string | null;\n  muscles:',
    '  dead_until: string | null;\n  died_at: string | null;\n  muscles:',
    "death actions CharacterRow died_at",
)
path = "app/(portal)/game/death-actions.ts"
old = '.select("id,display_name,current_room_id,current_health,life_state,zero_hp_at,dead_until,muscles,reflexes,vigor,brains,shrewd,presence_score")'
new = '.select("id,display_name,current_room_id,current_health,life_state,zero_hp_at,dead_until,died_at,muscles,reflexes,vigor,brains,shrewd,presence_score")'
count = files[path].count(old)
if count < 1:
    fail(
        f"death actions character selects: source fragment was not found in {path}."
    )
files[path] = files[path].replace(old, new)

regex_once(
    "app/(portal)/game/death-actions.ts",
    r'''async function reconcileExpiredDeath\(character: CharacterRow\): Promise<CharacterRow> \{.*?\n\}\n\nasync function currentPendingEvent''',
    '''async function reconcileExpiredDeath(character: CharacterRow): Promise<CharacterRow> {
  if (character.life_state !== "dead" || !character.dead_until) return character;

  const expiry = Date.parse(character.dead_until);
  if (Number.isNaN(expiry) || expiry > Date.now()) return character;

  await reconcileExpiredCharacterDeath(character.id);

  const admin = adminClient();
  const refreshed = await admin
    .from("characters")
    .select("id,display_name,current_room_id,current_health,life_state,zero_hp_at,dead_until,died_at,muscles,reflexes,vigor,brains,shrewd,presence_score")
    .eq("id", character.id)
    .single();

  if (refreshed.error || !refreshed.data) {
    throw new Error(refreshed.error?.message ?? "Unable to reload Character after resurrection.");
  }

  return refreshed.data as CharacterRow;
}

async function currentPendingEvent''',
    "centralize expired death reconciliation",
)

regex_once(
    "app/(portal)/game/death-actions.ts",
    r'''async function deathDurationHours\(\): Promise<number> \{.*?\n\}\n\nasync function finaliseDeath\(character: CharacterRow, eventId: string\) \{.*?\n\}\n\nexport async function acceptCharacterDeath''',
    '''async function finaliseDeath(character: CharacterRow, eventId: string) {
  const result = await finaliseCharacterDeath({
    characterId: character.id,
    deathEventId: eventId,
  });

  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/characters");

  return result.deadUntil;
}

export async function acceptCharacterDeath''',
    "centralize final death",
)

# Add optional richer state without breaking current gate callers.
replace_once(
    "app/(portal)/game/death-actions.ts",
    '''  deadUntil: string | null;
  eventId: string | null;''',
    '''  deadUntil: string | null;
  diedAt?: string | null;
  essenceEndsAt?: string | null;
  eventId: string | null;''',
    "extend death state type",
)
replace_once(
    "app/(portal)/game/death-actions.ts",
    '''  return {
    lifeState: character.life_state,
    currentHealth: character.current_health,
    zeroHpAt: character.zero_hp_at,
    deadUntil: character.dead_until,
    eventId: event?.id ?? null,''',
    '''  const rules = await getDeathRules();
  const essenceEndsAt =
    character.life_state === "dead" && character.died_at
      ? new Date(
          Date.parse(character.died_at) +
            rules.essenceWindowMinutes * 60_000,
        ).toISOString()
      : null;

  return {
    lifeState: character.life_state,
    currentHealth: character.current_health,
    zeroHpAt: character.zero_hp_at,
    deadUntil: character.dead_until,
    diedAt: character.died_at,
    essenceEndsAt,
    eventId: event?.id ?? null,''',
    "death state essence window",
)

# ---------------------------------------------------------------------------
# 4) Health helper: healing a recently dead target resurrects centrally
# ---------------------------------------------------------------------------
replace_once(
    "lib/gifts/gift-health-effects.ts",
    'import {\n  getCharacterAttributeBreakdown,\n} from "@/lib/characters/get-effective-character-attributes";\n',
    '''import {
  getCharacterAttributeBreakdown,
} from "@/lib/characters/get-effective-character-attributes";
import {
  reviveDeadCharacter,
} from "@/lib/death/death-system";
''',
    "gift health death import",
)
replace_once(
    "lib/gifts/gift-health-effects.ts",
    '''  const {
    data: character,
    error,
  } = await admin
    .from("characters")
    .select(
      "muscles, reflexes, vigor, brains, shrewd, presence_score, current_health",
    )''',
    '''  const {
    data: character,
    error,
  } = await admin
    .from("characters")
    .select(
      "muscles, reflexes, vigor, brains, shrewd, presence_score, current_health, life_state, died_at",
    )''',
    "gift health load life state",
)
replace_once(
    "lib/gifts/gift-health-effects.ts",
    '''  if (error || !character) {
    throw new Error(
      error?.message ??
        "Unable to load character Health.",
    );
  }

  const breakdown =''',
    '''  if (error || !character) {
    throw new Error(
      error?.message ??
        "Unable to load character Health.",
    );
  }

  if (character.life_state === "dead") {
    if (healthDelta <= 0) {
      throw new Error("Dead Characters cannot receive damaging or non-healing Health effects.");
    }

    await reviveDeadCharacter({
      characterId,
      source: "healing_effect",
      forceBeyondEssence: false,
      healthAfterRevival: healthDelta,
    });

    return;
  }

  const breakdown =''',
    "gift health recent-dead revival",
)

# ---------------------------------------------------------------------------
# 5) Main game actions: allow ghost chat/location access but no mechanics
# ---------------------------------------------------------------------------
replace_once(
    "app/(portal)/game/actions.ts",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  assertDeadTargetAllowed,
  assertGhostChatAllowed,
  assertGhostMovementAllowed,
  reconcileExpiredCharacterDeath,
} from "@/lib/death/death-system";
''',
    "game death imports",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '  dead_until: string | null;\n};',
    '  dead_until: string | null;\n  died_at: string | null;\n};',
    "game OwnedCharacter died_at",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '''type ResolvedGiftTarget = {
  id: string;
  displayName: string;
  isSelf: boolean;
};''',
    '''type ResolvedGiftTarget = {
  id: string;
  displayName: string;
  isSelf: boolean;
  lifeState: "alive" | "death_save_pending" | "dead";
  diedAt: string | null;
};''',
    "feat target death state type",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '''      id: character.id,
      displayName: character.display_name,
      isSelf: true,
    };''',
    '''      id: character.id,
      displayName: character.display_name,
      isSelf: true,
      lifeState: character.life_state,
      diedAt: character.died_at,
    };''',
    "feat self target death state 1",
)
# second identical self block
replace_once(
    "app/(portal)/game/actions.ts",
    '''      id: character.id,
      displayName: character.display_name,
      isSelf: true,
    };''',
    '''      id: character.id,
      displayName: character.display_name,
      isSelf: true,
      lifeState: character.life_state,
      diedAt: character.died_at,
    };''',
    "feat self target death state 2",
)

replace_once(
    "app/(portal)/game/actions.ts",
    '.select("id, display_name, current_room_id, status, is_system")',
    '.select("id, display_name, current_room_id, status, is_system, life_state, died_at")',
    "feat target query death columns",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '''    id: target.id,
    displayName: target.display_name,
    isSelf: false,
  };''',
    '''    id: target.id,
    displayName: target.display_name,
    isSelf: false,
    lifeState: target.life_state,
    diedAt: target.died_at,
  };''',
    "feat target result death state",
)

replace_once(
    "app/(portal)/game/actions.ts",
    '''  options?: {
    skipCurrentAccessCheck?: boolean;
  },''',
    '''  options?: {
    skipCurrentAccessCheck?: boolean;
    allowDeadGhost?: boolean;
  },''',
    "game character options",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '''      life_state,
      dead_until
    `)''',
    '''      life_state,
      dead_until,
      died_at
    `)''',
    "game character select died_at",
)

regex_once(
    "app/(portal)/game/actions.ts",
    r'''  if \(ownedCharacter\.life_state === "dead"\) \{.*?\n  \}\n\n  if \(ownedCharacter\.life_state === "death_save_pending"\)''',
    '''  if (ownedCharacter.life_state === "dead") {
    const reconciled =
      await reconcileExpiredCharacterDeath(
        ownedCharacter.id,
      );

    if (reconciled.revived) {
      ownedCharacter.life_state = "alive";
      ownedCharacter.current_health =
        reconciled.currentHealth;
      ownedCharacter.dead_until = null;
      ownedCharacter.died_at = null;
    } else if (!options?.allowDeadGhost) {
      throw new Error(
        ownedCharacter.dead_until
          ? `This Character is dead until ${new Date(ownedCharacter.dead_until).toLocaleString("en-GB")}.`
          : "This Character is dead.",
      );
    }
  }

  if (ownedCharacter.life_state === "death_save_pending")''',
    "replace game dead block",
)

# Movement can be used by ghosts, but only into allowed ghost locations.
replace_once(
    "app/(portal)/game/actions.ts",
    '  const { supabase, character } = await getOwnedCharacter();\n\n  if (!character.current_room_id) {',
    '  const { supabase, character } = await getOwnedCharacter({ allowDeadGhost: true });\n\n  if (!character.current_room_id) {',
    "ghost move get character",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '''  const destinationAccess =
    await getPrivateLocationAccess(
      roomId,
      character.id,
    );''',
    '''  if (character.life_state === "dead") {
    await assertGhostMovementAllowed(
      character.id,
      roomId,
    );
  }

  const destinationAccess =
    await getPrivateLocationAccess(
      roomId,
      character.id,
    );''',
    "ghost move destination rule",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '''    await getOwnedCharacter({
      skipCurrentAccessCheck: true,
    });''',
    '''    await getOwnedCharacter({
      skipCurrentAccessCheck: true,
      allowDeadGhost: true,
    });''',
    "ghost enter location get character",
)
replace_once(
    "app/(portal)/game/actions.ts",
    '''  if (!destinationRoom) {
    throw new Error(
      "This location is not available.",
    );
  }

  if (
    destinationAccess.isPrivate &&''',
    '''  if (!destinationRoom) {
    throw new Error(
      "This location is not available.",
    );
  }

  if (character.life_state === "dead") {
    await assertGhostMovementAllowed(
      character.id,
      cleanRoomId,
    );
  }

  if (
    destinationAccess.isPrivate &&''',
    "ghost enter destination rule",
)

# Send room chat as a ghost only where allowed.
replace_once(
    "app/(portal)/game/actions.ts",
    '''    } = await getOwnedCharacter();

    const chatEnforcement =''',
    '''    } = await getOwnedCharacter({
      allowDeadGhost: true,
    });

    if (
      character.life_state === "dead" &&
      character.current_room_id
    ) {
      await assertGhostChatAllowed(
        character.id,
        character.current_room_id,
      );
    }

    const chatEnforcement =''',
    "ghost room chat",
)

# Presence helpers must continue to work for ghosts.
for func_name in [
    "updatePresence",
    "setAutomaticAway",
    "restoreManualPresence",
    "heartbeatPresence",
    "leaveCurrentRoom",
]:
    pattern = rf'''(export async function {func_name}\b[\s\S]*?)(await getOwnedCharacter\(\))'''
    text = files["app/(portal)/game/actions.ts"]
    m = re.search(pattern, text)
    if not m:
        fail(f"ghost presence: could not find {func_name}")
    before = m.group(0)
    after = before.replace(
        "await getOwnedCharacter()",
        "await getOwnedCharacter({ allowDeadGhost: true })",
        1,
    )
    files["app/(portal)/game/actions.ts"] = text[:m.start()] + after + text[m.end():]

# Feat dead-target policy, both normal and temporary activations.
needle = '''    const target = await resolveGiftTarget({
      supabase,
      character,
      roomId,
      targetMode: (gift.target_mode ?? "self") as GiftTargetMode,
      requestedTargetId,
    });
'''
replacement = needle + '''
    await assertDeadTargetAllowed({
      targetCharacterId: target.id,
      healingCapable:
        Number(gift.health_delta ?? 0) > 0 &&
        ["other", "either"].includes(
          gift.target_mode ?? "self",
        ),
      resurrection: false,
      effectLabel: "Feat",
    });
'''
count = files["app/(portal)/game/actions.ts"].count(needle)
if count < 1:
    fail("feat target policy: target-resolution block was not found.")
files["app/(portal)/game/actions.ts"] = files["app/(portal)/game/actions.ts"].replace(needle, replacement)

# ---------------------------------------------------------------------------
# 6) Opposed actions: dead cannot attack/use attributes/respond; dead cannot be target
# ---------------------------------------------------------------------------
replace_once(
    "app/(portal)/game/opposed-actions.ts",
    '''  presence_score: number | null;
};''',
    '''  presence_score: number | null;
  life_state: "alive" | "death_save_pending" | "dead";
};''',
    "opposed character life state type",
)
replace_once(
    "app/(portal)/game/opposed-actions.ts",
    '''      "id, display_name, current_room_id, muscles, reflexes, vigor, brains, shrewd, presence_score",''',
    '''      "id, display_name, current_room_id, muscles, reflexes, vigor, brains, shrewd, presence_score, life_state",''',
    "opposed actor query life state",
)
replace_once(
    "app/(portal)/game/opposed-actions.ts",
    '''  if (error || !data) throw new Error("Character not found.");
  if (!data.current_room_id) throw new Error("Character not at a Location.");

  return {''',
    '''  if (error || !data) throw new Error("Character not found.");
  if (data.life_state !== "alive") {
    throw new Error(
      data.life_state === "dead"
        ? "Dead Characters cannot attack, use Attributes, or respond to opposed Actions."
        : "Characters at Death's Threshold cannot perform normal Actions.",
    );
  }
  if (!data.current_room_id) throw new Error("Character not at a Location.");

  return {''',
    "opposed actor death guard",
)
replace_once(
    "app/(portal)/game/opposed-actions.ts",
    '.select("id, display_name, current_room_id, status")',
    '.select("id, display_name, current_room_id, status, life_state")',
    "opposed target query life state",
)
replace_once(
    "app/(portal)/game/opposed-actions.ts",
    '''  if (error || !data || data.current_room_id !== roomId) {
    throw new Error("That Character is not available at this Location.");
  }

  return data;''',
    '''  if (error || !data || data.current_room_id !== roomId) {
    throw new Error("That Character is not available at this Location.");
  }

  if (data.life_state === "dead") {
    throw new Error("Dead Characters cannot be targeted by attacks or opposed Attribute Actions.");
  }

  return data;''',
    "opposed target dead guard",
)

# ---------------------------------------------------------------------------
# 7) Items: dead cannot use; only healing others may target recent dead
# ---------------------------------------------------------------------------
replace_once(
    "lib/items/use-actions.ts",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  assertDeadTargetAllowed,
  reviveDeadCharacter,
} from "@/lib/death/death-system";
''',
    "item death imports",
)
replace_once(
    "lib/items/use-actions.ts",
    '''  presence_score: number | null;
};''',
    '''  presence_score: number | null;
  life_state: "alive" | "death_save_pending" | "dead";
  died_at: string | null;
};''',
    "item actor life state type",
)
replace_once(
    "lib/items/use-actions.ts",
    '''  category: { slug: string } | { slug: string }[] | null;
};''',
    '''  category: { slug: string } | { slug: string }[] | null;
  effects:
    | {
        trigger_type: string;
        health_delta: number | null;
      }[]
    | null;
};''',
    "item effects type",
)
replace_once(
    "lib/items/use-actions.ts",
    '''      "id, display_name, current_room_id, muscles, reflexes, vigor, brains, shrewd, presence_score",''',
    '''      "id, display_name, current_room_id, muscles, reflexes, vigor, brains, shrewd, presence_score, life_state, died_at",''',
    "item actor query life state",
)
replace_once(
    "lib/items/use-actions.ts",
    '''  if (error || !data) {
    throw new Error("Your character could not be found.");
  }

  return {''',
    '''  if (error || !data) {
    throw new Error("Your character could not be found.");
  }

  if (data.life_state !== "alive") {
    throw new Error(
      data.life_state === "dead"
        ? "Dead Characters cannot use Items."
        : "Characters at Death's Threshold cannot use normal Items.",
    );
  }

  return {''',
    "item actor death guard",
)
replace_once(
    "lib/items/use-actions.ts",
    '''    teaches_recipe_id,
    category:item_categories(slug)
  `;''',
    '''    teaches_recipe_id,
    category:item_categories(slug),
    effects:item_effects(trigger_type,health_delta)
  `;''',
    "item load healing effects",
)
replace_once(
    "lib/items/use-actions.ts",
    '.select("id, display_name, current_room_id, status")',
    '.select("id, display_name, current_room_id, status, life_state, died_at")',
    "item target query death state",
)
replace_once(
    "lib/items/use-actions.ts",
    '''  return {
    id: data.id,
    displayName: data.display_name,
  };''',
    '''  return {
    id: data.id,
    displayName: data.display_name,
    lifeState: data.life_state,
    diedAt: data.died_at,
  };''',
    "item other target result",
)
# self target return blocks need state fields
needle_item_self = '''    return {
      id: character.id,
      displayName: character.display_name,
    };'''
count = files["lib/items/use-actions.ts"].count(needle_item_self)
if count < 1:
    fail("item self targets: self-target return block was not found.")
files["lib/items/use-actions.ts"] = files["lib/items/use-actions.ts"].replace(
    needle_item_self,
    '''    return {
      id: character.id,
      displayName: character.display_name,
      lifeState: character.life_state,
      diedAt: character.died_at,
    };''',
)

replace_once(
    "lib/items/use-actions.ts",
    '''    const target = await resolveTarget({
      character,
      targetMode,
      requestedTargetId: targetCharacterId,
    });

    if (record.item.resolution_mode === "opposed") {''',
    '''    const target = await resolveTarget({
      character,
      targetMode,
      requestedTargetId: targetCharacterId,
    });

    const healingCapable =
      targetMode !== "self" &&
      (record.item.effects ?? []).some(
        (effect) =>
          effect.trigger_type === "use" &&
          Number(effect.health_delta ?? 0) > 0,
      );

    await assertDeadTargetAllowed({
      targetCharacterId: target.id,
      healingCapable,
      resurrection: false,
      effectLabel: "Item",
    });

    if (record.item.resolution_mode === "opposed") {''',
    "item dead target policy",
)
replace_once(
    "lib/items/use-actions.ts",
    '''    if (result.blocked) {
      return {
        ok: false,
        message:
          result.block_reason ??
          "This Item cannot be used right now.",
      };
    }

    const baseDamage =''',
    '''    if (result.blocked) {
      return {
        ok: false,
        message:
          result.block_reason ??
          "This Item cannot be used right now.",
      };
    }

    if (
      target.lifeState === "dead" &&
      Number(result.health_delta ?? 0) > 0
    ) {
      await reviveDeadCharacter({
        characterId: target.id,
        source: "item",
        forceBeyondEssence: false,
        healthAfterRevival:
          Number(result.health_delta ?? 1),
      });
    }

    const baseDamage =''',
    "item recent-dead revival",
)

# ---------------------------------------------------------------------------
# 8) Shapes: dead cannot cast/respond; recent dead healing is automatic;
#    Resurrection works beyond the essence window.
# ---------------------------------------------------------------------------
replace_once(
    "app/(portal)/game/warping-actions.ts",
    'import { createClient } from "@/lib/supabase/server";\n',
    '''import { createClient } from "@/lib/supabase/server";
import {
  assertDeadTargetAllowed,
  reviveDeadCharacter,
} from "@/lib/death/death-system";
''',
    "warping death imports",
)

old_mine = '''async function mine(){const db=await createClient(),au=await db.auth.getUser();if(!au.data.user)throw Error("Authentication required.");const q=await db.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score").eq("user_id",au.data.user.id).maybeSingle();if(q.error||!q.data)throw Error("Character not found.");return q.data}'''
new_mine = '''async function mine(){const db=await createClient(),au=await db.auth.getUser();if(!au.data.user)throw Error("Authentication required.");const q=await db.from("characters").select("id,display_name,current_room_id,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state").eq("user_id",au.data.user.id).maybeSingle();if(q.error||!q.data)throw Error("Character not found.");if(q.data.life_state!=="alive")throw Error(q.data.life_state==="dead"?"Dead Characters cannot Warp Shapes or respond with Saves.":"Characters at Death's Threshold cannot Warp Shapes or respond with Saves.");return q.data}'''
replace_once(
    "app/(portal)/game/warping-actions.ts",
    old_mine,
    new_mine,
    "warping actor death guard",
)

old_health_apply = '''const heal=half?0:(dice(s[`${p}_heal_dice`])+(s[`${p}_heal_attribute`]?await eff(caster,s[`${p}_heal_attribute`]):0));if(heal-dmg)await applyGiftCurrentHealthDelta({characterId:t.target_character_id,healthDelta:heal-dmg});'''
new_health_apply = '''const heal=half?0:(dice(s[`${p}_heal_dice`])+(s[`${p}_heal_attribute`]?await eff(caster,s[`${p}_heal_attribute`]):0));
 const netHealth=heal-dmg;
 if(netHealth){
  let resurrectionHandled=false;
  const isResurrectionShape=
   Number(s.level)===9&&
   p==="other"&&
   netHealth>0;
  if(isResurrectionShape){
   const revived=await reviveDeadCharacter({
    characterId:t.target_character_id,
    source:"resurrection_shape",
    forceBeyondEssence:true,
    healthAfterRevival:Math.max(1,netHealth),
   });
   resurrectionHandled=revived.revived;
  }
  if(!resurrectionHandled){
   await applyGiftCurrentHealthDelta({characterId:t.target_character_id,healthDelta:netHealth});
  }
 }'''
replace_once(
    "app/(portal)/game/warping-actions.ts",
    old_health_apply,
    new_health_apply,
    "warping resurrection healing",
)

# Dead allowed Shape targets resolve immediately even if the Shape normally asks for a Save.
replace_once(
    "app/(portal)/game/warping-actions.ts",
    '''    const immediateRows =
      (targetRows ?? []).filter(
        (row) =>
          Boolean(
            row.target_character_id,
          ) &&
          (
            row.target_character_id ===
              caster.id ||
            profileResolution(
              shape,
              effectProfile(
                shape,
                row,
                caster.id,
              ),
            ).mode ===
              "automatic"
          ),
      );''',
    '''    const pendingCharacterIds = [
      ...new Set(
        (targetRows ?? [])
          .map((row) => row.target_character_id)
          .filter(Boolean),
      ),
    ] as string[];

    const deadTargetIds =
      new Set<string>();

    if (pendingCharacterIds.length) {
      const deadRows =
        await a
          .from("characters")
          .select("id,life_state")
          .in("id", pendingCharacterIds);

      if (deadRows.error) {
        throw Error(deadRows.error.message);
      }

      for (const deadRow of deadRows.data ?? []) {
        if (deadRow.life_state === "dead") {
          deadTargetIds.add(deadRow.id);
        }
      }
    }

    const immediateRows =
      (targetRows ?? []).filter(
        (row) =>
          Boolean(
            row.target_character_id,
          ) &&
          (
            row.target_character_id ===
              caster.id ||
            deadTargetIds.has(
              row.target_character_id,
            ) ||
            profileResolution(
              shape,
              effectProfile(
                shape,
                row,
                caster.id,
              ),
            ).mode ===
              "automatic"
          ),
      );''',
    "dead Shape targets automatic resolution",
)

replace_once(
    "app/(portal)/game/warping-actions.ts",
    ''' const caster=await mine(),castId=field(f,"cast_id"),effectId=field(f,"effect_id"),targetId=field(f,"target_character_id"),a=admin();
 const cq=''' ,
    ''' const caster=await mine(),castId=field(f,"cast_id"),effectId=field(f,"effect_id"),targetId=field(f,"target_character_id"),a=admin();
 await assertDeadTargetAllowed({
  targetCharacterId:targetId,
  healingCapable:false,
  resurrection:false,
  effectLabel:"Dispel",
 });
 const cq=''',
    "dispel dead target guard",
)

# ---------------------------------------------------------------------------
# 9) Private messages: dead characters are OFFGAME only, server + UI
# ---------------------------------------------------------------------------
replace_once(
    "app/(portal)/messages/send-typed-message-action.ts",
    '''    await assertCurrentUserCan(
      supabase,
      "communication",
    );

    const messageRateLimit =''',
    '''    await assertCurrentUserCan(
      supabase,
      "communication",
    );

    const { data: senderCharacter, error: senderCharacterError } =
      await supabase
        .from("characters")
        .select("life_state")
        .eq("user_id", user.id)
        .maybeSingle();

    if (senderCharacterError) {
      return {
        ok: false,
        message: senderCharacterError.message,
      };
    }

    if (
      senderCharacter?.life_state === "dead" &&
      messageMode !== "offgame"
    ) {
      return {
        ok: false,
        message:
          "Dead Characters may only send Off-game private messages.",
      };
    }

    const messageRateLimit =''',
    "typed PM dead offgame rule",
)

replace_once(
    "app/(portal)/messages/actions.ts",
    'type OwnedCharacter = { id: string };',
    'type OwnedCharacter = { id: string; life_state: "alive" | "death_save_pending" | "dead" };',
    "legacy PM character state type",
)
replace_once(
    "app/(portal)/messages/actions.ts",
    '.select("id")\n    .eq("user_id", user.id)',
    '.select("id, life_state")\n    .eq("user_id", user.id)',
    "legacy PM character state query",
)
replace_once(
    "app/(portal)/messages/actions.ts",
    '''    const { supabase, character } = await getContext();

    const { data: participant, error: participantError } =''',
    '''    const { supabase, character } = await getContext();

    if (character.life_state === "dead") {
      return {
        ok: false,
        message:
          "Dead Characters may only send Off-game private messages. Use the normal message composer and select Off-game.",
      };
    }

    const { data: participant, error: participantError } =''',
    "legacy PM dead guard",
)

# Message composer gets a real dead mode, defaults to offgame and disables Ongame.
replace_once(
    "app/(portal)/messages/components/MessageComposer.tsx",
    '''export default function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {''',
    '''export default function MessageComposer({
  conversationId,
  isDead = false,
}: {
  conversationId: string;
  isDead?: boolean;
}) {''',
    "PM composer isDead prop",
)
replace_once(
    "app/(portal)/messages/components/MessageComposer.tsx",
    '''  const [messageMode, setMessageMode] =
    useState<PrivateMessageMode>(
      "ongame",
    );''',
    '''  const [messageMode, setMessageMode] =
    useState<PrivateMessageMode>(
      isDead ? "offgame" : "ongame",
    );''',
    "PM composer dead default",
)
replace_once(
    "app/(portal)/messages/components/MessageComposer.tsx",
    '''          <button
            type="button"
            onClick={() =>
              setMessageMode("ongame")
            }''',
    '''          <button
            type="button"
            disabled={isDead}
            title={
              isDead
                ? "Dead Characters may only send Off-game private messages."
                : undefined
            }
            onClick={() => {
              if (!isDead) {
                setMessageMode("ongame");
              }
            }}''',
    "PM composer disable ongame",
)
replace_once(
    "app/(portal)/messages/components/MessageComposer.tsx",
    '''        {isOnGame
          ? "This message belongs to the story and is visible as character correspondence."
          : "This message is out of character and should only contain player communication."}''',
    '''        {isDead
          ? "Your Character is dead. Private messages are restricted to Off-game communication."
          : isOnGame
            ? "This message belongs to the story and is visible as character correspondence."
            : "This message is out of character and should only contain player communication."}''',
    "PM composer dead notice",
)

replace_once(
    "app/(portal)/messages/[id]/page.tsx",
    '.select("id, display_name, portrait_url")',
    '.select("id, display_name, portrait_url, life_state")',
    "PM page character life state",
)
replace_once(
    "app/(portal)/messages/[id]/page.tsx",
    '''      <GroupConversationView
        conversationId={id}
        viewerCharacterId={
          character.id
        }
        title={
          conversationMeta.title
        }
      />''',
    '''      <GroupConversationView
        conversationId={id}
        viewerCharacterId={
          character.id
        }
        isDead={
          character.life_state === "dead"
        }
        title={
          conversationMeta.title
        }
      />''',
    "group PM pass dead state",
)
replace_once(
    "app/(portal)/messages/[id]/page.tsx",
    '''            <MessageComposer
              conversationId={id}
            />''',
    '''            <MessageComposer
              conversationId={id}
              isDead={
                character.life_state === "dead"
              }
            />''',
    "direct PM pass dead state",
)

replace_once(
    "app/(portal)/messages/components/group-conversation-view.tsx",
    '''  viewerCharacterId,
  title,
}: {
  conversationId: string;
  viewerCharacterId: string;
  title: string | null;
}) {''',
    '''  viewerCharacterId,
  isDead,
  title,
}: {
  conversationId: string;
  viewerCharacterId: string;
  isDead: boolean;
  title: string | null;
}) {''',
    "group PM dead prop",
)
replace_once(
    "app/(portal)/messages/components/group-conversation-view.tsx",
    '''          <MessageComposer
            conversationId={
              conversationId
            }
          />''',
    '''          <MessageComposer
            conversationId={
              conversationId
            }
            isDead={isDead}
          />''',
    "group PM composer dead prop",
)

# ---------------------------------------------------------------------------
# 10) Forum: dead characters may read/write OFFGAME sections only
# ---------------------------------------------------------------------------
replace_once(
    "lib/forum/order-forum-access.ts",
    '''  characterId: string | null;
  membership: ForumOrderMembership | null;''',
    '''  characterId: string | null;
  lifeState: "alive" | "death_save_pending" | "dead" | null;
  membership: ForumOrderMembership | null;''',
    "forum viewer life state",
)
# null-return cases (two)
files["lib/forum/order-forum-access.ts"] = files["lib/forum/order-forum-access.ts"].replace(
    '''      characterId: null,
      membership: null,''',
    '''      characterId: null,
      lifeState: null,
      membership: null,''',
)
if "lifeState: null" not in files["lib/forum/order-forum-access.ts"]:
    fail("forum viewer null lifeState insertion did not apply.")

replace_once(
    "lib/forum/order-forum-access.ts",
    '''type CharacterRow = {
  id: string;
  status: string;
};''',
    '''type CharacterRow = {
  id: string;
  status: string;
  life_state: "alive" | "death_save_pending" | "dead";
};''',
    "forum character row life state",
)
replace_once(
    "lib/forum/order-forum-access.ts",
    '.select("id, status")',
    '.select("id, status, life_state")',
    "forum viewer query life state",
)
replace_once(
    "lib/forum/order-forum-access.ts",
    '''    characterId: characterData.id,
    membership:''',
    '''    characterId: characterData.id,
    lifeState: characterData.life_state,
    membership:''',
    "forum viewer return life state",
)
replace_once(
    "lib/forum/order-forum-access.ts",
    '''export type ForumSectionAccessRecord = {
  visibility: string;''',
    '''export type ForumSectionAccessRecord = {
  visibility: string;
  section_type?: string | null;''',
    "forum section type access field",
)
replace_once(
    "lib/forum/order-forum-access.ts",
    '''export function canReadForumSection(
  viewer: ForumViewerContext,
  section: ForumSectionAccessRecord,
): boolean {
  if (section.visibility === "staff") {''',
    '''export function canReadForumSection(
  viewer: ForumViewerContext,
  section: ForumSectionAccessRecord,
): boolean {
  if (
    viewer.lifeState === "dead" &&
    section.section_type !== "offgame"
  ) {
    return false;
  }

  if (section.visibility === "staff") {''',
    "forum dead read rule",
)
replace_once(
    "lib/forum/order-forum-access.ts",
    '''export function canWriteForumSection(
  viewer: ForumViewerContext,
  section: ForumSectionAccessRecord,
): boolean {
  if (section.visibility === "staff") {''',
    '''export function canWriteForumSection(
  viewer: ForumViewerContext,
  section: ForumSectionAccessRecord,
): boolean {
  if (
    viewer.lifeState === "dead" &&
    section.section_type !== "offgame"
  ) {
    return false;
  }

  if (section.visibility === "staff") {''',
    "forum dead write rule",
)

replace_once(
    "app/(portal)/forum/actions.ts",
    '''  name: string;
  association_id:''',
    '''  name: string;
  section_type: "ongame" | "offgame" | "organisation";
  association_id:''',
    "forum action section type",
)
# Both topic/reply section selects: inject section_type after name.
needle_forum_select = '''        slug,
        name,
        association_id,'''
count = files["app/(portal)/forum/actions.ts"].count(needle_forum_select)
if count < 1:
    fail("forum action section selects: section select fragment was not found.")
files["app/(portal)/forum/actions.ts"] = files["app/(portal)/forum/actions.ts"].replace(
    needle_forum_select,
    '''        slug,
        name,
        section_type,
        association_id,''',
)
# Reply select lacks order_id in current source; keep existing behavior.

# Topic direct URL must load section_type so dead users cannot bypass.
replace_once(
    "app/(portal)/forum/[sectionSlug]/[topicSlug]/page.tsx",
    '''  visibility: string;
  order_id:''',
    '''  visibility: string;
  section_type: "ongame" | "offgame" | "organisation";
  order_id:''',
    "forum topic page section type",
)
replace_once(
    "app/(portal)/forum/[sectionSlug]/[topicSlug]/page.tsx",
    '''        description,
        visibility,
        order_id,''',
    '''        description,
        section_type,
        visibility,
        order_id,''',
    "forum topic page query section type",
)

# ---------------------------------------------------------------------------
# 11) Death Gate richer display (essence countdown text)
# ---------------------------------------------------------------------------
replace_once(
    "app/(portal)/game/components/CharacterDeathGate.tsx",
    '''        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-bc9d91))]">
          {until ? `This Character remains dead until ${until}.` : "This Character is dead."}
        </p>''',
    '''        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-bc9d91))]">
          {until ? `This Character remains dead until ${until}.` : "This Character is dead."}
        </p>
        <p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-a98d85))]">
          {state.essenceEndsAt &&
          Date.parse(state.essenceEndsAt) > Date.now()
            ? `Their essence still clings to the body until ${new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(state.essenceEndsAt))}. Healing Items, Shapes and Feats that can affect Others may still return them.`
            : "Their essence has faded. Ordinary healing can no longer return them; only a Level IX Resurrection Shape, staff intervention, or the Current's natural return can do so."}
        </p>''',
    "death gate essence text",
)

# ---------------------------------------------------------------------------
# New central death module
# ---------------------------------------------------------------------------
death_system_ts = r'''import "server-only";

import { randomInt } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type DeathRules = {
  deathDurationHours: number;
  essenceWindowMinutes: number;
  autoReviveHealth: number;
  ghostChatEnabled: boolean;
  ghostMovementEnabled: boolean;
  deathAnnouncementTemplate: string;
};

const DEFAULT_ANNOUNCEMENT =
  "{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...";

export async function getDeathRules(): Promise<DeathRules> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("character_death_rules")
    .select(
      "death_duration_hours,essence_window_minutes,auto_revive_health,ghost_chat_enabled,ghost_movement_enabled,death_announcement_template",
    )
    .eq("singleton", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Death rules: ${error.message}`);
  }

  return {
    deathDurationHours: Math.max(
      1,
      Math.floor(Number(data?.death_duration_hours ?? 24)),
    ),
    essenceWindowMinutes: Math.max(
      1,
      Math.floor(Number(data?.essence_window_minutes ?? 60)),
    ),
    autoReviveHealth: Math.max(
      1,
      Math.floor(Number(data?.auto_revive_health ?? 1)),
    ),
    ghostChatEnabled:
      data?.ghost_chat_enabled !== false,
    ghostMovementEnabled:
      data?.ghost_movement_enabled !== false,
    deathAnnouncementTemplate:
      String(data?.death_announcement_template ?? DEFAULT_ANNOUNCEMENT),
  };
}

async function characterState(characterId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("characters")
    .select(
      "id,display_name,current_room_id,current_health,life_state,zero_hp_at,died_at,dead_until",
    )
    .eq("id", characterId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Character not found.",
    );
  }

  return data;
}

function deathStartedAt(character: {
  died_at: string | null;
  zero_hp_at: string | null;
}) {
  return character.died_at ?? character.zero_hp_at;
}

export async function assertDeadTargetAllowed({
  targetCharacterId,
  healingCapable,
  resurrection,
  effectLabel,
}: {
  targetCharacterId: string;
  healingCapable: boolean;
  resurrection: boolean;
  effectLabel: string;
}) {
  const character =
    await characterState(targetCharacterId);

  if (character.life_state !== "dead") {
    return;
  }

  if (resurrection && healingCapable) {
    return;
  }

  if (!healingCapable) {
    throw new Error(
      `${effectLabel} cannot target a dead Character because it does not provide healing that can affect another Character.`,
    );
  }

  const rules = await getDeathRules();
  const diedAt = deathStartedAt(character);

  if (!diedAt) {
    throw new Error(
      "This dead Character has no valid death timestamp and cannot receive ordinary healing.",
    );
  }

  const essenceEnds =
    Date.parse(diedAt) +
    rules.essenceWindowMinutes * 60_000;

  if (
    Number.isNaN(essenceEnds) ||
    Date.now() > essenceEnds
  ) {
    throw new Error(
      `This Character's essence has faded. Ordinary healing can only return a dead Character during the first ${rules.essenceWindowMinutes} minutes after death. A Level IX Resurrection Shape is now required.`,
    );
  }
}

async function chooseRandomMalus() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("death_resurrection_maluses")
    .select("id,name,description")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `Unable to load Resurrection Maluses: ${error.message}`,
    );
  }

  if (!data?.length) {
    return null;
  }

  return data[randomInt(0, data.length)];
}

async function announceSystemMessage({
  roomId,
  characterId,
  message,
}: {
  roomId: string | null;
  characterId: string;
  message: string;
}) {
  if (!roomId) return;

  const admin = createAdminClient();

  const { error } = await admin
    .from("room_messages")
    .insert({
      room_id: roomId,
      character_id: characterId,
      message,
      message_type: "action",
      speaker_type: "system",
      client_nonce: crypto.randomUUID(),
    });

  if (error) {
    throw new Error(
      `Unable to post Death system message: ${error.message}`,
    );
  }
}

export async function finaliseCharacterDeath({
  characterId,
  deathEventId,
}: {
  characterId: string;
  deathEventId: string;
}) {
  const admin = createAdminClient();
  const rules = await getDeathRules();
  const character = await characterState(characterId);

  const now = new Date();
  const nowIso = now.toISOString();
  const deadUntil = new Date(
    now.getTime() +
      rules.deathDurationHours * 60 * 60 * 1000,
  ).toISOString();

  const { error: characterError } = await admin
    .from("characters")
    .update({
      current_health: 0,
      life_state: "dead",
      died_at: nowIso,
      dead_until: deadUntil,
      updated_at: nowIso,
    })
    .eq("id", characterId);

  if (characterError) {
    throw new Error(
      `Unable to mark Character dead: ${characterError.message}`,
    );
  }

  const { error: eventError } = await admin
    .from("character_death_events")
    .update({
      status: "dead",
      dead_until: deadUntil,
      resolved_at: nowIso,
    })
    .eq("id", deathEventId)
    .eq("character_id", characterId);

  if (eventError) {
    throw new Error(
      `Unable to resolve Death event: ${eventError.message}`,
    );
  }

  const announcement =
    rules.deathAnnouncementTemplate
      .replaceAll("{character}", character.display_name)
      .replaceAll(
        "{minutes}",
        String(rules.essenceWindowMinutes),
      );

  await announceSystemMessage({
    roomId: character.current_room_id,
    characterId,
    message: `◆ ${announcement}`,
  });

  return {
    diedAt: nowIso,
    deadUntil,
  };
}

export async function reviveDeadCharacter({
  characterId,
  source,
  forceBeyondEssence,
  healthAfterRevival,
  actorUserId = null,
}: {
  characterId: string;
  source:
    | "healing_effect"
    | "item"
    | "feat"
    | "shape"
    | "resurrection_shape"
    | "natural"
    | "admin";
  forceBeyondEssence: boolean;
  healthAfterRevival?: number | null;
  actorUserId?: string | null;
}): Promise<{
  revived: boolean;
  currentHealth: number | null;
  delayed: boolean;
  malus:
    | {
        id: string;
        name: string;
        description: string;
      }
    | null;
}> {
  const admin = createAdminClient();
  const character = await characterState(characterId);

  if (character.life_state !== "dead") {
    return {
      revived: false,
      currentHealth: character.current_health,
      delayed: false,
      malus: null,
    };
  }

  const rules = await getDeathRules();
  const diedAt = deathStartedAt(character);

  if (!diedAt) {
    throw new Error(
      "This Character has no valid death timestamp.",
    );
  }

  const elapsedMs = Date.now() - Date.parse(diedAt);
  const essenceMs =
    rules.essenceWindowMinutes * 60_000;
  const delayed =
    !Number.isNaN(elapsedMs) &&
    elapsedMs > essenceMs;

  if (delayed && !forceBeyondEssence) {
    throw new Error(
      `This Character's essence has faded. Only a Level IX Resurrection Shape, staff intervention, or the Current's natural return may restore them now.`,
    );
  }

  const revivedHealth = Math.max(
    1,
    Math.floor(
      Number(
        healthAfterRevival ??
          (
            Number(character.current_health ?? 0) > 0
              ? character.current_health
              : rules.autoReviveHealth
          ),
      ),
    ),
  );

  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from("characters")
    .update({
      current_health: revivedHealth,
      life_state: "alive",
      zero_hp_at: null,
      died_at: null,
      dead_until: null,
      updated_at: now,
    })
    .eq("id", characterId)
    .eq("life_state", "dead");

  if (updateError) {
    throw new Error(
      `Unable to resurrect Character: ${updateError.message}`,
    );
  }

  const { data: deathEvent } = await admin
    .from("character_death_events")
    .select("id")
    .eq("character_id", characterId)
    .eq("status", "dead")
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (deathEvent) {
    const { error: deathEventError } = await admin
      .from("character_death_events")
      .update({
        status: "revived",
        resolved_at: now,
        revived_at: now,
        revival_source: source,
      })
      .eq("id", deathEvent.id);

    if (deathEventError) {
      throw new Error(
        `Unable to update Death event: ${deathEventError.message}`,
      );
    }
  }

  let malus:
    | {
        id: string;
        name: string;
        description: string;
      }
    | null = null;

  if (delayed) {
    malus = await chooseRandomMalus();

    if (malus) {
      await admin
        .from("character_resurrection_maluses")
        .update({
          cleared_at: now,
          changed_by_user_id: actorUserId,
        })
        .eq("character_id", characterId)
        .is("cleared_at", null);

      const { error: malusError } = await admin
        .from("character_resurrection_maluses")
        .insert({
          character_id: characterId,
          death_event_id: deathEvent?.id ?? null,
          malus_id: malus.id,
          narrative_text: malus.description,
          changed_by_user_id: actorUserId,
        });

      if (malusError) {
        throw new Error(
          `Unable to apply Resurrection Malus: ${malusError.message}`,
        );
      }
    }
  }

  const malusText = malus
    ? ` The journey beyond their lingering essence has left its mark: ${malus.name} — ${malus.description}`
    : "";

  await announceSystemMessage({
    roomId: character.current_room_id,
    characterId,
    message:
      `◆ ${character.display_name} draws breath once more. ` +
      `The Current has returned them to the living.${malusText}`,
  });

  return {
    revived: true,
    currentHealth: revivedHealth,
    delayed,
    malus,
  };
}

export async function reconcileExpiredCharacterDeath(
  characterId: string,
) {
  const character = await characterState(characterId);

  if (
    character.life_state !== "dead" ||
    !character.dead_until
  ) {
    return {
      revived: false,
      currentHealth: character.current_health,
    };
  }

  const expiry = Date.parse(character.dead_until);

  if (
    Number.isNaN(expiry) ||
    expiry > Date.now()
  ) {
    return {
      revived: false,
      currentHealth: character.current_health,
    };
  }

  return reviveDeadCharacter({
    characterId,
    source: "natural",
    forceBeyondEssence: true,
  });
}

export async function assertGhostChatAllowed(
  characterId: string,
  roomId: string,
) {
  const character = await characterState(characterId);

  if (character.life_state !== "dead") {
    return;
  }

  const rules = await getDeathRules();

  if (!rules.ghostChatEnabled) {
    throw new Error(
      "Ghost location chat is currently disabled.",
    );
  }

  const admin = createAdminClient();
  const { data: room, error } = await admin
    .from("rooms")
    .select("allow_dead_ghosts")
    .eq("id", roomId)
    .maybeSingle();

  if (error || !room?.allow_dead_ghosts) {
    throw new Error(
      "Ghosts cannot speak in this Location.",
    );
  }
}

export async function assertGhostMovementAllowed(
  characterId: string,
  destinationRoomId: string,
) {
  const character = await characterState(characterId);

  if (character.life_state !== "dead") {
    return;
  }

  const rules = await getDeathRules();

  if (!rules.ghostMovementEnabled) {
    throw new Error(
      "Ghost movement is currently disabled.",
    );
  }

  const admin = createAdminClient();
  const { data: room, error } = await admin
    .from("rooms")
    .select("allow_dead_ghosts,is_active")
    .eq("id", destinationRoomId)
    .maybeSingle();

  if (
    error ||
    !room ||
    !room.is_active ||
    !room.allow_dead_ghosts
  ) {
    throw new Error(
      "Ghosts cannot enter this Location.",
    );
  }
}
'''

# ---------------------------------------------------------------------------
# New admin/death actions
# ---------------------------------------------------------------------------
admin_death_actions = r'''"use server";

import { revalidatePath } from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  reviveDeadCharacter,
} from "@/lib/death/death-system";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function integer(
  formData: FormData,
  name: string,
  fallback: number,
) {
  const value = Number.parseInt(text(formData, name), 10);
  return Number.isFinite(value) ? value : fallback;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

async function staff() {
  const session = await requireAdminSection("death");

  if (
    !["owner", "admin", "master"].includes(
      session.role,
    )
  ) {
    throw new Error(
      "Only Owners, Admins and Masters may manage Death.",
    );
  }

  return session;
}

export async function updateDeathRules(
  formData: FormData,
) {
  await staff();
  const admin = createAdminClient();

  const deathDurationHours = Math.max(
    1,
    integer(formData, "death_duration_hours", 24),
  );
  const essenceWindowMinutes = Math.max(
    1,
    integer(formData, "essence_window_minutes", 60),
  );
  const autoReviveHealth = Math.max(
    1,
    integer(formData, "auto_revive_health", 1),
  );

  const template =
    text(formData, "death_announcement_template");

  const { error } = await admin
    .from("character_death_rules")
    .upsert(
      {
        singleton: true,
        death_duration_hours: deathDurationHours,
        essence_window_minutes: essenceWindowMinutes,
        auto_revive_health: autoReviveHealth,
        ghost_chat_enabled:
          checked(formData, "ghost_chat_enabled"),
        ghost_movement_enabled:
          checked(formData, "ghost_movement_enabled"),
        death_announcement_template:
          template ||
          "{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...",
      },
      { onConflict: "singleton" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/death");
}

export async function toggleGhostRoom(
  formData: FormData,
) {
  await staff();

  const roomId = text(formData, "room_id");
  if (!roomId) throw new Error("Missing Location.");

  const admin = createAdminClient();

  const { error } = await admin
    .from("rooms")
    .update({
      allow_dead_ghosts:
        checked(formData, "allow_dead_ghosts"),
    })
    .eq("id", roomId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
  revalidatePath("/game");
}

export async function resurrectCharacter(
  formData: FormData,
) {
  const session = await staff();

  const characterId =
    text(formData, "character_id");

  if (!characterId) {
    throw new Error("Missing Character.");
  }

  const health = Math.max(
    1,
    integer(formData, "health", 1),
  );

  await reviveDeadCharacter({
    characterId,
    source: "admin",
    forceBeyondEssence: true,
    healthAfterRevival: health,
    actorUserId: session.userId,
  });

  revalidatePath("/admin/death");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/characters");
}

export async function setDeadUntil(
  formData: FormData,
) {
  await staff();

  const characterId =
    text(formData, "character_id");
  const deadUntilRaw =
    text(formData, "dead_until");

  if (!characterId || !deadUntilRaw) {
    throw new Error(
      "Character and return date/time are required.",
    );
  }

  const date = new Date(deadUntilRaw);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid return date/time.");
  }

  const admin = createAdminClient();
  const iso = date.toISOString();

  const { error } = await admin
    .from("characters")
    .update({
      dead_until: iso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", characterId)
    .eq("life_state", "dead");

  if (error) throw new Error(error.message);

  await admin
    .from("character_death_events")
    .update({ dead_until: iso })
    .eq("character_id", characterId)
    .eq("status", "dead");

  revalidatePath("/admin/death");
}

export async function createResurrectionMalus(
  formData: FormData,
) {
  await staff();

  const name = text(formData, "name");
  const description =
    text(formData, "description");

  if (!name || !description) {
    throw new Error(
      "Malus name and description are required.",
    );
  }

  const admin = createAdminClient();

  const { data: last } = await admin
    .from("death_resurrection_maluses")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin
    .from("death_resurrection_maluses")
    .insert({
      name,
      description,
      is_active: true,
      sort_order:
        Number(last?.sort_order ?? 0) + 10,
    });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
}

export async function updateResurrectionMalus(
  formData: FormData,
) {
  await staff();

  const id = text(formData, "malus_id");
  const name = text(formData, "name");
  const description =
    text(formData, "description");

  if (!id || !name || !description) {
    throw new Error(
      "Malus id, name and description are required.",
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("death_resurrection_maluses")
    .update({
      name,
      description,
      is_active: checked(formData, "is_active"),
      sort_order: integer(
        formData,
        "sort_order",
        0,
      ),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
}

export async function setCharacterResurrectionMalus(
  formData: FormData,
) {
  const session = await staff();

  const characterId =
    text(formData, "character_id");
  const malusId =
    text(formData, "malus_id");

  if (!characterId) {
    throw new Error("Missing Character.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("character_resurrection_maluses")
    .update({
      cleared_at: now,
      changed_by_user_id: session.userId,
    })
    .eq("character_id", characterId)
    .is("cleared_at", null);

  if (!malusId) {
    revalidatePath("/admin/death");
    return;
  }

  const { data: malus, error: malusError } =
    await admin
      .from("death_resurrection_maluses")
      .select("id,description")
      .eq("id", malusId)
      .maybeSingle();

  if (malusError || !malus) {
    throw new Error(
      malusError?.message ??
        "Resurrection Malus not found.",
    );
  }

  const { data: deathEvent } = await admin
    .from("character_death_events")
    .select("id")
    .eq("character_id", characterId)
    .eq("status", "revived")
    .order("resolved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin
    .from("character_resurrection_maluses")
    .insert({
      character_id: characterId,
      death_event_id: deathEvent?.id ?? null,
      malus_id: malus.id,
      narrative_text: malus.description,
      changed_by_user_id: session.userId,
    });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/death");
}
'''

admin_death_page = r'''import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createResurrectionMalus,
  resurrectCharacter,
  setCharacterResurrectionMalus,
  setDeadUntil,
  toggleGhostRoom,
  updateDeathRules,
  updateResurrectionMalus,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function minutesSince(value: string | null) {
  if (!value) return null;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;

  return Math.max(
    0,
    Math.floor((Date.now() - parsed) / 60_000),
  );
}

const input =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none";

const panel =
  "border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5";

export default async function DeathAdminPage() {
  const session =
    await requireAdminSection("death");

  if (
    !["owner", "admin", "master"].includes(
      session.role,
    )
  ) {
    return null;
  }

  const admin = createAdminClient();

  const [
    rulesResult,
    deadResult,
    roomsResult,
    malusesResult,
    activeMalusesResult,
    charactersResult,
  ] = await Promise.all([
    admin
      .from("character_death_rules")
      .select("*")
      .eq("singleton", true)
      .maybeSingle(),
    admin
      .from("characters")
      .select(
        "id,display_name,current_room_id,died_at,zero_hp_at,dead_until,current_health",
      )
      .eq("life_state", "dead")
      .eq("is_system", false)
      .order("died_at", { ascending: true }),
    admin
      .from("rooms")
      .select(
        "id,name,slug,is_active,allow_dead_ghosts",
      )
      .eq("is_active", true)
      .order("name", { ascending: true }),
    admin
      .from("death_resurrection_maluses")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    admin
      .from("character_resurrection_maluses")
      .select(
        "id,character_id,malus_id,narrative_text,applied_at,cleared_at",
      )
      .is("cleared_at", null)
      .order("applied_at", { ascending: false }),
    admin
      .from("characters")
      .select("id,display_name")
      .eq("is_system", false)
      .order("display_name", { ascending: true }),
  ]);

  const firstError =
    rulesResult.error ??
    deadResult.error ??
    roomsResult.error ??
    malusesResult.error ??
    activeMalusesResult.error ??
    charactersResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const rules = rulesResult.data ?? {
    death_duration_hours: 24,
    essence_window_minutes: 60,
    auto_revive_health: 1,
    ghost_chat_enabled: true,
    ghost_movement_enabled: true,
    death_announcement_template:
      "{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...",
  };

  const dead = deadResult.data ?? [];
  const rooms = roomsResult.data ?? [];
  const maluses = malusesResult.data ?? [];
  const activeMaluses =
    activeMalusesResult.data ?? [];
  const characters =
    charactersResult.data ?? [];

  const characterName =
    new Map(
      characters.map((character) => [
        character.id,
        character.display_name,
      ]),
    );

  const malusName =
    new Map(
      maluses.map((malus) => [
        malus.id,
        malus.name,
      ]),
    );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8b704e))]">
            Character state
          </p>
          <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
            Death System
          </h1>
          <p className="mt-2 max-w-4xl text-[10px] leading-5 text-[rgb(var(--sep-colour-9c8b72))]">
            Dead Characters cannot use Items, Shapes, Feats, attacks, Attributes or mechanical Counters. During the Essence Window they may still be restored by healing Items, Shapes or Feats that can affect another Character. After the Essence Window only a Level IX Resurrection Shape, staff intervention, or the Current&apos;s timed return can restore them. Delayed resurrection applies one random narrative Resurrection Malus.
          </p>
        </header>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Death Rules
          </h2>

          <form
            action={updateDeathRules}
            className="mt-4 grid gap-4 md:grid-cols-3"
          >
            <label>
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Standard Death Duration (hours)
              </span>
              <input
                className={input}
                type="number"
                min={1}
                name="death_duration_hours"
                defaultValue={
                  rules.death_duration_hours
                }
              />
            </label>

            <label>
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Essence Window (minutes)
              </span>
              <input
                className={input}
                type="number"
                min={1}
                name="essence_window_minutes"
                defaultValue={
                  rules.essence_window_minutes
                }
              />
            </label>

            <label>
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Natural Return Health
              </span>
              <input
                className={input}
                type="number"
                min={1}
                name="auto_revive_health"
                defaultValue={
                  rules.auto_revive_health
                }
              />
            </label>

            <label className="flex items-center gap-2 text-[10px]">
              <input
                type="checkbox"
                name="ghost_chat_enabled"
                defaultChecked={
                  rules.ghost_chat_enabled !== false
                }
              />
              Ghost location chat enabled
            </label>

            <label className="flex items-center gap-2 text-[10px]">
              <input
                type="checkbox"
                name="ghost_movement_enabled"
                defaultChecked={
                  rules.ghost_movement_enabled !== false
                }
              />
              Ghost movement enabled
            </label>

            <label className="md:col-span-3">
              <span className="mb-1 block text-[8px] uppercase tracking-[0.15em]">
                Death Announcement
              </span>
              <textarea
                className={input}
                rows={5}
                name="death_announcement_template"
                defaultValue={
                  rules.death_announcement_template
                }
              />
              <span className="mt-1 block text-[8px] opacity-70">
                Available placeholders: {"{character}"} and {"{minutes}"}.
              </span>
            </label>

            <div className="md:col-span-3 flex justify-end">
              <button className="border px-4 py-2 text-[9px] uppercase tracking-[0.16em]">
                Save Death Rules
              </button>
            </div>
          </form>
        </section>

        <section className={panel}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
              Dead Characters
            </h2>
            <span className="text-[9px] uppercase tracking-[0.14em] opacity-70">
              {dead.length} dead
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {dead.length ? (
              dead.map((character) => {
                const diedAt =
                  character.died_at ??
                  character.zero_hp_at;
                const elapsed =
                  minutesSince(diedAt);
                const essenceRemaining =
                  elapsed === null
                    ? null
                    : Math.max(
                        0,
                        Number(
                          rules.essence_window_minutes ??
                            60,
                        ) - elapsed,
                      );

                return (
                  <article
                    key={character.id}
                    className="border border-[rgb(var(--sep-colour-60482e))]/35 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                      <div>
                        <h3 className="font-serif text-lg">
                          {character.display_name}
                        </h3>
                        <p className="mt-1 text-[9px] leading-5 opacity-75">
                          Died: {formatDate(diedAt)}
                          {" · "}
                          {essenceRemaining &&
                          essenceRemaining > 0
                            ? `Essence remaining: ${essenceRemaining} min`
                            : "Essence faded"}
                          {" · "}
                          Natural return:{" "}
                          {formatDate(
                            character.dead_until,
                          )}
                        </p>
                      </div>

                      <form
                        action={resurrectCharacter}
                        className="flex items-end gap-2"
                      >
                        <input
                          type="hidden"
                          name="character_id"
                          value={character.id}
                        />
                        <label>
                          <span className="mb-1 block text-[7px] uppercase">
                            HP
                          </span>
                          <input
                            className="w-20 border bg-transparent px-2 py-2 text-[10px]"
                            type="number"
                            min={1}
                            name="health"
                            defaultValue={1}
                          />
                        </label>
                        <button className="border px-3 py-2 text-[8px] uppercase">
                          Resurrect now
                        </button>
                      </form>
                    </div>

                    <form
                      action={setDeadUntil}
                      className="mt-3 flex flex-wrap items-end gap-2"
                    >
                      <input
                        type="hidden"
                        name="character_id"
                        value={character.id}
                      />
                      <label>
                        <span className="mb-1 block text-[7px] uppercase">
                          Dead until
                        </span>
                        <input
                          className={input}
                          type="datetime-local"
                          name="dead_until"
                          defaultValue={
                            character.dead_until
                              ? new Date(
                                  character.dead_until,
                                )
                                  .toISOString()
                                  .slice(0, 16)
                              : ""
                          }
                        />
                      </label>
                      <button className="border px-3 py-2 text-[8px] uppercase">
                        Change return time
                      </button>
                    </form>
                  </article>
                );
              })
            ) : (
              <p className="text-[10px] italic opacity-70">
                No Characters are currently dead.
              </p>
            )}
          </div>
        </section>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Ghost Locations
          </h2>
          <p className="mt-1 text-[9px] opacity-70">
            A dead Character may enter and write in Location chat only where Ghosts are allowed.
          </p>

          <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <form
                action={toggleGhostRoom}
                key={room.id}
                className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/30 p-3"
              >
                <input
                  type="hidden"
                  name="room_id"
                  value={room.id}
                />
                <label className="flex items-center gap-2 text-[10px]">
                  <input
                    type="checkbox"
                    name="allow_dead_ghosts"
                    defaultChecked={
                      room.allow_dead_ghosts === true
                    }
                  />
                  {room.name}
                </label>
                <button className="border px-2 py-1 text-[7px] uppercase">
                  Save
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Resurrection Maluses
          </h2>
          <p className="mt-1 text-[9px] opacity-70">
            One active malus is chosen randomly only when resurrection occurs after the Essence Window. These effects are narrative only.
          </p>

          <form
            action={createResurrectionMalus}
            className="mt-4 grid gap-2 md:grid-cols-[220px_1fr_auto]"
          >
            <input
              className={input}
              name="name"
              placeholder="New malus name"
            />
            <input
              className={input}
              name="description"
              placeholder="Narrative effect"
            />
            <button className="border px-3 py-2 text-[8px] uppercase">
              Add
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {maluses.map((malus) => (
              <form
                action={updateResurrectionMalus}
                key={malus.id}
                className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/30 p-3 md:grid-cols-[200px_1fr_80px_auto_auto]"
              >
                <input
                  type="hidden"
                  name="malus_id"
                  value={malus.id}
                />
                <input
                  className={input}
                  name="name"
                  defaultValue={malus.name}
                />
                <input
                  className={input}
                  name="description"
                  defaultValue={malus.description}
                />
                <input
                  className={input}
                  type="number"
                  name="sort_order"
                  defaultValue={malus.sort_order}
                />
                <label className="flex items-center gap-2 text-[8px] uppercase">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={
                      malus.is_active === true
                    }
                  />
                  Active
                </label>
                <button className="border px-3 py-2 text-[8px] uppercase">
                  Save
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
            Character Resurrection Maluses
          </h2>
          <p className="mt-1 text-[9px] opacity-70">
            Change or clear the currently active narrative malus for a resurrected Character.
          </p>

          <div className="mt-4 space-y-2">
            {activeMaluses.length ? (
              activeMaluses.map((entry) => (
                <form
                  action={setCharacterResurrectionMalus}
                  key={entry.id}
                  className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/30 p-3 md:grid-cols-[220px_1fr_auto]"
                >
                  <input
                    type="hidden"
                    name="character_id"
                    value={entry.character_id}
                  />
                  <div>
                    <p className="font-serif text-sm">
                      {characterName.get(
                        entry.character_id,
                      ) ?? entry.character_id}
                    </p>
                    <p className="mt-1 text-[8px] opacity-65">
                      Current:{" "}
                      {malusName.get(
                        entry.malus_id,
                      ) ?? "Custom / unknown"}
                    </p>
                  </div>
                  <select
                    className={input}
                    name="malus_id"
                    defaultValue={
                      entry.malus_id ?? ""
                    }
                  >
                    <option value="">
                      Clear malus
                    </option>
                    {maluses
                      .filter(
                        (malus) =>
                          malus.is_active,
                      )
                      .map((malus) => (
                        <option
                          key={malus.id}
                          value={malus.id}
                        >
                          {malus.name}
                        </option>
                      ))}
                  </select>
                  <button className="border px-3 py-2 text-[8px] uppercase">
                    Apply
                  </button>
                </form>
              ))
            ) : (
              <p className="text-[10px] italic opacity-70">
                No active Resurrection Maluses.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
'''

# ---------------------------------------------------------------------------
# SQL migration
# ---------------------------------------------------------------------------
sql = r'''-- SEPULCHRIA DEATH SYSTEM UPGRADE
-- Generated for master commit 87f1c990ae586b33c8601fbd530d2d51dc4496bc
-- Run this ONCE in the Supabase SQL editor BEFORE running npm run build.

begin;

alter table public.characters
  add column if not exists died_at timestamptz;

update public.characters
set died_at = coalesce(died_at, zero_hp_at, updated_at, now())
where life_state = 'dead'
  and died_at is null;

alter table public.character_death_rules
  add column if not exists essence_window_minutes integer not null default 60,
  add column if not exists auto_revive_health integer not null default 1,
  add column if not exists ghost_chat_enabled boolean not null default true,
  add column if not exists ghost_movement_enabled boolean not null default true,
  add column if not exists death_announcement_template text not null default
    '{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...';

alter table public.rooms
  add column if not exists allow_dead_ghosts boolean not null default false;

alter table public.character_death_events
  add column if not exists revived_at timestamptz,
  add column if not exists revival_source text;

create table if not exists public.death_resurrection_maluses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_resurrection_maluses (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null
    references public.characters(id) on delete cascade,
  death_event_id uuid
    references public.character_death_events(id) on delete set null,
  malus_id uuid
    references public.death_resurrection_maluses(id) on delete set null,
  narrative_text text not null,
  applied_at timestamptz not null default now(),
  cleared_at timestamptz,
  changed_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists character_resurrection_maluses_character_idx
  on public.character_resurrection_maluses(character_id, applied_at desc);

create index if not exists characters_dead_lookup_idx
  on public.characters(life_state, died_at)
  where life_state = 'dead';

insert into public.death_resurrection_maluses
  (name, description, sort_order)
values
  ('Echo of the Last Breath', 'Their voice occasionally carries a faint second whisper a fraction of a second behind it.', 10),
  ('Cold Thread', 'Their body never seems quite warm again, even beside a fire.', 20),
  ('Current-Sick Dreams', 'Sleep brings vivid dreams of impossible currents of light and places they have never visited.', 30),
  ('Hollow Reflection', 'Mirrors and still water sometimes seem a heartbeat slow to reflect them.', 40),
  ('Borrowed Heartbeat', 'Their heartbeat occasionally falls into an unsettling rhythm before returning to normal.', 50),
  ('Veil-Touched', 'Animals sometimes hesitate around them, sensing something they cannot understand.', 60),
  ('Ash on the Tongue', 'Strong emotions can leave a faint taste of ash or metal in their mouth.', 70),
  ('Memory Scar', 'One mundane memory from before their death has become strangely indistinct.', 80),
  ('Grave-Light', 'In darkness, their eyes sometimes catch light where there should be none.', 90),
  ('The Distant Call', 'In complete silence they occasionally think they hear someone speaking their name from far away.', 100),
  ('Shadow Afterimage', 'Their shadow can appear to linger for the briefest instant after they move.', 110),
  ('The Missing Moment', 'They occasionally lose a few seconds of subjective time, as though the Current briefly pulls at them again.', 120)
on conflict (name) do nothing;

-- Dead Characters may only send OFFGAME private messages.
create or replace function public.enforce_dead_private_message_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
begin
  select life_state::text
  into v_state
  from public.characters
  where id = new.sender_character_id;

  if v_state = 'dead'
     and coalesce(new.message_mode::text, 'ongame') <> 'offgame' then
    raise exception
      'Dead Characters may only send Off-game private messages.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_private_message_mode
  on public.direct_messages;

create trigger trg_dead_private_message_mode
before insert or update of message_mode, sender_character_id
on public.direct_messages
for each row
execute function public.enforce_dead_private_message_mode();

-- Dead Characters may only post in OFFGAME forum sections.
create or replace function public.enforce_dead_forum_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_section_type text;
begin
  if new.author_character_id is null then
    return new;
  end if;

  select life_state::text
  into v_state
  from public.characters
  where id = new.author_character_id;

  if v_state <> 'dead' then
    return new;
  end if;

  select fs.section_type::text
  into v_section_type
  from public.forum_topics ft
  join public.forum_sections fs
    on fs.id = ft.section_id
  where ft.id = new.topic_id;

  if coalesce(v_section_type, '') <> 'offgame' then
    raise exception
      'Dead Characters may only use Offgame forum sections.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_forum_post
  on public.forum_posts;

create trigger trg_dead_forum_post
before insert or update of topic_id, author_character_id
on public.forum_posts
for each row
execute function public.enforce_dead_forum_post();

-- Dead Characters cannot create Shape casts.
create or replace function public.enforce_living_shape_caster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
begin
  select life_state::text
  into v_state
  from public.characters
  where id = new.caster_character_id;

  if v_state = 'dead' then
    raise exception 'Dead Characters cannot Warp Shapes.';
  elsif v_state = 'death_save_pending' then
    raise exception
      'Characters at Death''s Threshold cannot Warp Shapes.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_living_shape_caster
  on public.shape_casts;

create trigger trg_living_shape_caster
before insert or update of caster_character_id
on public.shape_casts
for each row
execute function public.enforce_living_shape_caster();

-- Dead Characters cannot attack, use opposed Attributes, or Counter.
create or replace function public.enforce_living_opposed_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attacker_state text;
  v_target_state text;
begin
  select life_state::text
  into v_attacker_state
  from public.characters
  where id = new.attacker_character_id;

  select life_state::text
  into v_target_state
  from public.characters
  where id = new.target_character_id;

  if v_attacker_state <> 'alive' then
    raise exception
      'Dead or dying Characters cannot perform opposed Actions.';
  end if;

  if v_target_state = 'dead' then
    raise exception
      'Dead Characters cannot be targeted by attacks or opposed Attribute Actions.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_living_opposed_action
  on public.opposed_actions;

create trigger trg_living_opposed_action
before insert or update of attacker_character_id, target_character_id
on public.opposed_actions
for each row
execute function public.enforce_living_opposed_action();

-- Dead Character location messages are allowed only as Ghosts in configured rooms.
create or replace function public.enforce_dead_room_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_room_allowed boolean;
  v_ghost_chat boolean;
begin
  if new.character_id is null
     or coalesce(new.speaker_type::text, '') = 'system' then
    return new;
  end if;

  select life_state::text
  into v_state
  from public.characters
  where id = new.character_id;

  if v_state <> 'dead' then
    return new;
  end if;

  select allow_dead_ghosts
  into v_room_allowed
  from public.rooms
  where id = new.room_id;

  select ghost_chat_enabled
  into v_ghost_chat
  from public.character_death_rules
  where singleton = true;

  if coalesce(v_ghost_chat, true) is not true
     or coalesce(v_room_allowed, false) is not true then
    raise exception
      'Ghosts cannot speak in this Location.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_room_message
  on public.room_messages;

create trigger trg_dead_room_message
before insert or update of room_id, character_id, speaker_type
on public.room_messages
for each row
execute function public.enforce_dead_room_message();

-- Shape targets: dead Characters are valid only for healing during the Essence
-- Window, or for any Level IX Shape with a positive Other healing profile.
create or replace function public.enforce_dead_shape_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_died_at timestamptz;
  v_zero_hp_at timestamptz;
  v_window integer;
  v_level integer;
  v_choice text;
  v_heal_dice text;
  v_heal_attribute text;
  v_healing boolean;
begin
  if new.target_character_id is null then
    return new;
  end if;

  select life_state::text, died_at, zero_hp_at
  into v_state, v_died_at, v_zero_hp_at
  from public.characters
  where id = new.target_character_id;

  if v_state <> 'dead' then
    return new;
  end if;

  select
    s.level,
    coalesce(new.other_effect_choice, 'beneficial'),
    case
      when coalesce(new.other_effect_choice, 'beneficial') = 'harmful'
        then s.other_alt_heal_dice
      else s.other_heal_dice
    end,
    case
      when coalesce(new.other_effect_choice, 'beneficial') = 'harmful'
        then s.other_alt_heal_attribute
      else s.other_heal_attribute
    end
  into
    v_level,
    v_choice,
    v_heal_dice,
    v_heal_attribute
  from public.shape_casts sc
  join public.shapes s on s.id = sc.shape_id
  where sc.id = new.cast_id;

  v_healing :=
    (
      nullif(trim(coalesce(v_heal_dice, '')), '') is not null
      and left(trim(v_heal_dice), 1) <> '-'
    )
    or nullif(trim(coalesce(v_heal_attribute, '')), '') is not null;

  -- Any Level IX Shape with a positive Other healing profile is a Resurrection Shape.
  if v_level = 9 and v_healing then
    return new;
  end if;

  if not v_healing then
    raise exception
      'Only healing Shapes can target a dead Character during the Essence Window.';
  end if;

  select essence_window_minutes
  into v_window
  from public.character_death_rules
  where singleton = true;

  v_window := coalesce(v_window, 60);

  if coalesce(v_died_at, v_zero_hp_at) is null
     or now() >
       coalesce(v_died_at, v_zero_hp_at) +
       make_interval(mins => v_window) then
    raise exception
      'This Character''s essence has faded. Only a Level IX Resurrection Shape can target them now.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_shape_target
  on public.shape_cast_targets;

create trigger trg_dead_shape_target
before insert or update of target_character_id, cast_id, other_effect_choice
on public.shape_cast_targets
for each row
execute function public.enforce_dead_shape_target();

commit;
'''

# ---------------------------------------------------------------------------
# Create new files in memory after ALL validation above has passed.
# ---------------------------------------------------------------------------
new_files = {
    "lib/death/death-system.ts": death_system_ts,
    "app/(portal)/admin/death/actions.ts": admin_death_actions,
    "app/(portal)/admin/death/page.tsx": admin_death_page,
    "death_system_upgrade.sql": sql,
}

for path in new_files:
    target = ROOT / path
    if target.exists():
        existing = target.read_text(encoding="utf-8")
        if "SEPULCHRIA DEATH SYSTEM UPGRADE" in existing or "reviveDeadCharacter" in existing:
            fail(
                f"{path} already looks like this Death System patch has been applied."
            )
        fail(f"{path} already exists; refusing to overwrite an unrelated file.")

# ---------------------------------------------------------------------------
# Back up then write.
# ---------------------------------------------------------------------------
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_root = ROOT / f".death-system-backup-{stamp}"

for path, old_text in originals.items():
    if files[path] == old_text:
        continue
    backup_path = backup_root / path
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    backup_path.write_text(old_text, encoding="utf-8")

for path, text in files.items():
    if text == originals[path]:
        continue
    (ROOT / path).write_text(text, encoding="utf-8", newline="\n")

for path, text in new_files.items():
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8", newline="\n")

changed = [
    path for path in files if files[path] != originals[path]
] + list(new_files)

print("SUCCESS: Sepulchria Death System patch applied.")
print()
print("Changed/created:")
for path in changed:
    print(" -", path)
print()
print("Backup created at:")
print(" ", backup_root)
print()
print("IMPORTANT NEXT STEPS:")
print(" 1. Open death_system_upgrade.sql")
print(" 2. Run the entire SQL file once in Supabase SQL Editor")
print(" 3. Then run: npm run build")
print()
print("Do NOT run the app against the patched code before running the SQL migration,")
print("because the code expects the new death-system columns/tables.")
