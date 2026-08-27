from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/(portal)/admin/items/actions.ts"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

block = '  const resolutionMode =\n    requiredText(formData, "resolutionMode", "Resolution mode");\n\n  if (\n    !RESOLUTION_MODES.includes(\n      resolutionMode as (typeof RESOLUTION_MODES)[number],\n    )\n  ) {\n    throw new Error("Invalid Resolution Mode.");\n  }\n\n'

positions = []
start = 0

while True:
    index = text.find(block, start)
    if index == -1:
        break
    positions.append(index)
    start = index + len(block)

if len(positions) != 2:
    raise SystemExit(
        f"ERROR: Expected exactly 2 Resolution Mode blocks, found {len(positions)}. No files were written."
    )

first_index, second_index = positions

if second_index <= first_index:
    raise SystemExit("ERROR: Resolution Mode block ordering is invalid. No files were written.")

text = (
    text[:second_index]
    + text[second_index + len(block):]
)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Removed only the later duplicate Resolution Mode parsing block.")
print("The early validated resolutionMode remains in place.")
print("Next: npm run build")
