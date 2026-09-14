#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
PATH = ROOT / "app/(portal)/admin/shapes/ShapeProgression.tsx"

if not PATH.exists():
    raise SystemExit(f"Missing file: {PATH}")

text = PATH.read_text(encoding="utf-8")

old_alt = "    const altSection =\n      directChildren.find(\n        (element) =>\n          Boolean(\n            element.querySelector(\n              \"[data-alt-other-toggle]\",\n            ),\n          ),\n      );\n\n    if (\n      altSection &&\n      steps[4]\n    ) {\n      steps[4].appendChild(\n        altSection,\n      );\n    }\n"
new_alt = "    const altSection =\n      directChildren.find(\n        (element) =>\n          Boolean(\n            element.querySelector(\n              \"[data-alt-other-toggle]\",\n            ),\n          ),\n      );\n\n    const altSectionNextSibling =\n      altSection?.nextSibling ??\n      null;\n\n    if (\n      altSection &&\n      steps[4]\n    ) {\n      steps[4].appendChild(\n        altSection,\n      );\n    }\n"
old_cleanup = "  effectNature?.removeEventListener(\n    \"change\",\n    syncAlternative,\n  );\n\n  form\n    .querySelectorAll(\n      '[data-shape-progression-generated=\"true\"]',\n    )\n    .forEach((node) => {\n      node.remove();\n    });\n\n  form.dataset.shapeProgressionReady =\n    \"false\";\n};\n"
new_cleanup = "  effectNature?.removeEventListener(\n    \"change\",\n    syncAlternative,\n  );\n\n  /*\n   * The alternative Other-effect section is temporarily moved inside\n   * the normal Other Effect step above. Restore it to its original\n   * position before allowing ShapeProgression to initialise again.\n   *\n   * Without this, the next initialisation sees the Other Effect section\n   * as containing [data-alt-other-toggle], excludes the whole section,\n   * and the six-step editor collapses to five steps.\n   */\n  if (\n    altSection &&\n    altSection.parentElement !==\n      form\n  ) {\n    if (\n      altSectionNextSibling &&\n      altSectionNextSibling.parentNode ===\n        form\n    ) {\n      form.insertBefore(\n        altSection,\n        altSectionNextSibling,\n      );\n    } else {\n      form.appendChild(\n        altSection,\n      );\n    }\n  }\n\n  form\n    .querySelectorAll(\n      '[data-shape-progression-generated=\"true\"]',\n    )\n    .forEach((node) => {\n      node.remove();\n    });\n\n  form.dataset.shapeProgressionReady =\n    \"false\";\n};\n"

if new_alt not in text:
    if old_alt not in text:
        raise SystemExit("Could not find the Other-effect section movement block.")
    text = text.replace(old_alt, new_alt, 1)
    print("PATCH remember original Other-effect section position")
else:
    print("SKIP  Other-effect position already patched")

if new_cleanup not in text:
    if old_cleanup not in text:
        raise SystemExit("Could not find the ShapeProgression cleanup block.")
    text = text.replace(old_cleanup, new_cleanup, 1)
    print("PATCH restore Other-effect section before reinitialisation")
else:
    print("SKIP  cleanup already patched")

PATH.write_text(text, encoding="utf-8")

print()
print("DONE")
print("Run: npm run build")
print("No database changes.")
