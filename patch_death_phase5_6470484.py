from pathlib import Path
import subprocess
import sys
from datetime import datetime

ROOT = Path.cwd()
EXPECTED = "64704840eeff3b7a794d190bcdb4bc6998548c12"

def fail(message: str):
    print("ERROR:", message)
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
    fail(f"This patch targets {EXPECTED}, but current HEAD is {head}.")

required = [
    "app/(portal)/game/components/RoomChatForm.tsx",
    "app/(portal)/game/components/RoomMessageList.tsx",
    "app/(portal)/game/components/CharacterDeathGate.tsx",
    "components/characters/character-resurrection-malus.tsx",
]

for rel in required:
    if not (ROOT / rel).exists():
        fail(f"Missing expected file: {rel}")

files = {rel: (ROOT / rel).read_text(encoding="utf-8") for rel in required}
originals = dict(files)

def repl(path: str, old: str, new: str, label: str):
    current = files[path]
    if old in current:
        files[path] = current.replace(old, new, 1)
        return
    if new in current:
        return
    fail(f"{label}: expected source fragment not found in {path}.")

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
    '''    const deathUiTimer = window.setInterval(
      () => void refreshDeathUi(),
      1000,
    );''',
    '''    // Realtime is the primary update path. This is only a recovery
    // fallback in case the websocket misses an update.
    const deathUiTimer = window.setInterval(
      () => void refreshDeathUi(),
      20_000,
    );''',
    "slow RoomChatForm death fallback",
)

repl(
    "app/(portal)/game/components/CharacterDeathGate.tsx",
    '''    const timer = window.setInterval(() => {
      if (active) void refresh();
    }, 1000);''',
    '''    // Realtime updates the gate immediately. This slower fallback is
    // retained for natural-return reconciliation and websocket recovery.
    const timer = window.setInterval(() => {
      if (active) void refresh();
    }, 20_000);''',
    "slow CharacterDeathGate fallback",
)

repl(
    "components/characters/character-resurrection-malus.tsx",
    '''    const timer = window.setInterval(
      () => void load(),
      1500,
    );''',
    '''    const timer = window.setInterval(
      () => void load(),
      20_000,
    );''',
    "slow sheet malus fallback",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''    async function loadResurrectionMaluses() {
      const ids = Array.from(
        new Set(
          liveMessages
            .map((message) => message.character_id)
            .filter(Boolean),
        ),
      ) as string[];''',
    '''    async function loadResurrectionMaluses() {
      const ids = chatCharacterIdsKey
        ? chatCharacterIdsKey.split(",").filter(Boolean)
        : [];''',
    "derive malus ids from stable character key",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''    const malusTimer = window.setInterval(
      () => void loadResurrectionMaluses(),
      1500,
    );''',
    '''    const malusTimer = window.setInterval(
      () => void loadResurrectionMaluses(),
      20_000,
    );''',
    "slow chat malus fallback",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''    async function loadMessageEffectConditions() {
      const messageIds =
        liveMessages
          .map((message) => message.id)
          .filter(Boolean);''',
    '''    async function loadMessageEffectConditions() {
      // Only real room_messages IDs are UUIDs. Synthetic system events use
      // the death-system-<uuid> prefix and must never be sent to this RPC.
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const messageIds =
        messageIdsKey
          .split(",")
          .filter((id) => uuidPattern.test(id));''',
    "filter historical-condition ids to UUIDs",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''  }, [messageIdsKey, liveMessages]);''',
    '''  }, [messageIdsKey, chatCharacterIdsKey]);''',
    "stabilise malus/condition effect dependencies",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''  useEffect(() => {
    let active = true;

    async function loadSystemEvents() {''',
    '''  useEffect(() => {
    let active = true;
    const supabase = createClient();

    function systemEventToMessage(event: {
      id: string;
      message: string;
      created_at: string;
    }): RoomMessage {
      return {
        id: `death-system-${event.id}`,
        message: event.message,
        message_type: "action",
        fate_image_url: null,
        roll_label: null,
        dice_sides: null,
        dice_result: null,
        attribute_key: null,
        attribute_value: null,
        roll_total: null,
        whisper_recipient_character_id: null,
        created_at: event.created_at,
        character_id: null,
        condition_snapshot: [],
        speaker_type: "system",
        npc_id: null,
        npc_snapshot: null,
        character: null,
        whisperRecipient: null,
      };
    }

    async function loadSystemEvents() {''',
    "add system-event realtime helper",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''        const synthetic: RoomMessage[] =
          (payload.events ?? []).map((event) => ({
            id: `death-system-${event.id}`,
            message: event.message,
            message_type: "action",
            fate_image_url: null,
            roll_label: null,
            dice_sides: null,
            dice_result: null,
            attribute_key: null,
            attribute_value: null,
            roll_total: null,
            whisper_recipient_character_id: null,
            created_at: event.created_at,
            character_id: null,
            condition_snapshot: [],
            speaker_type: "system",
            npc_id: null,
            npc_snapshot: null,
            character: null,
            whisperRecipient: null,
          }));''',
    '''        const synthetic: RoomMessage[] =
          (payload.events ?? []).map(systemEventToMessage);''',
    "reuse system event mapper",
)

repl(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''    void loadSystemEvents();

    const timer = window.setInterval(
      () => void loadSystemEvents(),
      1500,
    );

    return () => {
      active = false;
      window.clearInterval(timer);
    };''',
    '''    void loadSystemEvents();

    const channel = supabase
      .channel(`room-system-events-${roomId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_system_events",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (!active) return;

          const row = payload.new as {
            id?: string;
            message?: string;
            created_at?: string;
          };

          if (!row.id || !row.message || !row.created_at) {
            return;
          }

          setLiveMessages((currentMessages) =>
            mergeMessages(
              currentMessages,
              [
                systemEventToMessage({
                  id: row.id,
                  message: row.message,
                  created_at: row.created_at,
                }),
              ],
            ),
          );
        },
      )
      .subscribe();

    // Recovery only. Normal announcements arrive over Realtime.
    const timer = window.setInterval(
      () => void loadSystemEvents(),
      60_000,
    );

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };''',
    "replace system-event rapid poll with realtime",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
    '''      <div className="mb-2 flex justify-end game_components_roomchatform_div_container_3">

      </div>
      {utilityMode === null ? (''',
    '''      {utilityMode === null ? (''',
    "remove obsolete empty composer spacer",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
    '''              {transientStatusMessage ? (
                <p
                  aria-live="polite"
                  className={[((`min-w-0 truncate text-xs ${
                    transientStatusOk
                      ? "text-[rgb(var(--sep-colour-9bb58c))]"
                      : "text-[rgb(var(--sep-colour-d58d82))]"
                  }`)), "game_components_roomchatform_p_text_4"].filter(Boolean).join(" ")}
                  title={transientStatusMessage}
                >
                  {transientStatusMessage}
                </p>
              ) : null}''',
    '''              {/* Status feedback is rendered below the composer in its
                  own row so utility buttons can never cover it. */}''',
    "remove overlapping inline transient status",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
    '''      {utilityMode === null && (utilityLoadingMode || utilityLoadError) ? (
        <p
          aria-live="polite"
          className={[((`mb-1 text-center text-[8px] ${
            utilityLoadError
              ? "text-[rgb(var(--sep-colour-d58d82))]"
              : "text-[rgb(var(--sep-colour-a98b61))]"
          }`)), "game_components_roomchatform_p_text_29"].filter(Boolean).join(" ")}
        >
          {utilityLoadError
            ? utilityLoadError
            : utilityLoadingMode === "attributes"
              ? "Loading combat data..."
              : utilityLoadingMode === "feat"
                ? "Loading Feats..."
                : "Loading Items..."}
        </p>
      ) : null}
      {utilityMode === null ? (
      <div className="-mt-8 mx-[92px] flex flex-wrap justify-center gap-1 border-0 pt-0 max-lg:mx-0 max-lg:mt-2 max-lg:border-t max-lg:border-[rgb(var(--sep-colour-59432c))]/30 max-lg:pt-2 game_components_roomchatform_div_container_27">''',
    '''      {utilityMode === null &&
      (
        transientStatusMessage ||
        utilityLoadingMode ||
        utilityLoadError
      ) ? (
        <div
          aria-live="polite"
          className="mt-2 min-h-5 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2 text-center text-[9px]"
        >
          {utilityLoadError ? (
            <span className="text-[rgb(var(--sep-colour-d58d82))]">
              {utilityLoadError}
            </span>
          ) : utilityLoadingMode ? (
            <span className="text-[rgb(var(--sep-colour-a98b61))]">
              {utilityLoadingMode === "attributes"
                ? "Loading combat data..."
                : utilityLoadingMode === "feat"
                  ? "Loading Feats..."
                  : "Loading Items..."}
            </span>
          ) : transientStatusMessage ? (
            <span
              className={
                transientStatusOk
                  ? "text-[rgb(var(--sep-colour-9bb58c))]"
                  : "text-[rgb(var(--sep-colour-d58d82))]"
              }
            >
              {transientStatusMessage}
            </span>
          ) : null}
        </div>
      ) : null}

      {utilityMode === null ? (
      <div
        data-room-chat-controls
        className="mt-2 flex flex-wrap justify-center gap-1 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 game_components_roomchatform_div_container_27"
      >''',
    "separate status and control rows",
)

repl(
    "components/characters/character-resurrection-malus.tsx",
    '''  return (
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
  );''',
    '''  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/80 p-4 components_characters_character_resurrection_malus_section">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">
          Resurrection Malus
        </p>

        <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8f8271))]">
          Permanent · until cleared by staff
        </p>
      </div>

      <p className="mt-3 font-serif text-sm text-[rgb(var(--sep-colour-d7bf94))]">
        {malus.name}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-c9b99d))]">
        {malus.description}
      </p>
    </section>
  );''',
    "align Resurrection Malus styling with Masters Notes",
)

sql = r'''-- Death Phase 5: Realtime system events
-- Target commit: 64704840eeff3b7a794d190bcdb4bc6998548c12

begin;

drop policy if exists "Players can read current room system events"
  on public.room_system_events;

create policy "Players can read current room system events"
on public.room_system_events
for select
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.user_id = auth.uid()
      and c.current_room_id = room_system_events.room_id
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_system_events'
  ) then
    alter publication supabase_realtime
      add table public.room_system_events;
  end if;
end
$$;

commit;
'''

sql_name = "death_phase5_realtime_cleanup.sql"
if (ROOT / sql_name).exists():
    fail(f"{sql_name} already exists; refusing to overwrite it.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / f".death-phase5-backup-{stamp}"

for rel, original in originals.items():
    if files[rel] == original:
        continue
    target = backup / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(original, encoding="utf-8")

for rel, content in files.items():
    if content != originals[rel]:
        (ROOT / rel).write_text(content, encoding="utf-8", newline="\n")

(ROOT / sql_name).write_text(sql, encoding="utf-8", newline="\n")

print("SUCCESS: Death Phase 5 cleanup applied.")
print("Backup:", backup)
print("Created:", sql_name)
print("Next:")
print("  1. Run death_phase5_realtime_cleanup.sql in Supabase SQL Editor.")
print("  2. Run npm run build")
