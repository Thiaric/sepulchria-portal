from pathlib import Path
import subprocess

BASE = '5d2fc37'
PATH = Path('app/(portal)/crafting/crafting-workbench.tsx')
OLD = '                  style={{\n                    borderColor: allSlotsFilled\n                      ? craftingAccent\n                      : `color-mix(in srgb, ${craftingAccent} 38%, transparent)`,\n                    background: `linear-gradient(145deg, color-mix(in srgb, ${craftingAccent} ${allSlotsFilled ? 14 : 6}%, rgb(var(--sep-colour-17110d))), rgb(var(--sep-colour-080605)))`,\n                    boxShadow: allSlotsFilled\n                      ? `0 0 30px color-mix(in srgb, ${craftingAccent} 22%, transparent), inset 0 0 22px color-mix(in srgb, ${craftingAccent} 10%, transparent)`\n                      : "inset 0 0 24px rgba(0,0,0,0.55)",\n                  }}'
NEW = '                  style={{\n                    borderColor: allSlotsFilled\n                      ? craftingLineAccent\n                      : `color-mix(in srgb, ${craftingLineAccent} ${lightCraftingSkin ? 58 : 38}%, transparent)`,\n                    background: lightCraftingSkin\n                      ? `linear-gradient(145deg, color-mix(in srgb, ${craftingBenchSurface} 82%, ${craftingLineAccent} ${allSlotsFilled ? 18 : 10}%), color-mix(in srgb, ${craftingBenchSurface} 90%, rgb(var(--sep-colour-4e402f)) 10%))`\n                      : `linear-gradient(145deg, color-mix(in srgb, ${craftingAccent} ${allSlotsFilled ? 14 : 6}%, rgb(var(--sep-colour-17110d))), rgb(var(--sep-colour-080605)))`,\n                    boxShadow: allSlotsFilled\n                      ? lightCraftingSkin\n                        ? `0 0 30px color-mix(in srgb, ${craftingLineAccent} 24%, transparent), inset 0 0 24px color-mix(in srgb, ${craftingLineAccent} 14%, transparent), inset 0 0 34px rgba(0,0,0,0.10)`\n                        : `0 0 30px color-mix(in srgb, ${craftingAccent} 22%, transparent), inset 0 0 22px color-mix(in srgb, ${craftingAccent} 10%, transparent)`\n                      : lightCraftingSkin\n                        ? `inset 0 0 28px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)`\n                        : "inset 0 0 24px rgba(0,0,0,0.55)",\n                  }}'
INNER_OLD = '                    style={{ borderColor: `color-mix(in srgb, ${craftingAccent} 24%, transparent)` }}'
INNER_NEW = '                    style={{\n                      borderColor: `color-mix(in srgb, ${lightCraftingSkin ? craftingLineAccent : craftingAccent} ${lightCraftingSkin ? 42 : 24}%, transparent)`,\n                    }}'

head = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    check=True,
    capture_output=True,
    text=True,
    encoding="utf-8",
).stdout.strip()

if not head.startswith(BASE):
    raise SystemExit(
        f"This patch expects HEAD {BASE}; current HEAD is {head}. "
        "No files were changed."
    )

if not PATH.exists():
    raise SystemExit("Missing crafting-workbench.tsx. No files were changed.")

text = PATH.read_text(encoding="utf-8")

if "const lightCraftingSkin =" not in text:
    raise SystemExit(
        "The previous Crafting light-skin patch is not present. "
        "No files were changed."
    )

if text.count(OLD) != 1:
    raise SystemExit(
        f"Expected 1 central result-pedestal style block; found {text.count(OLD)}. "
        "No files were changed."
    )

if text.count(INNER_OLD) != 1:
    raise SystemExit(
        f"Expected 1 central result inner-diamond style; found {text.count(INNER_OLD)}. "
        "No files were changed."
    )

text = text.replace(OLD, NEW, 1)
text = text.replace(INNER_OLD, INNER_NEW, 1)

PATH.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Central Crafting result item now receives the light-skin treatment:")
print("  - deeper skin-derived pedestal")
print("  - stronger result border")
print("  - clearer inner diamond")
print("  - stronger but restrained inset glow")
print("")
print("Dark-skin appearance remains unchanged.")
print("Run: npm run build")
