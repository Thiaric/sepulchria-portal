from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/(portal)/admin/items/actions.ts"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

resolution_block = '  const resolutionMode =\n    requiredText(formData, "resolutionMode", "Resolution mode");\n\n  if (\n    !RESOLUTION_MODES.includes(\n      resolutionMode as (typeof RESOLUTION_MODES)[number],\n    )\n  ) {\n    throw new Error("Invalid Resolution Mode.");\n  }\n\n'
usable_anchor = '  let isUsable =\n    checkbox(formData, "isUsable");\n'

resolution_count = text.count(resolution_block)
anchor_count = text.count(usable_anchor)

if resolution_count != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 Resolution Mode block, found {resolution_count}. No files were written."
    )

if anchor_count != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 isUsable declaration, found {anchor_count}. No files were written."
    )

resolution_index = text.index(resolution_block)
anchor_index = text.index(usable_anchor)

if resolution_index < anchor_index:
    raise SystemExit(
        "ERROR: Resolution Mode is already before isUsable; no change was made."
    )

# Remove the one existing later block first.
without_block = text.replace(
    resolution_block,
    "",
    1,
)

# Then insert it immediately before isUsable.
updated = without_block.replace(
    usable_anchor,
    resolution_block + usable_anchor,
    1,
)

# Sanity checks before writing.
if updated.count(resolution_block) != 1:
    raise SystemExit(
        "ERROR: Final Resolution Mode block count is not 1. No files were written."
    )

if updated.index(resolution_block) > updated.index(usable_anchor):
    raise SystemExit(
        "ERROR: Resolution Mode was not moved before isUsable. No files were written."
    )

path.write_text(updated, encoding="utf-8")

print("SUCCESS")
print("Moved the single existing Resolution Mode validation block before isUsable.")
print("The Opposed + Usable target fix can now safely read resolutionMode.")
print("Next: npm run build")
