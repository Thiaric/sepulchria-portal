from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path.cwd()
MARKER = "/* PIONEERS' LAND SKIN */"

CSS_FILES = [
    ROOT / "components" / "sepulchria" / "sep-ui-unified.css",
    ROOT / "app" / "portal-themes.css",
]

ACCENT_FILES = [
    ROOT / "app" / "(portal)" / "crafting" / "crafting-workbench.tsx",
    ROOT / "app" / "(portal)" / "game" / "components" / "GatheringPanel.tsx",
    ROOT / "app" / "(portal)" / "game" / "components" / "HouseOfChancesPanel.tsx",
]

C1 = "214 173 91"       # #D6AD5B — gold
C2 = "160 78 48"        # #A04E30 — red bronze
ACCENT_HEX = "#d6ad5b"

PALETTE_BLOCK = f'''
{MARKER}
html[data-portal-skin="pioneers-land"],
body[data-portal-skin="pioneers-land"],
.portal-skin-scope[data-portal-skin="pioneers-land"] {{
  --sep-skin-c1: {C1};
  --sep-skin-c2: {C2};
  --sep-global-c1: {C1};
  --sep-global-c2: {C2};
  --sep-skin-nav-link: {C1};
  --sep-skin-nav-icon-filter: brightness(0) saturate(100%) invert(75%) sepia(42%) saturate(815%) hue-rotate(358deg) brightness(93%) contrast(86%);
}}
'''

def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

missing = [p for p in CSS_FILES + ACCENT_FILES if not p.exists()]
if missing:
    fail("Missing expected file(s): " + ", ".join(str(p.relative_to(ROOT)) for p in missing))

backup_root = ROOT / ".pioneers-land-cambion-clone-backup"
if backup_root.exists():
    shutil.rmtree(backup_root)
backup_root.mkdir(parents=True)

changed: list[Path] = []

def backup(path: Path) -> None:
    target = backup_root / path.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, target)

def write(path: Path, text: str) -> None:
    old = path.read_text(encoding="utf-8")
    if old == text:
        return
    backup(path)
    path.write_text(text, encoding="utf-8")
    changed.append(path)

def restore() -> None:
    for path in changed:
        src = backup_root / path.relative_to(ROOT)
        if src.exists():
            shutil.copy2(src, path)

def remove_marker_block(text: str) -> str:
    start = text.find(MARKER)
    if start == -1:
        return text

    brace = text.find("{", start)
    if brace == -1:
        raise RuntimeError("Found Pioneers' Land marker but no opening brace.")

    depth = 0
    end = None

    for i in range(brace, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    if end is None:
        raise RuntimeError("Could not find the end of the existing Pioneers' Land block.")

    while end < len(text) and text[end] in "\r\n":
        end += 1

    return text[:start].rstrip() + "\n\n" + text[end:].lstrip()

def undo_old_emberforge_inheritance(text: str) -> str:
    return text.replace(
        ':is([data-portal-skin="emberforge"], [data-portal-skin="pioneers-land"])',
        '[data-portal-skin="emberforge"]',
    )

def clone_cambion_selectors(text: str) -> str:
    pair = ':is([data-portal-skin="rose-nocturne"], [data-portal-skin="pioneers-land"])'

    # Normalize reruns.
    text = text.replace(pair, '[data-portal-skin="rose-nocturne"]')

    count = text.count('[data-portal-skin="rose-nocturne"]')
    if count == 0:
        raise RuntimeError("Could not find Rose Nocturne/Cambion selectors.")

    return text.replace(
        '[data-portal-skin="rose-nocturne"]',
        pair,
    )

def patch_accent_map(text: str, label: str) -> str:
    text = re.sub(
        r'^\s*"pioneers-land"\s*:\s*"#[0-9a-fA-F]{6}",\s*\r?\n',
        '',
        text,
        flags=re.MULTILINE,
    )

    needle = '  "rose-nocturne": "#c67c69",'
    if needle not in text:
        raise RuntimeError(f"Could not find Rose Nocturne accent map in {label}.")

    return text.replace(
        needle,
        needle + f'\n  "pioneers-land": "{ACCENT_HEX}",',
        1,
    )

try:
    for css_file in CSS_FILES:
        original = css_file.read_text(encoding="utf-8")

        next_text = remove_marker_block(original)
        next_text = undo_old_emberforge_inheritance(next_text)
        next_text = clone_cambion_selectors(next_text)
        next_text = next_text.rstrip() + "\n\n" + PALETTE_BLOCK.strip() + "\n"

        if next_text.count("{") != next_text.count("}"):
            raise RuntimeError(f"Brace mismatch in {css_file.relative_to(ROOT)}.")

        write(css_file, next_text)

    for tsx_file in ACCENT_FILES:
        original = tsx_file.read_text(encoding="utf-8")
        next_text = patch_accent_map(original, str(tsx_file.relative_to(ROOT)))
        write(tsx_file, next_text)

    validator = r'''
const fs = require("fs");
const postcss = require("postcss");
const ts = require("typescript");

for (const file of process.argv.slice(1)) {
  const text = fs.readFileSync(file, "utf8");

  if (file.endsWith(".css")) {
    postcss.parse(text, { from: file });
    continue;
  }

  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  if (sf.parseDiagnostics.length) {
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
    fail(f"{exc}\nAll files changed by this patch were restored.")

print("\nPIONEERS' LAND — CAMBION CLONE APPLIED")
print("Structure/backgrounds/panels/hovers: Rose Nocturne (Cambion) clone")
print("C1: #D6AD5B — gold")
print("C2: #A04E30 — red bronze")
print("Activity accent: #D6AD5B")
print("\nChanged files:")
for p in changed:
    print("  " + str(p.relative_to(ROOT)))
print("\nBackup:")
print("  .pioneers-land-cambion-clone-backup/")
print("\nNEXT:")
print("  npm run build")
