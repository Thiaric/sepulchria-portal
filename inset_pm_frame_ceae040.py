from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "ceae040"
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

old = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after {
        inset: 2px;
        border: 12px solid transparent;
        border-image-source: var(--sep-cosmetic-pm-frame);
        border-image-slice: 14% 9%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
'''

new = '''      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after {
        /*
         * Keep the PM ornament comfortably inside the message card.
         * Vertical and horizontal inset are independent so the frame
         * does not feel cramped against the outer message border.
         */
        inset: 6px 8px;
        border: 12px solid transparent;
        border-image-source: var(--sep-cosmetic-pm-frame);
        border-image-slice: 14% 9%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"Expected exactly 1 PM frame block, found {count}. "
        "Nothing changed."
    )

text = text.replace(old, new, 1)
TARGET.write_text(text, encoding="utf-8")

print("✓ components/cosmetics/cosmetic-runtime.tsx")
print("  - PM frame inset changed from 2px to 6px 8px")
print("  - message padding/layout untouched")
print("  - forum, instant chat, portrait, and other cosmetics untouched")
