from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path.cwd()
FILE = ROOT / "app" / "(portal)" / "game" / "components" / "RoomChatForm.tsx"
BACKUP = ROOT / ".move-conditions-out-of-composer-backup" / FILE.relative_to(ROOT)

def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)

if not FILE.exists():
    fail(f"Missing file: {FILE.relative_to(ROOT)}")

text = FILE.read_text(encoding="utf-8")
original = text

# 1) Remove the permanently visible Conditions editor above the text area.
pattern = re.compile(
    r'\n\s*<CharacterConditionsEditor\s+'
    r'scope="location"\s+'
    r'characterId=\{viewerCharacterId\}\s+'
    r'characterName=\{viewerDisplayName\}\s+'
    r'selectableCharacters=\{\s*'
    r'canUseFate\s*\?\s*presentCharacters\s*:\s*\[\]\s*'
    r'\}\s*/>\s*\n',
    re.MULTILINE,
)

text, removed = pattern.subn("\n", text, count=1)

if removed != 1:
    fail(
        "Could not find the currently visible location Conditions editor "
        f"(found {removed} matches)."
    )

# 2) Add "conditions" to the utilityMode state union.
state_old = '''      | "exchange"
      | "warping"
      | null'''

state_new = '''      | "exchange"
      | "warping"
      | "conditions"
      | null'''

if state_old not in text:
    if state_new not in text:
        fail("Could not find the utilityMode state union.")
else:
    text = text.replace(state_old, state_new, 1)

# 3) Add "conditions" to toggleUtility's accepted modes.
toggle_old = '''      | "exchange"
      | "warping",'''

toggle_new = '''      | "exchange"
      | "warping"
      | "conditions",'''

if toggle_old not in text:
    if toggle_new not in text:
        fail("Could not find the toggleUtility mode union.")
else:
    text = text.replace(toggle_old, toggle_new, 1)

# 4) Add a CONDITIONS button immediately before the WHISPER utility button.
# Locate the button containing toggleUtility("whisper"), then backtrack to its opening <button>.
whisper_pos = text.find('toggleUtility("whisper")')
if whisper_pos == -1:
    fail('Could not find toggleUtility("whisper").')

button_start = text.rfind("<button", 0, whisper_pos)
button_end = text.find("</button>", whisper_pos)

if button_start == -1 or button_end == -1:
    fail("Could not identify the Whisper utility button.")

button_end += len("</button>")
whisper_button = text[button_start:button_end]

indent_match = re.search(r'(?m)^(\s*)<button', whisper_button)
indent = indent_match.group(1) if indent_match else "        "

conditions_button = f'''{indent}<button
{indent}  type="button"
{indent}  onClick={{() =>
{indent}    toggleUtility("conditions")
{indent}  }}
{indent}  className={{
{indent}    utilityMode === "conditions"
{indent}      ? utilityButtonActiveClass
{indent}      : utilityButtonClass
{indent}  }}
{indent}>
{indent}  Conditions
{indent}</button>

'''

text = text[:button_start] + conditions_button + text[button_start:]

# 5) Add the Conditions utility panel branch before Whisper.
branch_anchor = ') : utilityMode === "whisper" ? ('

conditions_branch = ''' ) : utilityMode === "conditions" ? (
        <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
          <UtilityPanelHeader
            title="Conditions"
            description="Add or remove visible Conditions. Staff may select another Character currently in this Location."
            onClose={() => setUtilityMode(null)}
          />

          <CharacterConditionsEditor
            scope="location"
            characterId={viewerCharacterId}
            characterName={viewerDisplayName}
            selectableCharacters={
              canUseFate
                ? presentCharacters
                : []
            }
          />
        </div>
      ) : utilityMode === "whisper" ? ('''

if branch_anchor not in text:
    fail("Could not find the Whisper render branch.")

text = text.replace(branch_anchor, conditions_branch, 1)

# Safety: ensure only one location editor remains and it is in utility branch.
count_editor = text.count('scope="location"')
if count_editor != 1:
    fail(
        f"Expected exactly one location Conditions editor after moving it, found {count_editor}."
    )

BACKUP.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(FILE, BACKUP)
FILE.write_text(text, encoding="utf-8")

# TSX parse validation.
validator = r'''
const fs = require("fs");
const ts = require("typescript");

const file = process.argv[1];
const source = fs.readFileSync(file, "utf8");

const sf = ts.createSourceFile(
  file,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

if (sf.parseDiagnostics.length) {
  console.error(sf.parseDiagnostics);
  process.exit(1);
}
'''

try:
    subprocess.run(
        ["node", "-e", validator, str(FILE)],
        cwd=ROOT,
        check=True,
    )
except Exception:
    shutil.copy2(BACKUP, FILE)
    fail("TSX parse validation failed. Original file restored.")

print("\nCONDITIONS MOVED OUT OF THE COMPOSER")
print("")
print("Changed only:")
print("  app/(portal)/game/components/RoomChatForm.tsx")
print("")
print("Result:")
print("  - Conditions no longer occupy a permanent row above the message box")
print("  - Conditions are now opened from a CONDITIONS utility button")
print("  - chat snapshots / Character Edit / Admin / Character Sheet behaviour is untouched")
print("")
print("NEXT:")
print("  npm run build")
