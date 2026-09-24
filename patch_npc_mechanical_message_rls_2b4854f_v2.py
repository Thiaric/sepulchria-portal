from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "2b4854f"

FILES = {
    "app/(portal)/game/opposed-actions.ts",
    "app/(portal)/game/warping-actions.ts",
    "app/(portal)/game/feat-mechanics-actions.ts",
    "app/(portal)/game/actions.ts",
}

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

def main():
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        text=True,
    ).strip()

    if head != EXPECTED_HEAD:
        raise RuntimeError(
            f"This patch was built for {EXPECTED_HEAD}, but your current HEAD is {head}. "
            "No files were changed."
        )

    changed = {
        path: Path(path).read_text(encoding="utf-8")
        for path in FILES
    }

    # --------------------------------------------------------------
    # opposed-actions.ts
    # --------------------------------------------------------------
    path = "app/(portal)/game/opposed-actions.ts"
    text = changed[path]

    text = replace_once(
        text,
        '''async function roomMessage(
  roomId: string,
  characterId: string,
  message: string,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("room_messages")
    .insert({
      room_id: roomId,
      character_id: characterId,
      message,
      message_type: "action",
      client_nonce: crypto.randomUUID(),
    });

  if (error) {
    throw new Error(error.message);
  }
}''',
        '''async function roomMessage(
  roomId: string,
  characterId: string,
  message: string,
) {
  const supabase = await createClient();
  const admin = privilegedClient();

  const {
    data: npcActor,
    error: npcActorError,
  } = await admin
    .from("npcs")
    .select("id")
    .eq("character_id", characterId)
    .eq("current_room_id", roomId)
    .eq("is_active", true)
    .eq("is_location_active", true)
    .maybeSingle();

  if (npcActorError) {
    throw new Error(
      `Unable to verify NPC room-message actor: ${npcActorError.message}`,
    );
  }

  const messageClient =
    npcActor
      ? admin
      : supabase;

  const { error } = await messageClient
    .from("room_messages")
    .insert({
      room_id: roomId,
      character_id: characterId,
      message,
      message_type: "action",
      client_nonce: crypto.randomUUID(),
    });

  if (error) {
    throw new Error(error.message);
  }
}''',
        "opposed-actions roomMessage",
    )

    changed[path] = text

    # --------------------------------------------------------------
    # warping-actions.ts
    # --------------------------------------------------------------
    path = "app/(portal)/game/warping-actions.ts"
    text = changed[path]

    text = replace_once(
        text,
        '''async function message(room:string,cid:string,text:string){const db=await createClient();const q=await db.from("room_messages").insert({room_id:room,character_id:cid,message:text,message_type:"action",client_nonce:crypto.randomUUID()});if(q.error)throw Error(q.error.message)}''',
        '''async function message(room:string,cid:string,text:string){
 const db=await createClient(),a=admin();
 const npc=await a.from("npcs").select("id").eq("character_id",cid).eq("current_room_id",room).eq("is_active",true).eq("is_location_active",true).maybeSingle();
 if(npc.error)throw Error(`Unable to verify NPC room-message actor: ${npc.error.message}`);
 const writer=npc.data?a:db;
 const q=await writer.from("room_messages").insert({room_id:room,character_id:cid,message:text,message_type:"action",client_nonce:crypto.randomUUID()});
 if(q.error)throw Error(q.error.message)
}''',
        "warping message helper",
    )

    changed[path] = text

    # --------------------------------------------------------------
    # feat-mechanics-actions.ts
    # --------------------------------------------------------------
    path = "app/(portal)/game/feat-mechanics-actions.ts"
    text = changed[path]

    text = replace_once(
        text,
        '''    const messageInsert = await supabase
      .from("room_messages")
      .insert({
        room_id: character.current_room_id,
        character_id: character.id,
        message: messageParts.join(" · "),
        message_type: "action",
        client_nonce: crypto.randomUUID(),
      });''',
        '''    const messageClient =
      npcActorId
        ? admin
        : supabase;

    const messageInsert = await messageClient
      .from("room_messages")
      .insert({
        room_id: character.current_room_id,
        character_id: character.id,
        message: messageParts.join(" · "),
        message_type: "action",
        client_nonce: crypto.randomUUID(),
      });''',
        "feat mechanics room announcement",
    )

    changed[path] = text

    # --------------------------------------------------------------
    # actions.ts
    # --------------------------------------------------------------
    path = "app/(portal)/game/actions.ts"
    text = changed[path]

    text = replace_once(
        text,
        '''async function insertGiftUseMessage({
  supabase,
  characterId,
  roomId,
  giftName,
  giftDescription,
  effectMode,
  durationMinutes,
  target,
  effectSummary,
}: {''',
        '''async function getRoomMessageInsertClient(
  supabase: SupabaseClient,
  characterId: string,
  roomId: string,
): Promise<SupabaseClient> {
  const admin =
    createPrivilegedClient();

  const {
    data: npcActor,
    error: npcActorError,
  } = await admin
    .from("npcs")
    .select("id")
    .eq("character_id", characterId)
    .eq("current_room_id", roomId)
    .eq("is_active", true)
    .eq("is_location_active", true)
    .maybeSingle();

  if (npcActorError) {
    throw new Error(
      `Unable to verify NPC room-message actor: ${npcActorError.message}`,
    );
  }

  return npcActor
    ? (admin as unknown as SupabaseClient)
    : supabase;
}

async function insertGiftUseMessage({
  supabase,
  characterId,
  roomId,
  giftName,
  giftDescription,
  effectMode,
  durationMinutes,
  target,
  effectSummary,
}: {''',
        "actions helper insertion",
    )

    text = replace_once(
        text,
        '''  const { error } = await supabase
    .from("room_messages")
    .insert({
      room_id: roomId,
      character_id: characterId,
      message:
        `◆ used "${giftName}" on ${
          target.isSelf ? "self" : target.displayName
        } · ${description}${suffix ? ` · ${suffix}` : ""}`,
      message_type: "action",
      client_nonce: crypto.randomUUID(),
    });''',
        '''  const messageClient =
    await getRoomMessageInsertClient(
      supabase,
      characterId,
      roomId,
    );

  const { error } = await messageClient
    .from("room_messages")
    .insert({
      room_id: roomId,
      character_id: characterId,
      message:
        `◆ used "${giftName}" on ${
          target.isSelf ? "self" : target.displayName
        } · ${description}${suffix ? ` · ${suffix}` : ""}`,
      message_type: "action",
      client_nonce: crypto.randomUUID(),
    });''',
        "Feat room announcement",
    )

    text = replace_once(
        text,
        '''    const clientNonce =
      readValidNonce(formData);

    const { error } = await supabase
      .from("room_messages")
      .insert({
        room_id:
          character.current_room_id,
        character_id:
          character.id,
        message:
          `◆ ${definition.label} · d20(${result}) + ${attributeLabel}(+${attributeValue}) = ${total}`,''',
        '''    const clientNonce =
      readValidNonce(formData);

    const messageClient =
      await getRoomMessageInsertClient(
        supabase,
        character.id,
        character.current_room_id,
      );

    const { error } = await messageClient
      .from("room_messages")
      .insert({
        room_id:
          character.current_room_id,
        character_id:
          character.id,
        message:
          `◆ ${definition.label} · d20(${result}) + ${attributeLabel}(+${attributeValue}) = ${total}`,''',
        "Attribute room announcement",
    )

    text = replace_once(
        text,
        '''    const { supabase, character } = await getOwnedCharacter({
        actorCharacterId: String(formData.get("npc_actor_character_id") ?? "").trim() || null,
      });

    if (!character.current_room_id) {
      return {
        ok: false,
        message: "Your character has no current room.",
      };
    }

    let itemId: string | null = null;''',
        '''    const npcActorId =
      String(
        formData.get(
          "npc_actor_character_id",
        ) ?? "",
      ).trim();

    const { supabase, character } = await getOwnedCharacter({
        actorCharacterId: npcActorId || null,
      });

    if (!character.current_room_id) {
      return {
        ok: false,
        message: "Your character has no current room.",
      };
    }

    const roomMessageClient =
      await getRoomMessageInsertClient(
        supabase,
        character.id,
        character.current_room_id,
      );

    let itemId: string | null = null;''',
        "useRoomItem actor/message client",
    )

    text = replace_once(
        text,
        '''    const npcActorId = String(
      formData.get("npc_actor_character_id") ?? "",
    ).trim();

    const rpcResult = npcActorId''',
        '''    const rpcResult = npcActorId''',
        "remove duplicate useRoomItem npcActorId",
    )

    # Replace the three exact Item announcement call sites individually.
    text = replace_once(
        text,
        '''      const { error: messageError } = await supabase
        .from("room_messages")
        .insert({''',
        '''      const { error: messageError } = await roomMessageClient
        .from("room_messages")
        .insert({''',
        "opposed Item announcement",
    )

    text = replace_once(
        text,
        '''      const { error: failedMessageError } = await supabase
        .from("room_messages")
        .insert({''',
        '''      const { error: failedMessageError } = await roomMessageClient
        .from("room_messages")
        .insert({''',
        "failed Item announcement",
    )

    # This same variable name occurs twice in useRoomItem, so replace only
    # the LAST remaining matching messageError occurrence.
    old_success = '''    const { error: messageError } = await supabase
      .from("room_messages")
      .insert({'''
    new_success = '''    const { error: messageError } = await roomMessageClient
      .from("room_messages")
      .insert({'''

    count = text.count(old_success)
    if count != 1:
        raise RuntimeError(
            f"successful Item announcement: expected exactly 1 match, found {count}"
        )
    text = text.replace(old_success, new_success, 1)

    changed[path] = text

    # --------------------------------------------------------------
    # Verification before writes
    # --------------------------------------------------------------
    required = {
        "app/(portal)/game/opposed-actions.ts": [
            "Unable to verify NPC room-message actor",
            "const messageClient =",
        ],
        "app/(portal)/game/warping-actions.ts": [
            "const writer=npc.data?a:db;",
        ],
        "app/(portal)/game/feat-mechanics-actions.ts": [
            "const messageInsert = await messageClient",
        ],
        "app/(portal)/game/actions.ts": [
            "async function getRoomMessageInsertClient(",
            "const roomMessageClient =",
            "failedMessageError } = await roomMessageClient",
            "messageError } = await roomMessageClient",
        ],
    }

    for file_path, tokens in required.items():
        for token in tokens:
            if token not in changed[file_path]:
                raise RuntimeError(
                    f"Verification failed for {file_path}: missing {token!r}. No files were changed."
                )

    for file_path, content in changed.items():
        Path(file_path).write_text(content, encoding="utf-8")

    print("Applied NPC mechanical room-message RLS fix.")
    print("Changed:")
    for file_path in sorted(FILES):
        print(f" - {file_path}")
    print()
    print("No Supabase SQL changes are required.")
    print("Now run: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
