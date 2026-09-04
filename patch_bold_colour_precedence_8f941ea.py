from pathlib import Path
import subprocess
import shutil

ROOT = Path.cwd()

def git(*args):
    return subprocess.check_output(
        ["git", *args],
        cwd=ROOT,
        text=True,
    ).strip()

head = git("rev-parse", "HEAD")
if not head.startswith("8f941ea"):
    raise SystemExit(
        f"STOP: expected commit 8f941ea, but HEAD is {head[:12]}.\n"
        "No files were changed."
    )

css = ROOT / "components" / "sepulchria" / "sep-ui-unified.css"

if not css.exists():
    raise SystemExit(
        "Could not find components/sepulchria/sep-ui-unified.css.\n"
        "Run this script from the sepulchria-portal repository root."
    )

text = css.read_text(encoding="utf-8")

old = '''body[data-portal-skin]
  .rich-text-content
  :is(strong, b) {
  color: rgb(var(--sep-skin-c1)) !important;
}'''

new = '''/*
 * Rich-text bold defaults to skin C1, but it is only a DEFAULT.
 * Explicit author/editor colours must win.
 *
 * Low specificity means an explicit class or inline colour on <strong>/<b>
 * overrides the skin default naturally.
 */
:where(
  body[data-portal-skin]
    .rich-text-content
    :is(strong, b)
) {
  color: rgb(var(--sep-skin-c1));
}

/*
 * The rich editor can place a colour on an ancestor (for example
 * <font color="..."><strong>...</strong></font> or a styled span).
 * In that case bold inherits the explicitly assigned colour instead of
 * forcing C1.
 */
:where(
  body[data-portal-skin]
    .rich-text-content
    :is(font[color], [style*="color" i])
    :is(strong, b)
) {
  color: inherit;
}'''

if old not in text:
    raise SystemExit(
        "Could not find the exact strong/b skin-colour rule from commit 8f941ea.\n"
        "No changes were written."
    )

backup = css.with_suffix(".css.before_bold_colour_precedence.bak")
if not backup.exists():
    shutil.copy2(css, backup)

text = text.replace(old, new, 1)
css.write_text(text, encoding="utf-8")

print("DONE")
print()
print("Updated rich-text bold colour precedence:")
print("  - plain <strong>/<b> still uses skin C1")
print("  - explicit rich-editor text colours now win")
print("  - inline colours on strong/b now win")
print("  - coloured ancestor span/font values are inherited")
print()
print("Backup:")
print(f"  {backup.relative_to(ROOT)}")
print()
print("Now run:")
print("  npm run build")
