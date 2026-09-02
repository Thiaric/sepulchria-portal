from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "816e492"
TARGET = ROOT / "components/cosmetics/cosmetic-runtime.tsx"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

if not TARGET.exists():
    raise SystemExit(f"Missing required file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old = '''      [data-cosmetic-surface="nameplate"][data-has-nameplate="true"] {
        display: inline-block;
        width: fit-content;
        max-width: 100%;
        padding: 6px 30px 6px 16px !important;
        margin-block: -4px 2px;
        overflow: visible;
      }

      [data-cosmetic-surface="nameplate"][data-has-nameplate="true"]::before {
        content: "";
        position: absolute;
        z-index: -1;
        inset: -2px -8px;
        border: 11px solid transparent;
        border-image-source: var(--sep-cosmetic-nameplate);
        border-image-slice: 18% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
        pointer-events: none;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,.38));
      }
'''

new = '''      [data-cosmetic-surface="nameplate"][data-has-nameplate="true"] {
        /*
         * Keep the protected centre around the identity text, but scale
         * the breathing room with the display's own font size.
         * Large profile names therefore get a complete plate while
         * compact identity displays stay compact.
         */
        display: inline-block;
        width: fit-content;
        max-width: 100%;
        padding:
          0.22em
          clamp(16px, 1.05em, 34px)
          0.24em
          clamp(14px, 0.9em, 30px) !important;
        margin-block: -0.12em 0.08em;
        overflow: visible;
      }

      [data-cosmetic-surface="nameplate"][data-has-nameplate="true"]::before {
        content: "";
        position: absolute;
        z-index: -1;

        /*
         * The 1600×320 nameplate is very wide. A deeper vertical slice
         * and independently-sized horizontal/vertical border widths keep
         * the top/bottom rails visible instead of leaving only the large
         * end ornaments.
         */
        inset: -0.18em -0.48em;
        border-style: solid;
        border-color: transparent;
        border-width:
          clamp(8px, 0.55em, 18px)
          clamp(14px, 0.95em, 30px);
        border-image-source: var(--sep-cosmetic-nameplate);
        border-image-slice: 26% 11% fill;
        border-image-width: 1;
        border-image-repeat: stretch;
        pointer-events: none;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,.38));
      }
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"Expected exactly 1 current nameplate CSS block, found {count}. "
        "Nothing changed."
    )

TARGET.write_text(text.replace(old, new, 1), encoding="utf-8")

print("✓ Nameplate geometry fixed against 816e492")
print("  - remains a true 9-slice")
print("  - top/bottom rails receive a deeper source slice")
print("  - border width scales independently vertically/horizontally")
print("  - protected text centre retained")
print("  - profile-size names get a full plate")
print("  - compact PM/Instant Chat identity displays remain proportionate")
print("  - profile crest logic untouched")
