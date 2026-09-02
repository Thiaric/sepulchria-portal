from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "bd75928"
TARGET = ROOT / "app/(portal)/messages/[id]/page.tsx"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

if not TARGET.exists():
    raise SystemExit(f"Missing target file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old_stage_one = '''  const staffSession =
    await getStaffSession();

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from(
      "direct_conversation_participants",
    )
    .select(
      "conversation_id, deleted_at",
    )
    .eq(
      "conversation_id",
      id,
    )
    .eq(
      "character_id",
      character.id,
    )
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      membershipError.message,
    );
  }

  if (
    !membership ||
    membership.deleted_at
  ) {
    notFound();
  }

  const {
    data: conversationMeta,
    error: conversationMetaError,
  } = await supabase
    .from("direct_conversations")
    .select("is_group, title")
    .eq("id", id)
    .maybeSingle();

  if (conversationMetaError) {
    throw new Error(
      conversationMetaError.message,
    );
  }
'''

new_stage_one = '''  const [
    staffSession,
    membershipResult,
    conversationMetaResult,
  ] = await Promise.all([
    getStaffSession(),

    supabase
      .from(
        "direct_conversation_participants",
      )
      .select(
        "conversation_id, deleted_at",
      )
      .eq(
        "conversation_id",
        id,
      )
      .eq(
        "character_id",
        character.id,
      )
      .maybeSingle(),

    supabase
      .from("direct_conversations")
      .select("is_group, title")
      .eq("id", id)
      .maybeSingle(),
  ]);

  const {
    data: membership,
    error: membershipError,
  } = membershipResult;

  if (membershipError) {
    throw new Error(
      membershipError.message,
    );
  }

  if (
    !membership ||
    membership.deleted_at
  ) {
    notFound();
  }

  const {
    data: conversationMeta,
    error: conversationMetaError,
  } = conversationMetaResult;

  if (conversationMetaError) {
    throw new Error(
      conversationMetaError.message,
    );
  }
'''

old_blocks = '''  const [
    blockedByMeResult,
    blockedMeResult,
  ] = await Promise.all([
    supabase
      .from(
        "character_blocks",
      )
      .select(
        "blocked_character_id",
      )
      .eq(
        "blocker_character_id",
        character.id,
      )
      .eq(
        "blocked_character_id",
        other.id,
      )
      .maybeSingle(),

    supabase
      .from(
        "character_blocks",
      )
      .select(
        "blocker_character_id",
      )
      .eq(
        "blocker_character_id",
        other.id,
      )
      .eq(
        "blocked_character_id",
        character.id,
      )
      .maybeSingle(),
  ]);

  if (
    blockedByMeResult.error
  ) {
    throw new Error(
      blockedByMeResult.error
        .message,
    );
  }

  if (blockedMeResult.error) {
    throw new Error(
      blockedMeResult.error
        .message,
    );
  }

  const blocked =
    Boolean(
      blockedByMeResult.data ||
        blockedMeResult.data,
    );
'''

new_blocks = '''  const {
    data: blockRows,
    error: blockError,
  } = await supabase
    .from(
      "character_blocks",
    )
    .select(
      "blocker_character_id, blocked_character_id",
    )
    .or(
      [
        `and(blocker_character_id.eq.${character.id},blocked_character_id.eq.${other.id})`,
        `and(blocker_character_id.eq.${other.id},blocked_character_id.eq.${character.id})`,
      ].join(","),
    );

  if (blockError) {
    throw new Error(
      blockError.message,
    );
  }

  const blocked =
    (blockRows ?? []).length > 0;
'''

checks = [
    (old_stage_one, "staff/membership/conversation metadata sequence"),
    (old_blocks, "two-direction block lookup"),
]

for old, label in checks:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly 1 match, found {count}. "
            "Nothing changed."
        )

new_text = text.replace(old_stage_one, new_stage_one, 1)
new_text = new_text.replace(old_blocks, new_blocks, 1)

TARGET.write_text(new_text, encoding="utf-8")

print("✓ Single-conversation loading optimized for bd75928")
print("  - changed only app/(portal)/messages/[id]/page.tsx")
print("  - staff session, membership check, and conversation metadata now load together")
print("  - two block-state queries replaced by one combined query")
print("  - message history size remains unchanged (still up to 1000)")
print("  - realtime, composer, archive/delete, group conversations, and UI are untouched")
