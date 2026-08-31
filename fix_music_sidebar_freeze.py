from pathlib import Path

ROOT = Path.cwd()
context_path = ROOT / "components/admin/music-context-panel.tsx"
manager_path = ROOT / "components/admin/music-feature-manager.tsx"

if not context_path.exists():
    raise SystemExit("ERROR: components/admin/music-context-panel.tsx not found.")
if not manager_path.exists():
    raise SystemExit("ERROR: components/admin/music-feature-manager.tsx not found.")

context = context_path.read_text(encoding="utf-8")

old = '    read();\n    const frame = window.requestAnimationFrame(read);\n\n    const observer = new MutationObserver(read);\n    observer.observe(document.body, {\n      childList: true,\n      subtree: true,\n      attributes: true,\n    });\n\n    window.addEventListener(\n      "sepulchria:admin-data-changed",\n      read,\n    );\n\n    return () => {\n      window.cancelAnimationFrame(frame);\n      observer.disconnect();\n      window.removeEventListener(\n        "sepulchria:admin-data-changed",\n        read,\n      );\n    };'

new = '    read();\n    const frame = window.requestAnimationFrame(read);\n\n    window.addEventListener(\n      "sepulchria:admin-data-changed",\n      read,\n    );\n\n    return () => {\n      window.cancelAnimationFrame(frame);\n      window.removeEventListener(\n        "sepulchria:admin-data-changed",\n        read,\n      );\n    };'

if old not in context:
    raise SystemExit("ERROR: Could not find the MutationObserver block.")
context = context.replace(old, new, 1)
context_path.write_text(context, encoding="utf-8")
print("Fixed Music context infinite MutationObserver loop.")

manager = manager_path.read_text(encoding="utf-8")

old = '    setTracks(d.tracks ?? []);\n    router.refresh();'

new = '    setTracks(d.tracks ?? []);\n    window.requestAnimationFrame(() => {\n      window.dispatchEvent(\n        new Event(\n          "sepulchria:admin-data-changed",\n        ),\n      );\n    });\n    router.refresh();'

if old not in manager:
    raise SystemExit("ERROR: Could not find the music reload block.")
manager = manager.replace(old, new, 1)
manager_path.write_text(manager, encoding="utf-8")
print("Added explicit Music sidebar refresh after catalogue changes.")
print("\nDone. Run npm run build.")