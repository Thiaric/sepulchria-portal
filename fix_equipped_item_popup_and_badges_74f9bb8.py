from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path.cwd()
EXPECTED_HEAD = "74f9bb8afe3cc723e86f215fe03c3e166546e63a"
CSS = ROOT / "components" / "sepulchria" / "sep-ui-unified.css"

START = "/* EQUIPPED ITEM POPUP + QUALITY BADGE FIX START */"
END = "/* EQUIPPED ITEM POPUP + QUALITY BADGE FIX END */"

BLOCK = r"""
/* EQUIPPED ITEM POPUP + QUALITY BADGE FIX START */

/*
 * Equipment detail popup:
 * keep the existing card styling, but make the card itself nearly opaque
 * so the mannequin/equipment layout does not bleed through the text.
 */
body.portal-skin-scope
  [data-sep-equipment-popup="true"]
  [data-sep-interaction-kind="card"] {
  background-color:
    rgb(var(--sep-colour-120f0d) / 0.97) !important;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

/*
 * Item-quality corner symbols must always use the exact same quality colour
 * as the item's frame. This fixes the equipped-slot thumbnails while leaving
 * the loose-inventory thumbnails visually unchanged.
 */
[data-item-quality="poor"]
  > span[aria-label="Poor quality"] {
  color: #777777 !important;
  -webkit-text-fill-color: #777777 !important;
}

[data-item-quality="average"]
  > span[aria-label="Average quality"] {
  color: #c8c8c8 !important;
  -webkit-text-fill-color: #c8c8c8 !important;
}

[data-item-quality="fine"]
  > span[aria-label="Fine quality"] {
  color: #4fa76c !important;
  -webkit-text-fill-color: #4fa76c !important;
}

[data-item-quality="superior"]
  > span[aria-label="Superior quality"] {
  color: #4d82d6 !important;
  -webkit-text-fill-color: #4d82d6 !important;
}

[data-item-quality="flawless"]
  > span[aria-label="Flawless quality"] {
  color: #9b62cc !important;
  -webkit-text-fill-color: #9b62cc !important;
}

[data-item-quality="peerless"]
  > span[aria-label="Peerless quality"] {
  color: #d6a844 !important;
  -webkit-text-fill-color: #d6a844 !important;
}

/* EQUIPPED ITEM POPUP + QUALITY BADGE FIX END */
"""

def fail(msg: str) -> None:
    print("\nSTOPPED:", msg, file=sys.stderr)
    sys.exit(1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception:
    fail("Could not read git HEAD.")

if head != EXPECTED_HEAD:
    fail(
        f"This patch is locked to {EXPECTED_HEAD[:7]}; "
        f"your current HEAD is {head[:7]}."
    )

if not CSS.exists():
    fail(f"Missing expected file: {CSS.relative_to(ROOT)}")

backup_root = ROOT / ".equipped-item-visual-fix-backup"
if backup_root.exists():
    shutil.rmtree(backup_root)

backup_path = backup_root / CSS.relative_to(ROOT)
backup_path.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(CSS, backup_path)

text = CSS.read_text(encoding="utf-8")

# Safe rerun: remove an older copy of this exact patch block first.
text = re.sub(
    re.escape(START) + r".*?" + re.escape(END),
    "",
    text,
    flags=re.DOTALL,
).rstrip()

next_text = text + "\n\n" + BLOCK.strip() + "\n"

if next_text.count("{") != next_text.count("}"):
    shutil.copy2(backup_path, CSS)
    fail("CSS brace count changed unexpectedly. Original file restored.")

CSS.write_text(next_text, encoding="utf-8")

validator = r"""
const fs = require("fs");
const postcss = require("postcss");
const file = process.argv[1];
postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
"""

try:
    subprocess.run(
        ["node", "-e", validator, str(CSS)],
        cwd=ROOT,
        check=True,
    )
except Exception:
    shutil.copy2(backup_path, CSS)
    fail("PostCSS validation failed. Original file restored.")

print("\nEQUIPPED ITEM VISUAL FIX APPLIED")
print("")
print("Changed:")
print("  components/sepulchria/sep-ui-unified.css")
print("")
print("Popup opacity:")
print("  97%")
print("")
print("Quality corner symbols:")
print("  forced to the exact same quality colours used by ItemImageFrame")
print("")
print("Backup:")
print("  .equipped-item-visual-fix-backup/")
print("")
print("NEXT:")
print("  npm run build")
