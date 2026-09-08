from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path.cwd()
EXPECTED_HEAD = "74f9bb8afe3cc723e86f215fe03c3e166546e63a"

ROOM_REALTIME = ROOT / "app" / "(portal)" / "game" / "components" / "RoomRealtime.tsx"
ROOM_CHAT = ROOT / "app" / "(portal)" / "game" / "components" / "RoomChatForm.tsx"
GAME_PAGE = ROOT / "app" / "(portal)" / "game" / "page.tsx"
HEADER_ID = ROOT / "components" / "portal" / "header-character-identity.tsx"

TARGETS = [ROOM_REALTIME, ROOM_CHAT, GAME_PAGE, HEADER_ID]
BACKUP = ROOT / ".stop-portal-refresh-loops-backup"

def fail(message: str) -> None:
    print("\nSTOPPED:", message, file=sys.stderr)
    sys.exit(1)

def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

try:
    head = run("git", "rev-parse", "HEAD")
except Exception:
    fail("Could not read git HEAD.")

if head != EXPECTED_HEAD:
    fail(f"This patch is locked to {EXPECTED_HEAD[:7]}; current HEAD is {head[:7]}.")

for p in TARGETS:
    if not p.exists():
        fail(f"Missing expected file: {p.relative_to(ROOT)}")

if BACKUP.exists():
    shutil.rmtree(BACKUP)
BACKUP.mkdir(parents=True)

changed = []

def backup(path: Path) -> None:
    dst = BACKUP / path.relative_to(ROOT)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dst)

def write(path: Path, new_text: str) -> None:
    old = path.read_text(encoding="utf-8")
    if old == new_text:
        return
    backup(path)
    path.write_text(new_text, encoding="utf-8")
    changed.append(path)

def restore() -> None:
    for path in changed:
        src = BACKUP / path.relative_to(ROOT)
        if src.exists():
            shutil.copy2(src, path)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    c = text.count(old)
    if c != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {c}.")
    return text.replace(old, new, 1)

try:
    # 1) RoomRealtime: stop whole-tree refreshes on room membership changes.
    text = ROOM_REALTIME.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'import { useRouter } from "next/navigation";\n\n',
        '',
        'RoomRealtime useRouter import',
    )
    text = replace_once(
        text,
        '  const router = useRouter();\n',
        '',
        'RoomRealtime router declaration',
    )

    old_refresh = '              router.refresh();'
    if text.count(old_refresh) != 2:
        raise RuntimeError(
            f"RoomRealtime: expected 2 membership refreshes, found {text.count(old_refresh)}."
        )

    event_dispatch = '''              window.dispatchEvent(
                new CustomEvent(
                  "sepulchria:room-presence-changed",
                  {
                    detail: {
                      roomId,
                    },
                  },
                ),
              );'''

    text = text.replace(old_refresh, event_dispatch)
    text = replace_once(
        text,
        '  }, [roomId, router]);',
        '  }, [roomId]);',
        'RoomRealtime dependency list',
    )
    write(ROOM_REALTIME, text)

    # 2) RoomChatForm: maintain present-character targets locally.
    text = ROOM_CHAT.read_text(encoding="utf-8")

    text = replace_once(
        text,
        'import { CHAT_MAX_LENGTH } from "@/lib/game/constants";',
        '''import {
  CHAT_MAX_LENGTH,
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";''',
        'RoomChatForm constants import',
    )

    text = replace_once(
        text,
        '''export default function RoomChatForm({
  presentCharacters,
  canUseFate,''',
        '''export default function RoomChatForm({
  roomId,
  presentCharacters: initialPresentCharacters,
  canUseFate,''',
        'RoomChatForm destructuring',
    )

    text = replace_once(
        text,
        '''}: {
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;''',
        '''}: {
  roomId: string;
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;''',
        'RoomChatForm prop type',
    )

    anchor = '  const router = useRouter();\n'
    if text.count(anchor) != 1:
        raise RuntimeError("RoomChatForm: router anchor not found uniquely.")

    local_presence = r'''
  const presenceSupabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    presentCharacters,
    setPresentCharacters,
  ] = useState<PresentRoomCharacter[]>(
    initialPresentCharacters,
  );

  useEffect(() => {
    setPresentCharacters(
      initialPresentCharacters,
    );
  }, [initialPresentCharacters]);

  useEffect(() => {
    let active = true;
    let refreshTimer:
      | ReturnType<typeof window.setTimeout>
      | null = null;

    async function refreshPresentCharacters() {
      const activeSince =
        new Date(
          Date.now() -
            PRESENCE_ACTIVE_MINUTES *
              60_000,
        ).toISOString();

      const {
        data,
        error,
      } = await presenceSupabase
        .from("character_presence")
        .select(`
          character_id,
          character:characters!character_presence_character_id_fkey(
            id,
            display_name
          )
        `)
        .eq(
          "room_id",
          roomId,
        )
        .gte(
          "last_seen_at",
          activeSince,
        );

      if (
        !active ||
        error
      ) {
        if (
          active &&
          error
        ) {
          console.error(
            "Unable to refresh room presence:",
            error.message,
          );
        }

        return;
      }

      const next =
        (data ?? [])
          .map((row) => {
            const relation =
              Array.isArray(
                row.character,
              )
                ? row.character[0]
                : row.character;

            if (!relation) {
              return null;
            }

            return {
              id:
                String(
                  relation.id,
                ),
              display_name:
                String(
                  relation.display_name,
                ),
            } satisfies PresentRoomCharacter;
          })
          .filter(
            (
              entry,
            ): entry is PresentRoomCharacter =>
              entry !== null,
          );

      setPresentCharacters(
        (current) => {
          if (
            current.length ===
              next.length &&
            current.every(
              (entry, index) =>
                entry.id ===
                  next[index]?.id &&
                entry.display_name ===
                  next[index]
                    ?.display_name,
            )
          ) {
            return current;
          }

          return next;
        },
      );
    }

    function handlePresenceChanged(
      event: Event,
    ) {
      const detail =
        (
          event as CustomEvent<{
            roomId?: string;
          }>
        ).detail;

      if (
        detail?.roomId !==
        roomId
      ) {
        return;
      }

      if (refreshTimer) {
        window.clearTimeout(
          refreshTimer,
        );
      }

      refreshTimer =
        window.setTimeout(
          () => {
            refreshTimer = null;
            void refreshPresentCharacters();
          },
          80,
        );
    }

    window.addEventListener(
      "sepulchria:room-presence-changed",
      handlePresenceChanged,
    );

    return () => {
      active = false;

      if (refreshTimer) {
        window.clearTimeout(
          refreshTimer,
        );
      }

      window.removeEventListener(
        "sepulchria:room-presence-changed",
        handlePresenceChanged,
      );
    };
  }, [
    presenceSupabase,
    roomId,
  ]);
'''

    text = text.replace(anchor, anchor + local_presence, 1)
    write(ROOM_CHAT, text)

    # 3) Pass roomId into RoomChatForm.
    text = GAME_PAGE.read_text(encoding="utf-8")
    text = replace_once(
        text,
        '''        <RoomChatForm
      presentCharacters={''',
        '''        <RoomChatForm
      roomId={room.id}
      presentCharacters={''',
        'GamePage RoomChatForm roomId',
    )
    write(GAME_PAGE, text)

    # 4) Header identity: stop refreshing portal on generic updated_at changes.
    text = HEADER_ID.read_text(encoding="utf-8")

    pattern = re.compile(
        r'  useEffect\(\(\) => \{\n'
        r'    const supabase =\n'
        r'      createClient\(\);\n\n'
        r'    let cancelled = false;'
        r'.*?'
        r'  \}, \[\n'
        r'    character\?\.id,\n'
        r'    router,\n'
        r'    userId,\n'
        r'  \]\);\n\n'
        r'  useEffect\(\(\) => \{\n'
        r'    if \(!character\) \{',
        re.DOTALL,
    )

    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError(
            f"Header identity refresh effect: expected 1 match, found {len(matches)}."
        )

    new_effect = r'''  useEffect(() => {
    const supabase =
      createClient();

    let cancelled = false;
    let initialised = false;
    let lastSignature:
      | string
      | null = null;

    function identitySignature(
      data:
        | {
            id?: string | null;
            first_name?: string | null;
            display_name?: string | null;
            portrait_url?: string | null;
            status?: string | null;
            race_id?: string | null;
          }
        | null,
    ) {
      if (!data) {
        return "no-character";
      }

      return JSON.stringify([
        data.id ?? null,
        data.first_name ?? null,
        data.display_name ?? null,
        data.portrait_url ?? null,
        data.status ?? null,
        data.race_id ?? null,
      ]);
    }

    async function checkCharacterIdentity() {
      const {
        data,
        error,
      } = await supabase
        .from("characters")
        .select(
          "id, first_name, display_name, portrait_url, status, race_id",
        )
        .eq(
          "user_id",
          userId,
        )
        .maybeSingle();

      if (
        cancelled ||
        error
      ) {
        if (error) {
          console.error(
            "Unable to refresh header character identity:",
            error.message,
          );
        }

        return;
      }

      const nextSignature =
        identitySignature(
          data,
        );

      if (!initialised) {
        initialised = true;
        lastSignature =
          nextSignature;

        if (
          (data?.id ?? null) !==
          (character?.id ?? null)
        ) {
          router.refresh();
        }

        return;
      }

      if (
        nextSignature !==
        lastSignature
      ) {
        lastSignature =
          nextSignature;

        router.refresh();
      }
    }

    void checkCharacterIdentity();

    const channel =
      supabase
        .channel(
          `header-character-record-${userId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "characters",
            filter:
              `user_id=eq.${userId}`,
          },
          () => {
            void checkCharacterIdentity();
          },
        )
        .subscribe();

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void checkCharacterIdentity();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      cancelled = true;

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    character?.id,
    router,
    userId,
  ]);

  useEffect(() => {
    if (!character) {'''

    text = pattern.sub(new_effect, text, count=1)
    write(HEADER_ID, text)

    validator = r'''
const fs = require("fs");
const ts = require("typescript");

for (const file of process.argv.slice(1)) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  if (sf.parseDiagnostics.length) {
    console.error("Parse diagnostics for", file);
    console.error(sf.parseDiagnostics);
    process.exit(1);
  }
}
'''

    subprocess.run(
        ["node", "-e", validator, *[str(p) for p in changed]],
        cwd=ROOT,
        check=True,
    )

except Exception as exc:
    restore()
    fail(str(exc) + "\nAll files changed by this patch were restored.")

print("\nPORTAL SPONTANEOUS-RELOAD FIX APPLIED")
print("")
print("Changed files:")
for p in changed:
    print("  " + str(p.relative_to(ROOT)))
print("")
print("Backup:")
print("  .stop-portal-refresh-loops-backup/")
print("")
print("NEXT:")
print("  npm run build")
