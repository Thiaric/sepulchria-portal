from pathlib import Path
import subprocess
import sys
from datetime import datetime

ROOT = Path.cwd()
EXPECTED = "7ee6361551d1afd9f8374335809ebe8fd6d61706"

def fail(msg):
    print("ERROR:", msg)
    print("No files were changed.")
    sys.exit(1)

try:
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
except Exception as exc:
    fail(f"Unable to read git HEAD: {exc}")

if head != EXPECTED:
    fail(f"This patch targets {EXPECTED}, current HEAD is {head}.")

paths = [
    "lib/death/death-system.ts",
    "app/(portal)/game/components/RoomChatForm.tsx",
    "app/(portal)/game/components/RoomMessageList.tsx",
    "types/game.ts",
    "app/(portal)/character/page.tsx",
    "components/characters/public-character-profile.tsx",
    "app/(portal)/admin/death/page.tsx",
]

for path in paths:
    if not (ROOT / path).exists():
        fail(f"Missing expected file: {path}")

files = {p: (ROOT / p).read_text(encoding="utf-8") for p in paths}
originals = dict(files)

def repl(path, old, new, label):
    text = files[path]
    if old in text:
        files[path] = text.replace(old, new, 1)
        return
    if new in text:
        return
    fail(f"{label}: expected source fragment not found in {path}.")

# ------------------------------------------------------------------
# 1. Ghost movement: allow movement anywhere normal rules permit.
# ------------------------------------------------------------------
repl(
    "lib/death/death-system.ts",
'''  const admin = createAdminClient();
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
''',
'''  // Ghost-enabled Locations control chat only.
  // Movement follows normal Location/private-access rules.
  void destinationRoomId;
''',
    "ghost movement",
)

repl(
    "app/(portal)/admin/death/page.tsx",
'''            A dead Character may enter and write in Location chat only where Ghosts are allowed.''',
'''            These flags control Ghost Location chat only. Ghosts may move normally anywhere they otherwise have access to.''',
    "ghost admin copy",
)

# ------------------------------------------------------------------
# 2. True system room messages: no character author.
# ------------------------------------------------------------------
repl(
    "lib/death/death-system.ts",
'''      character_id: characterId,
      message,
      message_type: "action",
      speaker_type: "system",''',
'''      character_id: null,
      message,
      message_type: "action",
      speaker_type: "system",''',
    "system room message author",
)

# ------------------------------------------------------------------
# 3. Cancel pending actions/reactions at death.
# ------------------------------------------------------------------
old = '''  const announcement =
    rules.deathAnnouncementTemplate'''
new = '''  // Death ends all unresolved mechanics involving this Character.
  const opposedCancel = await admin
    .from("opposed_actions")
    .update({
      status: "expired",
      resolved_at: nowIso,
    })
    .eq("status", "pending")
    .or(
      `attacker_character_id.eq.${characterId},target_character_id.eq.${characterId}`,
    );

  if (opposedCancel.error) {
    throw new Error(
      `Unable to cancel pending opposed Actions: ${opposedCancel.error.message}`,
    );
  }

  const incomingShapeCancel = await admin
    .from("shape_cast_targets")
    .update({
      response: "death_cancelled",
      outcome: "saved",
      resolved_at: nowIso,
    })
    .eq("target_character_id", characterId)
    .eq("outcome", "pending");

  if (incomingShapeCancel.error) {
    throw new Error(
      `Unable to cancel pending Shape responses: ${incomingShapeCancel.error.message}`,
    );
  }

  const castRows = await admin
    .from("shape_casts")
    .select("id")
    .eq("caster_character_id", characterId);

  if (castRows.error) {
    throw new Error(
      `Unable to load pending Shape casts: ${castRows.error.message}`,
    );
  }

  const castIds = (castRows.data ?? []).map((row) => row.id);

  if (castIds.length) {
    const outgoingShapeCancel = await admin
      .from("shape_cast_targets")
      .update({
        response: "death_cancelled",
        outcome: "saved",
        resolved_at: nowIso,
      })
      .in("cast_id", castIds)
      .eq("outcome", "pending");

    if (outgoingShapeCancel.error) {
      throw new Error(
        `Unable to cancel pending Shape targets: ${outgoingShapeCancel.error.message}`,
      );
    }

    await admin
      .from("shape_casts")
      .update({ dispel_effect_id: null })
      .in("id", castIds)
      .not("dispel_effect_id", "is", null);
  }

  await admin
    .from("shape_casts")
    .update({ dispel_effect_id: null })
    .eq("dispel_target_character_id", characterId)
    .not("dispel_effect_id", "is", null);

  const announcement =
    rules.deathAnnouncementTemplate'''
repl("lib/death/death-system.ts", old, new, "cancel pending mechanics")

# ------------------------------------------------------------------
# 4. Resurrection audit event.
# ------------------------------------------------------------------
old = '''  const malusText = malus
    ? ` The journey beyond their lingering essence has left its mark: ${malus.name} — ${malus.description}`
    : "";

  await announceSystemMessage({'''
new = '''  const { error: auditError } = await admin
    .from("character_audit_log")
    .insert({
      character_id: characterId,
      event_type: "character_resurrected",
      entity_type: "character",
      entity_id: characterId,
      operation: "event",
      actor_user_id: null,
      actor_type: "system",
      actor_staff_role: null,
      actor_label: "The Current",
      source: "death_system",
      changed_fields: [],
      old_values: null,
      new_values: {
        summary: `${character.display_name} was resurrected.`,
        revival_source: source,
        delayed_resurrection: delayed,
        health_after_resurrection: revivedHealth,
        resurrection_malus: malus?.name ?? null,
      },
      metadata: {
        death_event_id: deathEvent?.id ?? null,
      },
    });

  if (auditError) {
    throw new Error(
      `Unable to write Resurrection Character Log: ${auditError.message}`,
    );
  }

  const malusText = malus
    ? ` The journey beyond their lingering essence has left its mark: ${malus.name} — ${malus.description}`
    : "";

  await announceSystemMessage({'''
repl("lib/death/death-system.ts", old, new, "resurrection audit log")

# ------------------------------------------------------------------
# 5. Room message types + system rendering.
# ------------------------------------------------------------------
repl(
    "types/game.ts",
'''  character_id: string;
  condition_snapshot: RoomConditionSnapshot[];
  speaker_type: "character" | "npc";''',
'''  character_id: string | null;
  condition_snapshot: RoomConditionSnapshot[];
  speaker_type: "character" | "npc" | "system";''',
    "RoomMessage type",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''  character_id: string;
  message: string;''',
'''  character_id: string | null;
  message: string;''',
    "InsertedRoomMessage character id",
)
repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''  speaker_type: "character" | "npc";''',
'''  speaker_type: "character" | "npc" | "system";''',
    "InsertedRoomMessage speaker type",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''          ] = await Promise.all([
            supabase
              .from("characters")
              .select(`''',
'''          ] = await Promise.all([
            inserted.character_id
              ? supabase
              .from("characters")
              .select(`''',
    "system realtime author query start",
)
repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''              .maybeSingle(),

            inserted
              .whisper_recipient_character_id''',
'''              .maybeSingle()
              : Promise.resolve({
                  data: null,
                  error: null,
                }),

            inserted
              .whisper_recipient_character_id''',
    "system realtime author query end",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''                if (
                  item.message_type ===
                  "fate"
                ) {''',
'''                if (
                  item.speaker_type ===
                  "system"
                ) {
                  return (
                    <article
                      key={item.id}
                      data-room-message-kind="system"
                      className="border-y border-[rgb(var(--sep-colour-8a6637))]/45 bg-[rgb(var(--sep-colour-21170f))]/75 px-5 py-3 sm:px-7"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-c99b58))]">
                          The Current
                        </span>
                        <time
                          dateTime={item.created_at}
                          className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776b5b))]"
                        >
                          {time}
                        </time>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap break-words font-serif text-[13px] leading-5 text-[rgb(var(--sep-colour-d9c39a))]">
                        {item.message.replace(/^◆\\s*/, "")}
                      </p>
                    </article>
                  );
                }

                if (
                  item.message_type ===
                  "fate"
                ) {''',
    "system room message render",
)

# ------------------------------------------------------------------
# 6. Chat resurrection malus tags.
# ------------------------------------------------------------------
repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''const [messageEffectConditions,setMessageEffectConditions]=useState<
  Record<string,string[]>
>({});

const [shapeIdsByName, setShapeIdsByName] =''',
'''const [messageEffectConditions,setMessageEffectConditions]=useState<
  Record<string,string[]>
>({});

const [resurrectionMaluses,setResurrectionMaluses]=useState<
  Record<string,{name:string;description:string}>
>({});

const [shapeIdsByName, setShapeIdsByName] =''',
    "chat malus state",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadMessageEffectConditions() {''',
'''  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadResurrectionMaluses() {
      const ids = Array.from(
        new Set(
          liveMessages
            .map((message) => message.character_id)
            .filter(Boolean),
        ),
      ) as string[];

      if (!ids.length) {
        if (active) setResurrectionMaluses({});
        return;
      }

      const { data, error } = await supabase
        .from("character_resurrection_maluses")
        .select(`
          character_id,
          narrative_text,
          malus:death_resurrection_maluses(name,description)
        `)
        .in("character_id", ids)
        .is("cleared_at", null)
        .order("applied_at", { ascending: false });

      if (error) {
        console.error(
          "Unable to load Resurrection Maluses:",
          error.message,
        );
        return;
      }

      if (!active) return;

      const next: Record<string,{name:string;description:string}> = {};

      for (const row of data ?? []) {
        const id = String(row.character_id ?? "");
        if (!id || next[id]) continue;

        const relation = Array.isArray(row.malus)
          ? row.malus[0] ?? null
          : row.malus;

        next[id] = {
          name: String(relation?.name ?? "Resurrection Scar"),
          description: String(
            row.narrative_text ??
            relation?.description ??
            "",
          ),
        };
      }

      setResurrectionMaluses(next);
    }

    void loadResurrectionMaluses();

    const malusChannel = supabase
      .channel(`resurrection-maluses-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_resurrection_maluses",
        },
        () => void loadResurrectionMaluses(),
      )
      .subscribe();

    const malusTimer = window.setInterval(
      () => void loadResurrectionMaluses(),
      30000,
    );

    async function loadMessageEffectConditions() {''',
    "chat malus loader",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''    return () => {
      active = false;
    };
  }, [messageIdsKey, liveMessages]);''',
'''    return () => {
      active = false;
      window.clearInterval(malusTimer);
      void supabase.removeChannel(malusChannel);
    };
  }, [messageIdsKey, liveMessages]);''',
    "chat malus loader cleanup",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''  function conditionSnapshotHeaderText(
    snapshot:''',
'''  function resurrectionMalusHeaderText(
    characterId: string,
    metadataColour?: string,
  ) {
    const malus = resurrectionMaluses[characterId];
    if (!malus) return null;

    return (
      <span
        title={malus.description}
        className="text-[9px] tracking-[.04em] text-[rgb(var(--sep-colour-c98b71))] underline decoration-dotted underline-offset-2"
        style={metadataColour ? { color: metadataColour } : undefined}
      >
        {" | "}
        {malus.name}
      </span>
    );
  }

  function conditionSnapshotHeaderText(
    snapshot:''',
    "chat malus renderer",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''                          {!isNpcMessage && author
                            ? shapeTagHeaderText(
                                author.id,
                                privateLocationTheme
                                  ? privateLocationTheme.offgameTextColour
                                  : "rgb(var(--sep-colour-d3c2aa))",
                              )
                            : null}

                          {conditionSnapshotHeaderText(''',
'''                          {!isNpcMessage && author
                            ? shapeTagHeaderText(
                                author.id,
                                privateLocationTheme
                                  ? privateLocationTheme.offgameTextColour
                                  : "rgb(var(--sep-colour-d3c2aa))",
                              )
                            : null}

                          {!isNpcMessage && author
                            ? resurrectionMalusHeaderText(
                                author.id,
                                privateLocationTheme
                                  ? privateLocationTheme.offgameTextColour
                                  : "rgb(var(--sep-colour-d3c2aa))",
                              )
                            : null}

                          {conditionSnapshotHeaderText(''',
    "chat malus whisper/OOC",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
'''                      {!isNpcMessage && author
                        ? shapeTagHeaderText(author.id)
                        : null}

                      {!isNpcMessage
                        ? conditionSnapshotHeaderText(''',
'''                      {!isNpcMessage && author
                        ? shapeTagHeaderText(author.id)
                        : null}

                      {!isNpcMessage && author
                        ? resurrectionMalusHeaderText(author.id)
                        : null}

                      {!isNpcMessage
                        ? conditionSnapshotHeaderText(''',
    "chat malus normal",
)

# ------------------------------------------------------------------
# 7. Full malus block on own/public character sheet.
# ------------------------------------------------------------------
component_path = "components/characters/character-resurrection-malus.tsx"
if (ROOT / component_path).exists():
    fail(f"{component_path} already exists.")

component = r'''"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CharacterResurrectionMalus({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [malus, setMalus] = useState<{
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("character_resurrection_maluses")
        .select(`
          narrative_text,
          malus:death_resurrection_maluses(name,description)
        `)
        .eq("character_id", characterId)
        .is("cleared_at", null)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "Unable to load Resurrection Malus:",
          error.message,
        );
        return;
      }

      if (!active) return;

      if (!data) {
        setMalus(null);
        return;
      }

      const relation = Array.isArray(data.malus)
        ? data.malus[0] ?? null
        : data.malus;

      setMalus({
        name: String(relation?.name ?? "Resurrection Scar"),
        description: String(
          data.narrative_text ??
          relation?.description ??
          "",
        ),
      });
    }

    void load();

    const channel = supabase
      .channel(`character-resurrection-malus-${characterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_resurrection_maluses",
          filter: `character_id=eq.${characterId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [characterId, supabase]);

  if (!malus) return null;

  return (
    <section className="mt-4 border border-[rgb(var(--sep-colour-754137))]/45 bg-[rgb(var(--sep-colour-2b1714))]/55 p-4">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-d28e82))]">
        Resurrection Malus
      </p>
      <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e0c39a))]">
        {malus.name}
      </h3>
      <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-bc9d91))]">
        {malus.description}
      </p>
      <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-88756c))]">
        Lasting narrative scar · remains until changed or cleared by staff
      </p>
    </section>
  );
}
'''

repl(
    "app/(portal)/character/page.tsx",
'''import { CharacterMasterNotes } from "@/components/characters/character-master-notes";''',
'''import { CharacterMasterNotes } from "@/components/characters/character-master-notes";
import { CharacterResurrectionMalus } from "@/components/characters/character-resurrection-malus";''',
    "own sheet malus import",
)

repl(
    "app/(portal)/character/page.tsx",
'''                <CharacterMasterNotes
                  notes={character.master_notes}
                  expiresAt={
                    character.master_notes_expires_at
                  }
                />''',
'''                <CharacterMasterNotes
                  notes={character.master_notes}
                  expiresAt={
                    character.master_notes_expires_at
                  }
                />

                <CharacterResurrectionMalus
                  characterId={character.id!}
                />''',
    "own sheet malus block",
)

repl(
    "components/characters/public-character-profile.tsx",
'''import { CharacterMasterNotes } from "@/components/characters/character-master-notes";''',
'''import { CharacterMasterNotes } from "@/components/characters/character-master-notes";
import { CharacterResurrectionMalus } from "@/components/characters/character-resurrection-malus";''',
    "public sheet malus import",
)

repl(
    "components/characters/public-character-profile.tsx",
'''              <CharacterMasterNotes
                notes={character.master_notes}
                expiresAt={
                  character.master_notes_expires_at
                }
              />''',
'''              <CharacterMasterNotes
                notes={character.master_notes}
                expiresAt={
                  character.master_notes_expires_at
                }
              />

              <CharacterResurrectionMalus
                characterId={character.id}
              />''',
    "public sheet malus block",
)

# ------------------------------------------------------------------
# 8. Live dead-state UI + auto-disable.
# ------------------------------------------------------------------
repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
'''  const gameChatRestriction=useSanctionCapability("game_chat");

  const exchangeSupabase =''',
'''  const gameChatRestriction=useSanctionCapability("game_chat");

  const [viewerDead, setViewerDead] = useState(false);
  const [ghostChatAllowed, setGhostChatAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function refreshDeathUi() {
      const [characterResult, roomResult] = await Promise.all([
        supabase
          .from("characters")
          .select("life_state")
          .eq("id", viewerCharacterId)
          .maybeSingle(),
        supabase
          .from("rooms")
          .select("allow_dead_ghosts")
          .eq("id", roomId)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (!characterResult.error) {
        setViewerDead(
          characterResult.data?.life_state === "dead",
        );
      }

      if (!roomResult.error) {
        setGhostChatAllowed(
          roomResult.data?.allow_dead_ghosts === true,
        );
      }
    }

    void refreshDeathUi();

    const channel = supabase
      .channel(`death-ui-${viewerCharacterId}-${roomId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "characters",
          filter: `id=eq.${viewerCharacterId}`,
        },
        () => void refreshDeathUi(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        () => void refreshDeathUi(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [viewerCharacterId, roomId]);

  useEffect(() => {
    if (!viewerDead) return;

    if (
      utilityMode === "whisper" ||
      utilityMode === "attributes" ||
      utilityMode === "feat" ||
      utilityMode === "items" ||
      utilityMode === "warping"
    ) {
      setUtilityMode(null);
    }
  }, [viewerDead, utilityMode]);

  const exchangeSupabase =''',
    "room dead UI state",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
'''    if (utilityLoadingMode) return;

    if (utilityMode === mode) {''',
'''    if (utilityLoadingMode) return;

    if (
      viewerDead &&
      (
        mode === "whisper" ||
        mode === "attributes" ||
        mode === "feat" ||
        mode === "items" ||
        mode === "warping"
      )
    ) {
      return;
    }

    if (utilityMode === mode) {''',
    "dead utility guard",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
'''              ref={textareaRef}
              name="message"
              required
              maxLength={CHAT_MAX_LENGTH}''',
'''              ref={textareaRef}
              name="message"
              required
              disabled={viewerDead && !ghostChatAllowed}
              maxLength={CHAT_MAX_LENGTH}''',
    "dead textarea disabled",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
'''                disabled={
                  !value.trim() ||
                  fateImageUploading ||''',
'''                disabled={
                  (viewerDead && !ghostChatAllowed) ||
                  !value.trim() ||
                  fateImageUploading ||''',
    "dead submit disabled",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
'''      <CharacterDeathGate characterId={viewerCharacterId} />
      <div className="mb-2 flex justify-end game_components_roomchatform_div_container_3">''',
'''      <CharacterDeathGate characterId={viewerCharacterId} />
      {viewerDead ? (
        <div className="mb-2 border border-[rgb(var(--sep-colour-754137))]/45 bg-[rgb(var(--sep-colour-2b1714))]/55 px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-bc9d91))]">
          {ghostChatAllowed
            ? "Ghost state: Location chat is available here. Mechanical actions, Whispers, Feats, Warping and Items remain disabled."
            : "Ghost state: this Location does not permit Ghost chat. You may move elsewhere, but mechanical actions remain disabled."}
        </div>
      ) : null}
      <div className="mb-2 flex justify-end game_components_roomchatform_div_container_3">''',
    "dead state notice",
)

# Utility buttons: exact current 7ee6361 shapes.
repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
'''<button
          type="button"
          onClick={() =>
            toggleUtility("whisper")
          }
          disabled={
            presentCharacters.length === 0
          }''',
'''<button
          type="button"
          onClick={() =>
            toggleUtility("whisper")
          }
          disabled={
            viewerDead ||
            presentCharacters.length === 0
          }
          title={viewerDead ? "Unavailable while dead." : undefined}''',
    "disable whisper while dead",
)

for mode in ["attributes", "feat", "items"]:
    old = f'''        <button
          type="button"
          onClick={{() =>
            toggleUtility("{mode}")
          }}'''
    new = f'''        <button
          type="button"
          disabled={{viewerDead}}
          title={{viewerDead ? "Unavailable while dead." : undefined}}
          onClick={{() =>
            toggleUtility("{mode}")
          }}'''
    repl(
        "app/(portal)/game/components/RoomChatForm.tsx",
        old,
        new,
        f"disable {mode} while dead",
    )

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
'''        <button
          type="button"
          onClick={() => toggleUtility("warping")}''',
'''        <button
          type="button"
          disabled={viewerDead}
          title={viewerDead ? "Unavailable while dead." : undefined}
          onClick={() => toggleUtility("warping")}''',
    "disable warping while dead",
)

# ------------------------------------------------------------------
# 9. Explain malus duration in admin.
# ------------------------------------------------------------------
repl(
    "app/(portal)/admin/death/page.tsx",
'''            One active malus is chosen randomly only when resurrection occurs after the Essence Window. These effects are narrative only.''',
'''            One active malus is chosen randomly only when resurrection occurs after the Essence Window. These effects are narrative only and remain indefinitely until staff changes or clears them.''',
    "malus duration copy",
)

# ------------------------------------------------------------------
# Validate/create backup/write.
# ------------------------------------------------------------------
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / f".death-followup-backup-{stamp}"

for path, old in originals.items():
    if files[path] == old:
        continue
    dst = backup / path
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(old, encoding="utf-8")

for path, text in files.items():
    if text != originals[path]:
        (ROOT / path).write_text(text, encoding="utf-8", newline="\n")

target = ROOT / component_path
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(component, encoding="utf-8", newline="\n")

print("SUCCESS: Death follow-up patch applied.")
print("Backup:", backup)
print("Created:", component_path)
print("Next: npm run build")
