from pathlib import Path
import sys

ROOT = Path.cwd()
TARGET = ROOT / "components/characters/character-audit-trail.tsx"

def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)

def main():
    if not TARGET.exists():
        fail(f"Run from repo root. Missing: {TARGET.relative_to(ROOT)}")
    text = TARGET.read_text(encoding="utf-8")
    old_effect = (
        '  useEffect(() => {\n'
        '    function handleTab(\n'
        '      event: Event,\n'
        '    ) {\n'
        '      const customEvent =\n'
        '        event as CustomEvent<string>;\n\n'
        '      if (\n'
        '        customEvent.detail ===\n'
        '        "audit"\n'
        '      ) {\n'
        '        void load();\n'
        '      }\n'
        '    }\n\n'
        '    window.addEventListener(\n'
        '      "sepulchria-character-sheet-tab",\n'
        '      handleTab,\n'
        '    );\n\n'
        '    return () => {\n'
        '      window.removeEventListener(\n'
        '        "sepulchria-character-sheet-tab",\n'
        '        handleTab,\n'
        '      );\n'
        '    };\n'
        '  }, [load]);'
    )
    new_effect = (
        '  useEffect(() => {\n'
        '    void load();\n'
        '  }, [load]);'
    )
    if old_effect in text:
        text = text.replace(old_effect, new_effect, 1)
    elif new_effect not in text:
        fail("Could not find old Character Log loader.")
    old_idle = (
        '      {state === "idle" ? (\n'
        '        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">\n'
        '          Open this tab to load the Character Log.\n'
        '        </p>\n'
        '      ) : null}\n\n'
    )
    if old_idle in text:
        text = text.replace(old_idle, "", 1)
    TARGET.write_text(text, encoding="utf-8")
    print("UPDATED: components\\characters\\character-audit-trail.tsx")
    print("\nSUCCESS.")
    print("Character Log now loads immediately when LOG mounts.")
    print("Applies to both own and staff-view character Logs.")
    print("\nNow run:")
    print("  npm run build")

if __name__ == "__main__":
    main()