#!/usr/bin/env python3
"""
Sepulchria — make Room Music progress/volume sliders follow the active portal skin.

Targets commit: 72b6816
Changes only:
  app/(portal)/game/components/RoomMusicPlayer.tsx

The sliders currently hard-code the standard gold accent:
  accent-[rgb(var(--sep-colour-a77b43))]

This replaces it with the active skin primary colour:
  rgb(var(--sep-skin-c1, var(--sep-colour-a98a60)))

No music behaviour is changed.
"""

from pathlib import Path

path = Path("app/(portal)/game/components/RoomMusicPlayer.tsx")

if not path.exists():
    raise SystemExit(
        "\nPATCH STOPPED: Run this from the sepulchria-portal project root.\n"
    )

text = path.read_text(encoding="utf-8")

old = 'className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-colour-a77b43))] disabled:cursor-not-allowed disabled:opacity-40"'
new = 'className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-skin-c1,var(--sep-colour-a98a60)))] disabled:cursor-not-allowed disabled:opacity-40"'

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: progress slider: expected 1 match, found {count}. "
        "This patch targets commit 72b6816.\n"
    )

text = text.replace(old, new, 1)

old = 'className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-colour-a77b43))]"'
new = 'className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-skin-c1,var(--sep-colour-a98a60)))]"'

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: volume slider: expected 1 match, found {count}. "
        "This patch targets commit 72b6816.\n"
    )

text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8", newline="\n")

print("✓ Music progress slider now uses the active skin primary colour.")
print("✓ Music volume slider now uses the active skin primary colour.")
print("\nPATCH COMPLETE")
print("\nRun: npm run build")
