#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/game/actions.ts"
BACKUP = ROOT / ".patch_backups" / "fix_npc_presence_rls_actions.ts"

OLD = r'''async function touchPresence(
  supabase: SupabaseClient,
  characterId: string,
  roomId: string | null,
): Promise<void> {
  const now = new Date().toISOString();

  const { data: updatedPresence, error: updateError } = await supabase
    .from("character_presence")
    .update({
      room_id: roomId,
      last_seen_at: now,
    })
    .eq("character_id", characterId)
    .select("character_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Unable to refresh presence: ${updateError.message}`);
  }

  if (updatedPresence) {
    return;
  }

  const { error: insertError } = await supabase
    .from("character_presence")
    .insert({
      character_id: characterId,
      room_id: roomId,
      status: "online",
      manual_status: "online",
      last_seen_at: now,
    });

  if (insertError && insertError.code !== "23505") {
    throw new Error(`Unable to create presence: ${insertError.message}`);
  }

  if (insertError?.code === "23505") {
    const { error: retryError } = await supabase
      .from("character_presence")
      .update({
        room_id: roomId,
        last_seen_at: now,
      })
      .eq("character_id", characterId);

    if (retryError) {
      throw new Error(`Unable to refresh presence: ${retryError.message}`);
    }
  }
}'''

NEW = r'''async function touchPresence(
  supabase: SupabaseClient,
  characterId: string,
  roomId: string | null,
): Promise<void> {
  const now = new Date().toISOString();

  /*
   * NPC mechanics run through a hidden system Character.
   * The authenticated player's Supabase client cannot insert/update
   * character_presence for that system Character because RLS correctly
   * treats it as another character.
   *
   * Detect only that NPC-backed system-Character case and use the
   * existing privileged server client for the presence heartbeat.
   * Ordinary Characters keep using the authenticated client exactly
   * as before.
   */
  const admin = createPrivilegedClient();

  const npcCheck = await admin
    .from("npcs")
    .select("id")
    .eq("character_id", characterId)
    .eq("is_active", true)
    .maybeSingle();

  if (npcCheck.error) {
    throw new Error(
      `Unable to verify NPC presence actor: ${npcCheck.error.message}`,
    );
  }

  const presenceClient: SupabaseClient =
    npcCheck.data
      ? (admin as unknown as SupabaseClient)
      : supabase;

  const { data: updatedPresence, error: updateError } = await presenceClient
    .from("character_presence")
    .update({
      room_id: roomId,
      last_seen_at: now,
    })
    .eq("character_id", characterId)
    .select("character_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Unable to refresh presence: ${updateError.message}`);
  }

  if (updatedPresence) {
    return;
  }

  const { error: insertError } = await presenceClient
    .from("character_presence")
    .insert({
      character_id: characterId,
      room_id: roomId,
      status: "online",
      manual_status: "online",
      last_seen_at: now,
    });

  if (insertError && insertError.code !== "23505") {
    throw new Error(`Unable to create presence: ${insertError.message}`);
  }

  if (insertError?.code === "23505") {
    const { error: retryError } = await presenceClient
      .from("character_presence")
      .update({
        room_id: roomId,
        last_seen_at: now,
      })
      .eq("character_id", characterId);

    if (retryError) {
      throw new Error(`Unable to refresh presence: ${retryError.message}`);
    }
  }
}'''

def head():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            text=True,
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return "unknown"

if not TARGET.exists():
    raise SystemExit(f"ERROR: missing {TARGET}")

text = TARGET.read_text(encoding="utf-8")
count = text.count(OLD)

print(f"Current HEAD: {head()}")

if count != 1:
    raise SystemExit(
        f"ERROR: expected exactly 1 untouched touchPresence block, found {count}. "
        "No files changed."
    )

BACKUP.parent.mkdir(parents=True, exist_ok=True)
if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)
    print(f"Backup created: {BACKUP}")
else:
    print(f"Backup already exists: {BACKUP}")

TARGET.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
print(f"Patched: {TARGET}")
print("Done. Nothing committed or pushed.")
print("Now run: npm run build")
