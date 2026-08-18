from pathlib import Path

ROOT = Path.cwd()
LIVE = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"
EXPORT = ROOT / "app/(portal)/game/export/route.ts"

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run this from the sepulchria-portal repository root.")

def replace_once(text, old, new, label):
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f"ERROR: Could not find current block: {label}")
    return text.replace(old, new, 1)

# Live chat
text = LIVE.read_text(encoding="utf-8")
old_live = '      const displayText = isAction\n        ? segment.slice(1, -1)\n        : segment;\n'
new_live = '      const displayText = segment;\n'
text = replace_once(text, old_live, new_live, "live chat delimiter stripping")
LIVE.write_text(text, encoding="utf-8")

# Export
text = EXPORT.read_text(encoding="utf-8")
old_export = '      /*\n       * The live chat removes the\n       * action delimiters themselves.\n       */\n      const displayText =\n        isAction\n          ? segment.slice(\n              1,\n              -1,\n            )\n          : segment;\n'
new_export = '      /*\n       * Preserve action delimiters exactly as written.\n       */\n      const displayText =\n        segment;\n'
text = replace_once(text, old_export, new_export, "export delimiter stripping")
EXPORT.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Action delimiters preserved in live chat and Export Role.")
print("Now run: npm run build")