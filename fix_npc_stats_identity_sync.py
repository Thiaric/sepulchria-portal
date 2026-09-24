from pathlib import Path
import sys

PATH = Path("app/(portal)/admin/characters/actions.ts")

OLD = """  if (isNpcCharacter) {
    const npcDisplayName =
      [firstName, surname]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      firstName;
const {
      error: npcSyncError,
    } = await admin
      .from("npcs")
      .update({
        name: npcDisplayName,
        pronouns,
        portrait_url: portraitUrl,
        description: physicalDescription,
        race_id: raceId,
        updated_by_user_id: staff.userId,
        updated_at: now,
      })
      .eq("character_id", characterId);

    if (npcSyncError) {
      throw new Error(
        `NPC Character saved, but its NPC identity could not be synchronised: ${npcSyncError.message}`,
      );
    }
  }"""

NEW = """  if (isNpcCharacter) {
    const {
      error: npcSyncError,
    } = await admin
      .from("npcs")
      .update({
        pronouns,
        portrait_url: portraitUrl,
        description: physicalDescription,
        race_id: raceId,
        updated_by_user_id: staff.userId,
        updated_at: now,
      })
      .eq("character_id", characterId);

    if (npcSyncError) {
      throw new Error(
        `NPC Character saved, but its NPC identity could not be synchronised: ${npcSyncError.message}`,
      );
    }
  }"""

def main():
    text = PATH.read_text(encoding="utf-8")
    count = text.count(OLD)

    if count != 1:
        raise RuntimeError(
            f"Expected exactly 1 NPC sync block, found {count}. No file was changed."
        )

    PATH.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
    print("Fixed NPC Stats & Feats identity sync.")
    print("Stats & Feats no longer writes npcs.name.")
    print("NPC Administration remains responsible for First name + Surname.")
    print("Now run: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
