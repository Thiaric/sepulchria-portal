from pathlib import Path
import subprocess

BASE = '5d2fc37'
PATH = Path('app/(portal)/crafting/crafting-workbench.tsx')

head = subprocess.run(["git","rev-parse","--short","HEAD"], check=True, capture_output=True, text=True, encoding="utf-8").stdout.strip()
if not head.startswith(BASE):
    raise SystemExit(f"This patch expects HEAD {BASE}; current HEAD is {head}. No files were changed.")

if not PATH.exists():
    raise SystemExit("Missing crafting-workbench.tsx. No files were changed.")

text = PATH.read_text(encoding="utf-8")

old_0 = 'const CRAFTING_SKIN_ACCENTS: Record<string, string> = {\n  sepulchria: "#b68b4f",'
new_0 = 'const LIGHT_CRAFTING_SKINS = new Set([\n  "vellum",\n  "aelari-dawn",\n  "birdfolks-sky",\n  "ashen",\n  "dwarven-deep",\n  "mortal-hearth",\n  "wolfs-moon",\n]);\n\nconst CRAFTING_SKIN_ACCENTS: Record<string, string> = {\n  sepulchria: "#b68b4f",'
expected_0 = 1
actual_0 = text.count(old_0)
if actual_0 != expected_0:
    raise SystemExit(f"Replacement 0 expected {expected_0} match(es), found {actual_0}. No files were changed.")
text = text.replace(old_0, new_0, expected_0)

old_1 = '  const craftingAccent =\n    CRAFTING_SKIN_ACCENTS[skin] ??\n    CRAFTING_SKIN_ACCENTS.sepulchria;\n\n  const [isPending, startTransition] ='
new_1 = '  const craftingAccent =\n    CRAFTING_SKIN_ACCENTS[skin] ??\n    CRAFTING_SKIN_ACCENTS.sepulchria;\n\n  const lightCraftingSkin =\n    LIGHT_CRAFTING_SKINS.has(skin);\n\n  const craftingLineAccent =\n    lightCraftingSkin\n      ? `color-mix(in srgb, ${craftingAccent} 38%, rgb(var(--sep-colour-4e402f)))`\n      : craftingAccent;\n\n  const craftingPanelSurface =\n    "color-mix(in srgb, rgb(var(--sep-colour-120d0a)) 88%, rgb(var(--sep-colour-4e402f)) 12%)";\n\n  const craftingCardSurface =\n    "color-mix(in srgb, rgb(var(--sep-colour-120d0a)) 82%, rgb(var(--sep-colour-4e402f)) 18%)";\n\n  const craftingBenchSurface =\n    "color-mix(in srgb, rgb(var(--sep-colour-0d0907)) 72%, rgb(var(--sep-colour-4e402f)) 28%)";\n\n  const [isPending, startTransition] ='
expected_1 = 1
actual_1 = text.count(old_1)
if actual_1 != expected_1:
    raise SystemExit(f"Replacement 1 expected {expected_1} match(es), found {actual_1}. No files were changed.")
text = text.replace(old_1, new_1, expected_1)

old_2 = '        style={{\n          borderColor: `color-mix(in srgb, ${craftingAccent} 32%, transparent)`,\n          boxShadow: "0 12px 30px rgba(0,0,0,0.18)",\n        }}'
new_2 = '        style={{\n          borderColor: `color-mix(in srgb, ${craftingLineAccent} 42%, transparent)`,\n          backgroundColor:\n            lightCraftingSkin\n              ? craftingPanelSurface\n              : undefined,\n          boxShadow: lightCraftingSkin\n            ? "0 12px 30px rgba(0,0,0,0.12), inset 0 0 18px rgba(0,0,0,0.035)"\n            : "0 12px 30px rgba(0,0,0,0.18)",\n        }}'
expected_2 = 2
actual_2 = text.count(old_2)
if actual_2 != expected_2:
    raise SystemExit(f"Replacement 2 expected {expected_2} match(es), found {actual_2}. No files were changed.")
text = text.replace(old_2, new_2, expected_2)

old_3 = '                  backgroundColor: "transparent",\n                  backdropFilter: "none",\n                  boxShadow: active\n                    ? `inset 3px 0 0 ${craftingAccent}, 0 5px 14px rgba(0,0,0,0.16)`\n                    : "0 3px 10px rgba(0,0,0,0.11)",'
new_3 = '                  backgroundColor:\n                    lightCraftingSkin\n                      ? active\n                        ? `color-mix(in srgb, ${craftingCardSurface} 88%, ${craftingLineAccent} 12%)`\n                        : craftingCardSurface\n                      : "transparent",\n                  backdropFilter: "none",\n                  boxShadow: active\n                    ? `inset 3px 0 0 ${craftingLineAccent}, 0 5px 14px rgba(0,0,0,0.16)`\n                    : lightCraftingSkin\n                      ? "0 3px 10px rgba(0,0,0,0.08), inset 0 0 10px rgba(0,0,0,0.025)"\n                      : "0 3px 10px rgba(0,0,0,0.11)",'
expected_3 = 1
actual_3 = text.count(old_3)
if actual_3 != expected_3:
    raise SystemExit(f"Replacement 3 expected {expected_3} match(es), found {actual_3}. No files were changed.")
text = text.replace(old_3, new_3, expected_3)

old_4 = '                    backgroundColor: "transparent",\n                    opacity: usedByRecipe || draggedItemId === item.id ? 1 : 0.78,\n                    boxShadow:\n                      draggedItemId === item.id\n                        ? `0 0 16px color-mix(in srgb, ${craftingAccent} 16%, transparent)`\n                        : usedByRecipe\n                          ? `0 4px 13px rgba(0,0,0,0.16), inset 0 0 12px color-mix(in srgb, ${craftingAccent} 4%, transparent)`\n                          : "0 2px 8px rgba(0,0,0,0.10)",'
new_4 = '                    backgroundColor:\n                      lightCraftingSkin\n                        ? craftingCardSurface\n                        : "transparent",\n                    opacity: usedByRecipe || draggedItemId === item.id ? 1 : 0.78,\n                    boxShadow:\n                      draggedItemId === item.id\n                        ? `0 0 16px color-mix(in srgb, ${craftingLineAccent} 18%, transparent)`\n                        : usedByRecipe\n                          ? `0 4px 13px rgba(0,0,0,0.14), inset 0 0 12px color-mix(in srgb, ${craftingLineAccent} 6%, transparent)`\n                          : lightCraftingSkin\n                            ? "0 2px 8px rgba(0,0,0,0.07), inset 0 0 10px rgba(0,0,0,0.02)"\n                            : "0 2px 8px rgba(0,0,0,0.10)",'
expected_4 = 1
actual_4 = text.count(old_4)
if actual_4 != expected_4:
    raise SystemExit(f"Replacement 4 expected {expected_4} match(es), found {actual_4}. No files were changed.")
text = text.replace(old_4, new_4, expected_4)

old_5 = '        style={{\n          borderColor: `color-mix(in srgb, ${craftingAccent} 42%, transparent)`,\n          boxShadow: `0 18px 42px rgba(0,0,0,0.24), 0 0 24px color-mix(in srgb, ${craftingAccent} 6%, transparent)`,\n        }}'
new_5 = '        style={{\n          borderColor: `color-mix(in srgb, ${craftingLineAccent} 52%, transparent)`,\n          backgroundColor:\n            lightCraftingSkin\n              ? craftingPanelSurface\n              : undefined,\n          boxShadow: lightCraftingSkin\n            ? `0 18px 42px rgba(0,0,0,0.13), 0 0 24px color-mix(in srgb, ${craftingLineAccent} 7%, transparent)`\n            : `0 18px 42px rgba(0,0,0,0.24), 0 0 24px color-mix(in srgb, ${craftingAccent} 6%, transparent)`,\n        }}'
expected_5 = 1
actual_5 = text.count(old_5)
if actual_5 != expected_5:
    raise SystemExit(f"Replacement 5 expected {expected_5} match(es), found {actual_5}. No files were changed.")
text = text.replace(old_5, new_5, expected_5)

old_6 = '              borderColor: `color-mix(in srgb, ${craftingAccent} 25%, transparent)`,\n              backgroundColor: "transparent",\n              backgroundImage: `url("/pattern/wooden.png")`,\n              backgroundSize: "cover",\n              backgroundPosition: "center",\n              backgroundRepeat: "no-repeat",\n              boxShadow:\n                "inset 0 0 24px rgba(0,0,0,0.18)",'
new_6 = '              borderColor: `color-mix(in srgb, ${craftingLineAccent} 38%, transparent)`,\n              backgroundColor:\n                lightCraftingSkin\n                  ? craftingBenchSurface\n                  : "transparent",\n              backgroundImage: `url("/pattern/wooden.png")`,\n              backgroundSize: "cover",\n              backgroundPosition: "center",\n              backgroundRepeat: "no-repeat",\n              backgroundBlendMode:\n                lightCraftingSkin\n                  ? "multiply"\n                  : "normal",\n              boxShadow: lightCraftingSkin\n                ? `inset 0 0 34px color-mix(in srgb, ${craftingLineAccent} 16%, transparent), inset 0 0 24px rgba(0,0,0,0.12)`\n                : "inset 0 0 24px rgba(0,0,0,0.18)",'
expected_6 = 1
actual_6 = text.count(old_6)
if actual_6 != expected_6:
    raise SystemExit(f"Replacement 6 expected {expected_6} match(es), found {actual_6}. No files were changed.")
text = text.replace(old_6, new_6, expected_6)

old_7 = 'style={{ borderColor: `color-mix(in srgb, ${craftingAccent} 13%, transparent)` }}'
new_7 = 'style={{ borderColor: `color-mix(in srgb, ${craftingLineAccent} ${lightCraftingSkin ? 30 : 13}%, transparent)` }}'
expected_7 = 1
actual_7 = text.count(old_7)
if actual_7 != expected_7:
    raise SystemExit(f"Replacement 7 expected {expected_7} match(es), found {actual_7}. No files were changed.")
text = text.replace(old_7, new_7, expected_7)

old_8 = 'style={{ borderColor: `color-mix(in srgb, ${craftingAccent} 18%, transparent)` }}'
new_8 = 'style={{ borderColor: `color-mix(in srgb, ${craftingLineAccent} ${lightCraftingSkin ? 38 : 18}%, transparent)` }}'
expected_8 = 1
actual_8 = text.count(old_8)
if actual_8 != expected_8:
    raise SystemExit(f"Replacement 8 expected {expected_8} match(es), found {actual_8}. No files were changed.")
text = text.replace(old_8, new_8, expected_8)

old_9 = '                      backgroundColor: "transparent",\n                      boxShadow: filled\n                        ? `0 0 18px color-mix(in srgb, ${craftingAccent} 13%, transparent), inset 0 0 14px color-mix(in srgb, ${craftingAccent} 6%, transparent)`\n                        : "none",'
new_9 = '                      backgroundColor:\n                        lightCraftingSkin\n                          ? craftingCardSurface\n                          : "transparent",\n                      boxShadow: filled\n                        ? `0 0 18px color-mix(in srgb, ${craftingLineAccent} 16%, transparent), inset 0 0 14px color-mix(in srgb, ${craftingLineAccent} 8%, transparent)`\n                        : lightCraftingSkin\n                          ? "0 3px 10px rgba(0,0,0,0.07), inset 0 0 10px rgba(0,0,0,0.025)"\n                          : "none",'
expected_9 = 1
actual_9 = text.count(old_9)
if actual_9 != expected_9:
    raise SystemExit(f"Replacement 9 expected {expected_9} match(es), found {actual_9}. No files were changed.")
text = text.replace(old_9, new_9, expected_9)

PATH.write_text(text, encoding="utf-8")
print("SUCCESS")
print("")
print("Crafting light-skin treatment added.")
print("Dark skins keep their existing styling.")
print("Light skins now get:")
print("  - deeper recipe/material cards")
print("  - stronger skin-derived borders")
print("  - darker workbench ground behind the wood texture")
print("  - stronger geometric guide lines")
print("  - more legible ingredient/result slots")
print("")
print("Run: npm run build")
