from pathlib import Path
import sys

ROOT = Path.cwd()
LIVE = ROOT / "components/characters/live-character-sheet-refresh.tsx"
TROPHIES = ROOT / "components/characters/character-trophies-display.tsx"

def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)

def read(path):
    if not path.exists():
        fail(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")

def write(path, text):
    path.write_text(text, encoding="utf-8")
    print(f"UPDATED: {path.relative_to(ROOT)}")

def patch_live_refresh():
    text = read(LIVE)
    old_refresh = '          if (!disposed) {\n            router.refresh();\n          }'
    new_refresh = '          if (!disposed) {\n            const currentUrl =\n              `${window.location.pathname}${window.location.search}${window.location.hash}`;\n\n            router.replace(\n              currentUrl,\n              {\n                scroll: false,\n              },\n            );\n          }'
    if old_refresh in text:
        text = text.replace(old_refresh, new_refresh, 1)
    elif "const currentUrl =" not in text:
        fail("Could not patch live refresh target.")
    old_interval = '    const fallbackInterval = window.setInterval(() => {\n      if (document.visibilityState === "visible") refreshSheet();\n    }, 5000);\n\n'
    if old_interval in text:
        text = text.replace(old_interval, "", 1)
    text = text.replace("      window.clearInterval(fallbackInterval);\n\n", "", 1)
    if "setInterval" in text and "5000" in text:
        fail("5-second polling still present.")
    write(LIVE, text)

def patch_trophies():
    text = read(TROPHIES)
    old_0 = 'className="border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-120d0a))]"'
    new_0 = 'className="bg-[rgb(var(--sep-colour-120d0a))]"'
    text = text.replace(old_0, new_0)
    old_1 = 'className="border-b border-[rgb(var(--sep-colour-5d452d))]/45 bg-[rgb(var(--sep-colour-17110d))] px-4 py-4 sm:px-5"'
    new_1 = 'className="bg-[rgb(var(--sep-colour-17110d))] px-4 py-4 sm:px-5"'
    text = text.replace(old_1, new_1)
    old_2 = 'className="border border-[rgb(var(--sep-colour-665038))]/55 bg-[rgb(var(--sep-colour-0e0a08))] px-4 py-2 text-right"'
    new_2 = 'className="bg-[rgb(var(--sep-colour-0e0a08))] px-4 py-2 text-right"'
    text = text.replace(old_2, new_2)
    old_3 = 'className="border border-[rgb(var(--sep-colour-5b452f))]/45 bg-[rgb(var(--sep-colour-15100d))]"'
    new_3 = 'className="bg-[rgb(var(--sep-colour-15100d))]"'
    text = text.replace(old_3, new_3)
    old_4 = 'className="flex items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-503c29))]/40 px-3 py-2.5 sm:px-4"'
    new_4 = 'className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4"'
    text = text.replace(old_4, new_4)
    old_card = '                        <article\n                          key={trophy.id}\n                          className={`relative overflow-hidden border p-3 ${\n                            earned\n                              ? "border-[rgb(var(--sep-colour-80613b))]/65 bg-[rgb(var(--sep-colour-21170f))]"\n                              : "border-[rgb(var(--sep-colour-493a2a))]/40 bg-[rgb(var(--sep-colour-100c09))] opacity-75"\n                          }`}\n                        >'
    new_card = '                        <article\n                          key={trophy.id}\n                          data-sep-interactive-surface="card"\n                          className={`relative overflow-hidden p-3 transition-transform duration-200 ${\n                            earned\n                              ? "bg-[rgb(var(--sep-colour-21170f))]"\n                              : "bg-[rgb(var(--sep-colour-100c09))] opacity-75"\n                          }`}\n                        >'
    if old_card in text:
        text = text.replace(old_card, new_card, 1)
    elif 'data-sep-interactive-surface="card"' not in text:
        fail("Could not patch Trophy card interaction surface.")
    old_icon = 'className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border ${\n                                  earned\n                                    ? "border-[rgb(var(--sep-colour-80613b))]/55 bg-[rgb(var(--sep-colour-100c09))]"\n                                    : "border-[rgb(var(--sep-colour-493a2a))]/45 bg-[rgb(var(--sep-colour-0b0807))]"\n                                }`}'
    new_icon = 'className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden ${\n                                  earned\n                                    ? "bg-[rgb(var(--sep-colour-100c09))]"\n                                    : "bg-[rgb(var(--sep-colour-0b0807))]"\n                                }`}'
    if old_icon in text:
        text = text.replace(old_icon, new_icon, 1)
    old_status = 'className={`shrink-0 border px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${\n                                earned\n                                  ? "border-[rgb(var(--sep-colour-8b6a3e))]/65 text-[rgb(var(--sep-colour-d1ae72))]"\n                                  : "border-[rgb(var(--sep-colour-4c4033))]/55 text-[rgb(var(--sep-colour-6f6559))]"\n                              }`}'
    new_status = 'className={`shrink-0 px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${\n                                earned\n                                  ? "bg-[rgb(var(--sep-colour-2a1d12))] text-[rgb(var(--sep-colour-d1ae72))]"\n                                  : "bg-[rgb(var(--sep-colour-0b0807))] text-[rgb(var(--sep-colour-6f6559))]"\n                              }`}'
    if old_status in text:
        text = text.replace(old_status, new_status, 1)
    write(TROPHIES, text)

def main():
    for path in (LIVE, TROPHIES):
        if not path.exists():
            fail(f"Run from repo root. Missing: {path.relative_to(ROOT)}")
    print("Fixing Trophy visuals + character tab refresh...")
    print("Built against commit 462aae3.")
    print("No GitHub or Vercel operations are performed.\n")
    patch_live_refresh()
    patch_trophies()
    print("\nSUCCESS.")
    print("Run: npm run build")

if __name__ == "__main__":
    main()