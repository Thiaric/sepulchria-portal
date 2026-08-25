from pathlib import Path
import subprocess

ROOT = Path.cwd()
RELATIVE_PATH = "components/portal/game-context-panel.tsx"
PATH = ROOT / RELATIVE_PATH


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


if not (ROOT / ".git").exists():
    fail(
        "Run this script from the Sepulchria repository root."
    )

try:
    clean_text = subprocess.check_output(
        [
            "git",
            "show",
            f"HEAD:{RELATIVE_PATH}",
        ],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
except subprocess.CalledProcessError:
    fail(
        f"Could not restore {RELATIVE_PATH} from your current local HEAD."
    )

if "export function GameContextPanel" not in clean_text:
    fail(
        "The clean HEAD version does not contain export function GameContextPanel."
    )

text = clean_text

modal_import = (
    'import { openPortalModal } from '
    '"@/components/portal/portal-modal-button";\n'
)

if modal_import not in text:
    import_anchor = 'import Link from "next/link";\n'

    if text.count(import_anchor) != 1:
        fail(
            "Could not find the expected next/link import in the clean HEAD file."
        )

    text = text.replace(
        import_anchor,
        import_anchor + modal_import,
        1,
    )

old_open = """    <Link
      href={`/characters/${person.public_slug}?from=game`}
      title={`Open ${displayName}'s profile`}
      className="block"
    >
"""

new_open = """    <button
      type="button"
      title={`Open ${displayName}'s profile`}
      aria-label={`Open ${displayName}'s character sheet`}
      onClick={() =>
        openPortalModal({
          label: displayName,
          title: `${displayName}'s character sheet`,
          icon:
            person.portrait_url ??
            "/icons/characters.png",
          href: `/characters/${person.public_slug}?from=game`,
        })
      }
      className="block w-full text-left"
    >
"""

if text.count(old_open) != 1:
    fail(
        "Could not find the Present Characters profile link in the clean HEAD file."
    )

text = text.replace(
    old_open,
    new_open,
    1,
)

old_close = """    </Link>

    {person.id !== currentCharacterId &&
"""

new_close = """    </button>

    {person.id !== currentCharacterId &&
"""

if text.count(old_close) != 1:
    fail(
        "Could not find the closing tag for the Present Characters profile link."
    )

text = text.replace(
    old_close,
    new_close,
    1,
)

if "<Link" not in text and "</Link>" not in text:
    text = text.replace(
        'import Link from "next/link";\n',
        "",
        1,
    )

if "export function GameContextPanel" not in text:
    fail(
        "Safety check failed: GameContextPanel export disappeared."
    )

PATH.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print(
    "RESTORED AND WROTE  components/portal/game-context-panel.tsx"
)
print()
print("REPAIR APPLIED SUCCESSFULLY")
print()
print("- Restored the file from your current local HEAD.")
print("- Preserved the GameContextPanel export.")
print("- Reapplied the Present Characters -> modal behaviour.")
print("- No specific commit SHA was used.")
print("- No other files were touched.")
print()
print("Next: npm run build")
