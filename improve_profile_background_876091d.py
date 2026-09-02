from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "876091d"
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

old = '''      /* ---------------------------------------------------------------
       * PROFILE BACKGROUND
       * Decorative texture stays behind the existing sheet UI.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"] {
        position: relative;
        isolation: isolate;
        background-image:
          linear-gradient(
            rgba(4,7,13,.62),
            rgba(4,7,13,.72)
          ),
          var(--sep-cosmetic-profile-background);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-blend-mode: normal;
      }
'''

new = '''      /* ---------------------------------------------------------------
       * PROFILE BACKGROUND
       *
       * The artwork is its own layer INSIDE the sheet-frame border.
       * This makes a 2400×1600 profile background align with the same
       * inner rectangle as the equipped sheet frame, instead of being
       * painted underneath the border itself.
       *
       * Only panel BACKGROUNDS become translucent. We never set opacity
       * on a content container, so text/icons/borders remain fully opaque.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"] {
        position: relative;
        isolation: isolate;
        background: transparent !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]::before {
        content: "";
        position: absolute;
        z-index: -1;
        inset: 0;
        background-image:
          linear-gradient(
            rgba(4,7,13,.16),
            rgba(4,7,13,.24)
          ),
          var(--sep-cosmetic-profile-background);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        pointer-events: none;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-17110d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-15100d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-120e0b))]"] {
        background-color:
          rgb(var(--sep-colour-090705) / 20%) !important;
      }
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"Expected exactly 1 profile-background CSS block, found {count}. "
        "Nothing changed."
    )

TARGET.write_text(text.replace(old, new, 1), encoding="utf-8")

print("✓ Profile background presentation updated")
print("  - artwork moved to its own ::before layer")
print("  - artwork now starts at the inner edge of the sheet frame")
print("  - dark character-sheet panels become 20% opaque only while a profile background is equipped")
print("  - text/icons/borders/buttons/inputs/portraits remain fully opaque")
print("  - no-background character sheets remain unchanged")
