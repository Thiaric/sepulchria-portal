from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/(portal)/admin/items/actions.ts"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

old = 'if (isUsable) {\n  targetMode = requiredText(\n    formData,\n    "targetMode",\n    "Target mode",\n  );\n\n  if (\n    !TARGET_MODES.includes(\n      targetMode as (typeof TARGET_MODES)[number],\n    )\n  ) {\n    throw new Error("Invalid target mode.");\n  }\n    useBehaviour = requiredText(formData, "useBehaviour", "Use behaviour");\n'
new = 'if (isUsable) {\n  if (resolutionMode === "opposed") {\n    targetMode = "other";\n  } else {\n    targetMode = requiredText(\n      formData,\n      "targetMode",\n      "Target mode",\n    );\n\n    if (\n      !TARGET_MODES.includes(\n        targetMode as (typeof TARGET_MODES)[number],\n      )\n    ) {\n      throw new Error("Invalid target mode.");\n    }\n  }\n\n    useBehaviour = requiredText(formData, "useBehaviour", "Use behaviour");\n'

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 target-mode validation block, found {count}. No files were written."
    )

text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Fixed Opposed usable Item target handling.")
print("Opposed usable Items now force target_mode = 'other' server-side.")
print("Next: npm run build")
