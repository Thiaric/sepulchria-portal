from pathlib import Path
import shutil

ROOT = Path.cwd()
CSS = ROOT / "components" / "sepulchria" / "sep-ui-unified.css"

if not CSS.exists():
    raise SystemExit(
        "ERROR: components/sepulchria/sep-ui-unified.css not found.\n"
        "Run this from the sepulchria-portal repo root."
    )

text = CSS.read_text(encoding="utf-8")
MARKER = "SKIN-AWARE AUTOFILL FIELD BACKGROUND"

if MARKER in text:
    print("Already patched. No changes made.")
    raise SystemExit(0)

backup = CSS.with_suffix(".css.before_skin_autofill_fix.bak")
if not backup.exists():
    shutil.copy2(CSS, backup)

block = r"""
/* =====================================================================
   SKIN-AWARE AUTOFILL FIELD BACKGROUND
   ===================================================================== */
:is(html[data-portal-skin], body[data-portal-skin]) input:-webkit-autofill,
:is(html[data-portal-skin], body[data-portal-skin]) input:-webkit-autofill:hover,
:is(html[data-portal-skin], body[data-portal-skin]) input:-webkit-autofill:focus,
:is(html[data-portal-skin], body[data-portal-skin]) input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--sep-unified-field-text) !important;
  caret-color: var(--sep-unified-field-text) !important;
  -webkit-box-shadow:
    0 0 0 1000px var(--sep-unified-field-bg) inset !important;
  box-shadow:
    0 0 0 1000px var(--sep-unified-field-bg) inset !important;
  background-color: var(--sep-unified-field-bg) !important;
  color: var(--sep-unified-field-text) !important;
  transition: background-color 999999s ease-out 0s !important;
}

:is(html[data-portal-skin], body[data-portal-skin]) input:autofill {
  background-color: var(--sep-unified-field-bg) !important;
  color: var(--sep-unified-field-text) !important;
  caret-color: var(--sep-unified-field-text) !important;
}
"""

CSS.write_text(text.rstrip() + "\n\n" + block.strip() + "\n", encoding="utf-8")

print("DONE.")
print("Autofilled writable fields now keep the active skin's unified field background/text.")
print("Applies to every skin, including Cinder Original.")
print("No commit. No push.")
print("Run: npm run build")
