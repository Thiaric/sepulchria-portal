from pathlib import Path
import subprocess, sys

EXPECTED_HEAD = "84462c6"

def fail(msg):
    print("PATCH FAILED:", msg)
    sys.exit(1)

def git(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    if r.returncode:
        fail(r.stderr.strip() or "git failed")
    return r.stdout.strip()

def rep(text, old, new, label):
    c = text.count(old)
    if c != 1:
        fail(f"{label}: expected 1 match, found {c}")
    return text.replace(old, new, 1)

if git("rev-parse", "--short=7", "HEAD") != EXPECTED_HEAD:
    fail(f"Expected HEAD {EXPECTED_HEAD}")

root = Path.cwd()

# 1) app/(portal)/game/page.tsx
p = root / "app/(portal)/game/page.tsx"
t = p.read_text(encoding="utf-8")
t = rep(t,
'''      .select(`
        character_id,
        character:characters!character_presence_character_id_fkey(
''',
'''      .select(`
        character_id,
        appear_offline,
        character:characters!character_presence_character_id_fkey(
''', "page presence select")
t = rep(t,
'''        if (
          !relation ||
          relation.id ===
            character.id
        ) {
''',
'''        if (
          !relation ||
          relation.id ===
            character.id ||
          entry.appear_offline === true
        ) {
''', "page offline filter")
p.write_text(t, encoding="utf-8")

# 2) app/(portal)/game/components/RoomChatForm.tsx
p = root / "app/(portal)/game/components/RoomChatForm.tsx"
t = p.read_text(encoding="utf-8")
t = rep(t,
'''        .select(`
          character_id,
          character:characters!character_presence_character_id_fkey(
''',
'''        .select(`
          character_id,
          appear_offline,
          character:characters!character_presence_character_id_fkey(
''', "form presence select")
t = rep(t,
'''            if (!relation) {
              return null;
            }

            return {
''',
'''            if (
              !relation ||
              row.appear_offline === true
            ) {
              return null;
            }

            return {
''', "form offline filter")
p.write_text(t, encoding="utf-8")

# 3) app/(portal)/game/actions.ts
p = root / "app/(portal)/game/actions.ts"
t = p.read_text(encoding="utf-8")
t = rep(t,
'''    .from("character_presence")
    .select("character_id")
    .eq(
      "character_id",
      recipientId,
    )
''',
'''    .from("character_presence")
    .select("character_id, appear_offline")
    .eq(
      "character_id",
      recipientId,
    )
''', "whisper select")
t = rep(t,
'''  if (!presence) {
    return {
      ok: false,
      message:
        "That character is no longer present in this room.",
    };
  }
''',
'''  if (
    !presence ||
    presence.appear_offline === true
  ) {
    return {
      ok: false,
      message:
        "That character is no longer present in this room.",
    };
  }
''', "whisper validate")
t = rep(t,
'''      .from("character_presence")
      .select("character_id")
      .eq("character_id", requestedTargetId)
''',
'''      .from("character_presence")
      .select("character_id, appear_offline")
      .eq("character_id", requestedTargetId)
''', "feat select")
t = rep(t,
'''  if (!presence) {
    throw new Error(
      "That character is no longer present in this Location.",
    );
  }
''',
'''  if (
    !presence ||
    presence.appear_offline === true
  ) {
    throw new Error(
      "That character is no longer present in this Location.",
    );
  }
''', "feat validate")
t = rep(t,
'''      const { data: presence } = await supabase
        .from("character_presence")
        .select("character_id")
        .eq("character_id", targetCharacterId)
''',
'''      const { data: presence } = await supabase
        .from("character_presence")
        .select("character_id, appear_offline")
        .eq("character_id", targetCharacterId)
''', "item select")
t = rep(t,
'''      if (!presence) {
        return {
          ok: false,
          message: "That character is no longer present in this room.",
        };
      }
''',
'''      if (
        !presence ||
        presence.appear_offline === true
      ) {
        return {
          ok: false,
          message: "That character is no longer present in this room.",
        };
      }
''', "item validate")
p.write_text(t, encoding="utf-8")

# 4) app/(portal)/game/opposed-actions.ts
p = root / "app/(portal)/game/opposed-actions.ts"
t = p.read_text(encoding="utf-8")
t = rep(t,
'''  if (data.is_system) {
    const {
      data: npc,
      error: npcError,
    } = await admin
      .from("npcs")
      .select("id")
      .eq("character_id", data.id)
      .eq("current_room_id", roomId)
      .eq("is_active", true)
      .eq("is_location_active", true)
      .maybeSingle();

    if (npcError || !npc) {
      throw new Error(
        npcError?.message ??
          "That NPC is not active in this Location.",
      );
    }
  }

  if (data.life_state === "dead") {
''',
'''  if (data.is_system) {
    const {
      data: npc,
      error: npcError,
    } = await admin
      .from("npcs")
      .select("id")
      .eq("character_id", data.id)
      .eq("current_room_id", roomId)
      .eq("is_active", true)
      .eq("is_location_active", true)
      .maybeSingle();

    if (npcError || !npc) {
      throw new Error(
        npcError?.message ??
          "That NPC is not active in this Location.",
      );
    }
  } else {
    const activeSince = new Date(
      Date.now() - 5 * 60_000,
    ).toISOString();

    const {
      data: presence,
      error: presenceError,
    } = await admin
      .from("character_presence")
      .select("character_id, appear_offline")
      .eq("character_id", data.id)
      .eq("room_id", roomId)
      .gte("last_seen_at", activeSince)
      .maybeSingle();

    if (
      presenceError ||
      !presence ||
      presence.appear_offline === true
    ) {
      throw new Error(
        presenceError?.message ??
          "That Character is not available at this Location.",
      );
    }
  }

  if (data.life_state === "dead") {
''', "opposed offline validate")
p.write_text(t, encoding="utf-8")

print("PATCH APPLIED SUCCESSFULLY")
print("Changed:")
print("  app/(portal)/game/page.tsx")
print("  app/(portal)/game/components/RoomChatForm.tsx")
print("  app/(portal)/game/actions.ts")
print("  app/(portal)/game/opposed-actions.ts")
print("No Supabase schema change required.")
print("Run: npm run build")
