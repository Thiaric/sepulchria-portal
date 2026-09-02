from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "59c904a"
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

anchor = '''              [data-portal-shell-inner][data-has-cosmetic-location-atmosphere="true"]
                [data-game-location-surface] {
                background-image:
                  linear-gradient(
                    rgba(4,7,13,.58),
                    rgba(4,7,13,.66)
                  ),
                  var(--sep-cosmetic-location-atmosphere);
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
              }
'''

replacement = '''              [data-portal-shell-inner][data-has-cosmetic-location-atmosphere="true"]
                [data-game-location-surface] {
                background-image:
                  linear-gradient(
                    rgba(4,7,13,.58),
                    rgba(4,7,13,.66)
                  ),
                  var(--sep-cosmetic-location-atmosphere);
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
              }

              /*
               * LOCATION ATMOSPHERE + CHAT PANEL
               *
               * The atmosphere lives on the outer location surface, while
               * the main chat article normally has a fully opaque dark
               * background. Make ONLY that panel background translucent
               * while a location atmosphere is equipped.
               *
               * Text, messages, controls, borders and the location frame
               * keep their normal opacity.
               */
              [data-portal-shell-inner][data-has-cosmetic-location-atmosphere="true"]
                [data-game-location-surface]
                > article[data-sep-interaction-fixed="true"] {
                background-color:
                  rgb(var(--sep-colour-17110d) / 60%) !important;
              }
'''

count = text.count(anchor)
if count != 1:
    raise SystemExit(
        f"Expected exactly 1 location-atmosphere CSS block, found {count}. "
        "Nothing changed."
    )

TARGET.write_text(text.replace(anchor, replacement, 1), encoding="utf-8")

print("✓ Location atmosphere chat transparency added")
print("  - main chat panel becomes 60% opaque only when location_atmosphere is equipped")
print("  - atmosphere artwork remains on the existing outer location surface")
print("  - location frame untouched")
print("  - text/messages/controls/borders remain fully opaque")
print("  - users without a location atmosphere see no change")
