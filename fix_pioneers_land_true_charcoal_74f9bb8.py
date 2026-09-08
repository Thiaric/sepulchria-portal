from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path.cwd()
EXPECTED_HEAD = "74f9bb8afe3cc723e86f215fe03c3e166546e63a"

CSS_FILES = [
    ROOT / "components" / "sepulchria" / "sep-ui-unified.css",
    ROOT / "app" / "portal-themes.css",
]
LAYOUT = ROOT / "app" / "(portal)" / "layout.tsx"

CSS_MARKER_START = "/* PIONEERS' LAND — TRUE CHARCOAL OVERRIDE START */"
CSS_MARKER_END = "/* PIONEERS' LAND — TRUE CHARCOAL OVERRIDE END */"
LAYOUT_MARKER_START = "/* PIONEERS' LAND — SHELL CHARCOAL OVERRIDE START */"
LAYOUT_MARKER_END = "/* PIONEERS' LAND — SHELL CHARCOAL OVERRIDE END */"

BACKUP = ROOT / ".pioneers-land-true-charcoal-backup"

CHARCOAL_BLOCK = """
/* PIONEERS' LAND — TRUE CHARCOAL OVERRIDE START */
html[data-portal-skin="pioneers-land"],
body[data-portal-skin="pioneers-land"],
.portal-skin-scope[data-portal-skin="pioneers-land"] {
  --sep-skin-c1: 214 173 91;
  --sep-skin-c2: 160 78 48;
  --sep-global-c1: 214 173 91;
  --sep-global-c2: 160 78 48;
  --sep-skin-nav-link: 214 173 91;

  --sep-colour-050403: 7 8 10;
  --sep-colour-090705: 9 10 12;
  --sep-colour-090706: 9 10 12;
  --sep-colour-0b0806: 10 11 13;
  --sep-colour-0b0807: 10 11 13;
  --sep-colour-0c0907: 11 12 14;
  --sep-colour-0d0907: 12 13 15;
  --sep-colour-0d0a08: 12 13 15;
  --sep-colour-0d0b0a: 13 14 16;
  --sep-colour-0e0a08: 14 15 17;
  --sep-colour-0f0b08: 15 16 18;
  --sep-colour-100c09: 16 17 19;
  --sep-colour-110c09: 17 18 20;
  --sep-colour-120d09: 18 19 21;
  --sep-colour-120d0a: 18 19 21;
  --sep-colour-120f0d: 14 15 17;
  --sep-colour-130e0b: 19 20 22;
  --sep-colour-15100c: 20 21 23;
  --sep-colour-15100d: 21 22 24;
  --sep-colour-16100c: 22 23 25;
  --sep-colour-17100c: 23 24 26;
  --sep-colour-17110d: 24 25 27;
  --sep-colour-17120f: 25 26 28;
  --sep-colour-18110d: 26 27 29;
  --sep-colour-19120d: 27 28 30;
  --sep-colour-1a120d: 28 29 31;
  --sep-colour-1b130d: 29 30 32;
  --sep-colour-1b140f: 30 31 33;
  --sep-colour-1d150f: 31 32 34;
  --sep-colour-20170f: 33 34 36;
  --sep-colour-21170f: 35 36 38;
  --sep-colour-21190f: 36 37 39;
  --sep-colour-24180f: 38 39 41;
  --sep-colour-261b12: 40 41 43;
  --sep-colour-2a1d12: 43 44 46;
  --sep-colour-2b1d12: 45 46 48;
  --sep-colour-332317: 50 51 53;
  --sep-colour-3b2919: 56 57 59;
}
/* PIONEERS' LAND — TRUE CHARCOAL OVERRIDE END */
"""

LAYOUT_BLOCK = """
              /* PIONEERS' LAND — SHELL CHARCOAL OVERRIDE START */
              html[data-portal-skin="pioneers-land"] [data-portal-shell],
              body[data-portal-skin="pioneers-land"] [data-portal-shell] {
                background: rgb(14 15 17) !important;
              }

              html[data-portal-skin="pioneers-land"] [data-portal-shell-inner],
              body[data-portal-skin="pioneers-land"] [data-portal-shell-inner] {
                background:
                  radial-gradient(
                    circle at top,
                    rgb(var(--sep-skin-c1) / 0.055),
                    transparent 38%
                  ),
                  linear-gradient(
                    to bottom,
                    rgb(23 24 27),
                    rgb(11 12 14)
                  ) !important;
              }

              html[data-portal-skin="pioneers-land"] .portal-left-shell > aside,
              body[data-portal-skin="pioneers-land"] .portal-left-shell > aside,
              html[data-portal-skin="pioneers-land"] .portal-right-shell > aside,
              body[data-portal-skin="pioneers-land"] .portal-right-shell > aside {
                background-color: rgb(14 15 17) !important;
              }
              /* PIONEERS' LAND — SHELL CHARCOAL OVERRIDE END */
"""

def fail(message: str) -> None:
    print("\nSTOPPED:", message, file=sys.stderr)
    sys.exit(1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
except Exception:
    fail("Could not read git HEAD.")

if head != EXPECTED_HEAD:
    fail(f"This patch is locked to {EXPECTED_HEAD[:7]}; current HEAD is {head[:7]}.")

for p in [*CSS_FILES, LAYOUT]:
    if not p.exists():
        fail(f"Missing expected file: {p.relative_to(ROOT)}")

if BACKUP.exists():
    shutil.rmtree(BACKUP)
BACKUP.mkdir(parents=True)

changed = []

def backup(path: Path) -> None:
    dest = BACKUP / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

def write(path: Path, text: str) -> None:
    old = path.read_text(encoding="utf-8")
    if old == text:
        return
    backup(path)
    path.write_text(text, encoding="utf-8")
    changed.append(path)

def restore() -> None:
    for path in changed:
        src = BACKUP / path.relative_to(ROOT)
        if src.exists():
            shutil.copy2(src, path)

def strip_marked_block(text: str, start: str, end: str) -> str:
    return re.sub(
        re.escape(start) + r".*?" + re.escape(end),
        "",
        text,
        flags=re.DOTALL,
    )

try:
    for css_file in CSS_FILES:
        text = css_file.read_text(encoding="utf-8")
        text = strip_marked_block(text, CSS_MARKER_START, CSS_MARKER_END).rstrip()
        text += "\n\n" + CHARCOAL_BLOCK.strip() + "\n"

        if text.count("{") != text.count("}"):
            raise RuntimeError(f"Brace mismatch in {css_file.relative_to(ROOT)}.")

        write(css_file, text)

    text = LAYOUT.read_text(encoding="utf-8")
    text = strip_marked_block(text, LAYOUT_MARKER_START, LAYOUT_MARKER_END)

    anchor = """              .portal-left-shell,
              .portal-right-shell {
                display: contents;
              }
"""

    if text.count(anchor) != 1:
        raise RuntimeError(
            "Could not locate the exact portal shell CSS anchor in app/(portal)/layout.tsx."
        )

    text = text.replace(anchor, anchor + "\n" + LAYOUT_BLOCK, 1)
    write(LAYOUT, text)

    validator = r"""
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
    ts.ScriptKind.TSX
  );

  if (sf.parseDiagnostics.length) {
    console.error(sf.parseDiagnostics);
    process.exit(1);
  }
}
"""

    subprocess.run(
        ["node", "-e", validator, *[str(p) for p in changed]],
        cwd=ROOT,
        check=True,
    )

except Exception as exc:
    restore()
    fail(str(exc) + "\nAll files changed by this patch were restored.")

print("\nPIONEERS' LAND TRUE CHARCOAL PATCH APPLIED")
print("C1: #D6AD5B — gold")
print("C2: #A04E30 — red bronze")
print("Background: neutral charcoal/graphite")
print("\nChanged files:")
for p in changed:
    print("  " + str(p.relative_to(ROOT)))
print("\nBackup:")
print("  .pioneers-land-true-charcoal-backup/")
print("\nNEXT:")
print("  npm run build")
