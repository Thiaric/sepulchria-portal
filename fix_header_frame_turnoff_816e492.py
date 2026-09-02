from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "816e492"
TARGET = ROOT / "app/(portal)/layout.tsx"

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

old = '''              /*
               * DESKTOP / LAPTOP
               */
              @media (min-width: 1024px) {
                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a) {
                  position: relative;
                  isolation: isolate;
                  overflow: visible;
                }

                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a)::after {
                  content: "";
                  position: absolute;
                  z-index: 8;
                  inset: -3px;
                  border: 8px solid transparent;
                  border-image-source: var(--sep-cosmetic-header-control-frame);
                  border-image-slice: 18%;
                  border-image-width: 1;
                  border-image-repeat: stretch;
                  pointer-events: none;
                  filter: drop-shadow(0 2px 5px rgba(0,0,0,.42));
                }

'''

new = '''              /*
               * DESKTOP / LAPTOP
               *
               * Header-control cosmetics are intentionally NOT repeated
               * here. Their permanent frame already lives on ::before
               * above, while ::after remains available to the shared
               * interaction/hover layer.
               */
              @media (min-width: 1024px) {
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"Expected exactly 1 duplicate desktop header-frame block, found {count}. "
        "Nothing changed."
    )

TARGET.write_text(text.replace(old, new, 1), encoding="utf-8")

print("✓ app/(portal)/layout.tsx")
print("  - removed duplicate desktop header frame from ::after")
print("  - permanent header frame remains on ::before")
print("  - hover/interaction ::after is now free again")
print("  - existing desktop ::before inset/border sizing untouched")
print("  - badges and all other portal cosmetics untouched")
