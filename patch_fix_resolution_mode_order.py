from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/(portal)/admin/items/actions.ts"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

old_early_anchor = '  let isUsable =\n    checkbox(formData, "isUsable");\n\nlet useBehaviour: string | null = null;\nlet targetMode: string | null = null;\nlet maxCharges: number | null = null;\nlet cooldownMinutes: number | null = null;\n'
new_early_anchor = '  const resolutionMode =\n    requiredText(formData, "resolutionMode", "Resolution mode");\n\n  if (\n    !RESOLUTION_MODES.includes(\n      resolutionMode as (typeof RESOLUTION_MODES)[number],\n    )\n  ) {\n    throw new Error("Invalid Resolution Mode.");\n  }\n\n  let isUsable =\n    checkbox(formData, "isUsable");\n\nlet useBehaviour: string | null = null;\nlet targetMode: string | null = null;\nlet maxCharges: number | null = null;\nlet cooldownMinutes: number | null = null;\n'

count_early = text.count(old_early_anchor)
if count_early != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 usable declaration anchor, found {count_early}. No files were written."
    )

text = text.replace(
    old_early_anchor,
    new_early_anchor,
    1,
)

old_late_block = '  const resolutionMode =\n    requiredText(formData, "resolutionMode", "Resolution mode");\n\n  if (\n    !RESOLUTION_MODES.includes(\n      resolutionMode as (typeof RESOLUTION_MODES)[number],\n    )\n  ) {\n    throw new Error("Invalid Resolution Mode.");\n  }\n\n'

count_late = text.count(old_late_block)
if count_late != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 later Resolution Mode block, found {count_late}. No files were written."
    )

text = text.replace(
    old_late_block,
    "",
    1,
)

path.write_text(
    text,
    encoding="utf-8",
)

print("SUCCESS")
print("Moved Resolution Mode parsing before target/use validation.")
print("This preserves the opposed-target fix without using the variable before declaration.")
print("Next: npm run build")
