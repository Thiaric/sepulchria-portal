from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "f1377b4"
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

anchor = """              .portal-left-collapse-toggle,
              .portal-right-collapse-toggle {
                display: none;
              }
"""

addition = r"""
              /*
               * HEADER CONTROL COSMETIC FRAME
               *
               * Keep the ornamental frame separate from the shared
               * interaction layer: interaction lighting uses ::after,
               * while the permanent cosmetic frame lives on ::before.
               *
               * The frame is always visible while equipped and sits
               * slightly outside the control without changing control
               * geometry, hover behaviour, focus behaviour, or clicks.
               */
              [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                [data-cosmetic-header-controls] :is(button,a) {
                position: relative;
                isolation: isolate;
                overflow: visible;
              }

              [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                [data-cosmetic-header-controls] :is(button,a)::before {
                content: "";
                position: absolute;
                z-index: 8;
                inset: -5px;
                border: 9px solid transparent;
                border-image-source:
                  var(--sep-cosmetic-header-control-frame);
                border-image-slice: 16%;
                border-image-width: 1;
                border-image-repeat: stretch;
                opacity: 1;
                visibility: visible;
                pointer-events: none;
                filter:
                  drop-shadow(0 2px 5px rgba(0,0,0,.42));
              }

              @media (max-width: 1023px) {
                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a)::before {
                  inset: -4px;
                  border-width: 8px;
                }
              }

              @media (min-width: 1024px) {
                [data-portal-shell-inner][data-has-cosmetic-header-controls="true"]
                  [data-cosmetic-header-controls] :is(button,a)::before {
                  inset: -7px;
                  border-width: 10px;
                }
              }
"""

if addition.strip() in text:
    raise SystemExit("Header frame patch already appears to be applied.")

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"Expected exactly 1 insertion anchor, found {count}. "
        "Nothing changed."
    )

text = text.replace(anchor, anchor + addition, 1)
TARGET.write_text(text, encoding="utf-8")

print("✓ app/(portal)/layout.tsx")
print("  - cosmetic header frame now uses ::before")
print("  - frame remains permanently visible while equipped")
print("  - frame extends outside controls")
print("  - shared ::after interaction/hover illumination untouched")
print("  - no calendar or button component files changed")
