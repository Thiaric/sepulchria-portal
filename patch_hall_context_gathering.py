from pathlib import Path

path = Path("components/portal/portal-context-panel.tsx")

if not path.exists():
    raise SystemExit(
        "Missing components/portal/portal-context-panel.tsx. "
        "Run this from the sepulchria-portal repository root."
    )

text = path.read_text(encoding="utf-8")

if '["gathering", "Gathering", "Gatherers"]' in text:
    print("Gatherers is already present in the Hall context panel.")
    raise SystemExit(0)

anchor = '  ["recipes", "Crafting", "Recipe Masters"],\n'

addition = '  ["gathering", "Gathering", "Gatherers"],\n'

if anchor not in text:
    raise SystemExit(
        "Could not find the Recipe Masters Hall entry. "
        "The context panel differs from the inspected master version."
    )

text = text.replace(anchor, anchor + addition, 1)
path.write_text(text, encoding="utf-8")

print("Gatherers added to the Hall of Renown context panel.")
print("Run: npm run build")
