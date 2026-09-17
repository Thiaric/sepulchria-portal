from pathlib import Path
import subprocess
import sys
from datetime import datetime

ROOT = Path.cwd()
EXPECTED = "966df3656112fc3b245591b741a5b5e0081562f2"

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
    "app/(portal)/game/components/CharacterDeathGate.tsx",
    "lib/death/death-system.ts",
]

for rel in required:
    if not (ROOT / rel).exists():
        fail(f"Missing expected file: {rel}")

files = {rel: (ROOT / rel).read_text(encoding="utf-8") for rel in required}
originals = dict(files)

def repl(path: str, old: str, new: str, label: str):
    text = files[path]
    if old in text:
        files[path] = text.replace(old, new, 1)
        return
    if new in text:
        return
    fail(f"{label}: expected source fragment not found in {path}.")

# 1) Single dead/Ghost panel.
repl(
    "app/(portal)/game/components/CharacterDeathGate.tsx",
    'export function CharacterDeathGate({ characterId }: { characterId: string }) {',
    '''export function CharacterDeathGate({
  characterId,
  ghostChatAllowed,
}: {
  characterId: string;
  ghostChatAllowed: boolean;
}) {''',
    "CharacterDeathGate ghost prop",
)

old_dead = '''  if (state.lifeState === "dead") {
    const until = state.deadUntil
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(state.deadUntil))
      : null;

    return (
      <div className="mb-2 border border-[rgb(var(--sep-colour-754137))]/55 bg-[rgb(var(--sep-colour-2b1714))] px-3 py-2.5">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-d28e82))]">
          Character Dead
        </p>
        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-bc9d91))]">
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
        </p>
      </div>
    );
  }'''

new_dead = '''  if (state.lifeState === "dead") {
    const until = state.deadUntil
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(state.deadUntil))
      : null;

    const essenceActive =
      Boolean(state.essenceEndsAt) &&
      Date.parse(state.essenceEndsAt!) > Date.now();

    const essenceLabel =
      essenceActive && state.essenceEndsAt
        ? `Essence clings until ${new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(state.essenceEndsAt))}; healing Items, Shapes and Feats that affect Others may still return them.`
        : "Essence has faded; only a Level IX Resurrection Shape, staff intervention, or the Current's natural return can restore them.";

    return (
      <div className="mb-2 border border-[rgb(var(--sep-colour-754137))]/45 bg-[rgb(var(--sep-colour-2b1714))]/55 px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-bc9d91))]">
        <strong className="font-semibold text-[rgb(var(--sep-colour-d7b28d))]">
          Ghost state:
        </strong>{" "}
        {ghostChatAllowed
          ? "Location chat is available here."
          : "This Location does not permit Ghost chat; you may move elsewhere."}{" "}
        {until ? `Dead until ${until}. ` : "This Character is dead. "}
        {essenceLabel}{" "}
        Mechanical actions, Whispers, Feats, Warping, Items, Conditions and Dice remain unavailable.
      </div>
    );
  }'''

repl(
    "app/(portal)/game/components/CharacterDeathGate.tsx",
    old_dead,
    new_dead,
    "condense dead panel",
)

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
    '''      <CharacterDeathGate characterId={viewerCharacterId} />
      {viewerDead ? (
        <div className="mb-2 border border-[rgb(var(--sep-colour-754137))]/45 bg-[rgb(var(--sep-colour-2b1714))]/55 px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-bc9d91))]">
          {ghostChatAllowed
            ? "Ghost state: Location chat is available here. Mechanical actions, Whispers, Feats, Warping and Items remain disabled."
            : "Ghost state: this Location does not permit Ghost chat. You may move elsewhere, but mechanical actions remain disabled."}
        </div>
      ) : null}''',
    '''      <CharacterDeathGate
        characterId={viewerCharacterId}
        ghostChatAllowed={ghostChatAllowed}
      />''',
    "remove duplicate Ghost panel",
)

# 2) Put utility buttons back visually on the Rows / Send Action line.
status_block = '''      {utilityMode === null &&
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

'''

chat = files["app/(portal)/game/components/RoomChatForm.tsx"]
if status_block not in chat:
    fail("Could not locate status block in RoomChatForm.tsx.")
chat = chat.replace(status_block, "", 1)
files["app/(portal)/game/components/RoomChatForm.tsx"] = chat

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
    '''      <div
        data-room-chat-controls
        className="mt-2 flex flex-wrap justify-center gap-1 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 game_components_roomchatform_div_container_27"
      >''',
    '''      <div
        data-room-chat-controls
        className={
          viewerDead && !ghostChatAllowed
            ? "mt-2 flex flex-wrap justify-center gap-1 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 game_components_roomchatform_div_container_27"
            : "-mt-8 mx-[92px] flex flex-wrap justify-center gap-1 border-0 pt-0 max-lg:mx-0 max-lg:mt-2 max-lg:border-t max-lg:border-[rgb(var(--sep-colour-59432c))]/30 max-lg:pt-2 game_components_roomchatform_div_container_27"
        }
      >''',
    "restore compact controls placement",
)

tail_old = '''      </div>
      ) : null}


    </div>
  );
}'''

tail_new = '''      </div>
      ) : null}

''' + status_block + '''      
    </div>
  );
}'''

repl(
    "app/(portal)/game/components/RoomChatForm.tsx",
    tail_old,
    tail_new,
    "move status below buttons",
)

# 3) Force a different delayed-resurrection Malus when possible.
repl(
    "lib/death/death-system.ts",
    'async function chooseRandomMalus() {',
    '''async function chooseRandomMalus(
  excludeMalusId: string | null = null,
) {''',
    "random malus exclusion parameter",
)

repl(
    "lib/death/death-system.ts",
    '''  if (!data?.length) {
    return null;
  }

  return data[randomInt(0, data.length)];''',
    '''  if (!data?.length) {
    return null;
  }

  const alternatives =
    excludeMalusId && data.length > 1
      ? data.filter((entry) => entry.id !== excludeMalusId)
      : data;

  const pool =
    alternatives.length > 0
      ? alternatives
      : data;

  return pool[randomInt(0, pool.length)];''',
    "exclude current malus from random pool",
)

repl(
    "lib/death/death-system.ts",
    '''  if (delayed) {
    malus = await chooseRandomMalus();

    if (malus) {''',
    '''  if (delayed) {
    const { data: currentMalus, error: currentMalusError } =
      await admin
        .from("character_resurrection_maluses")
        .select("malus_id")
        .eq("character_id", characterId)
        .is("cleared_at", null)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (currentMalusError) {
      throw new Error(
        `Unable to load current Resurrection Malus: ${currentMalusError.message}`,
      );
    }

    malus = await chooseRandomMalus(
      currentMalus?.malus_id ?? null,
    );

    if (malus) {''',
    "different malus on repeated resurrection",
)

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / f".death-phase6-backup-{stamp}"

for rel, original in originals.items():
    if files[rel] == original:
        continue
    target = backup / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(original, encoding="utf-8")

for rel, content in files.items():
    if content != originals[rel]:
        (ROOT / rel).write_text(content, encoding="utf-8", newline="\n")

print("SUCCESS: Death Phase 6 cleanup applied.")
print("Backup:", backup)
print("No Supabase SQL is required.")
print("Now run: npm run build")
