from pathlib import Path

ROOT = Path.cwd()

replacements = {
    "components/orders/order-leadership-sidebar-link.tsx": [
        ("relation?.level === 5", "relation?.level === 6"),
    ],
    "lib/orders/require-order-manager.ts": [
        ("relation?.level !== 5", "relation?.level !== 6"),
        ("Only the Level 5 Head may manage this Order.", "Only the Level 6 Head may manage this Order."),
    ],
    "components/portal/order-leadership-context.tsx": [
        ("?.level === 5", "?.level === 6"),
        ("Level 5 Head", "Level 6 Head"),
    ],
    "app/(portal)/orders/manage/page.tsx": [
        ("?.level === 5", "?.level === 6"),
        ("Levels 0–4.", "Levels 1–5."),
        ("Level 5 Head", "Level 6 Head"),
        ("Level 5 · Head", "Level 6 · Head"),
        ("Level 5", "Level 6"),
    ],
    "app/(portal)/orders/manage/actions.ts": [
        ("selectedLevel.level >= 5", "selectedLevel.level >= 6"),
        ("existingLevel?.level === 5", "existingLevel?.level === 6"),
        ("Only staff can appoint a Level 5 Head.", "Only staff can appoint a Level 6 Head."),
    ],
}

changed = []

for rel, reps in replacements.items():
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"ERROR: Missing {rel}")
    text = path.read_text(encoding="utf-8")
    original = text

    for old, new in reps:
        text = text.replace(old, new)

    # Special case: Manage Orders page excludes the head level from editable levels.
    if rel == "app/(portal)/orders/manage/page.tsx":
        text = text.replace(
            '.lt(\n                        "level",\n                        5,\n                      )',
            '.lt(\n                        "level",\n                        6,\n                      )'
        )
        text = text.replace(
            "currentLevel ===\n                              5",
            "currentLevel ===\n                              6"
        )

    if text != original:
        path.write_text(text, encoding="utf-8")
        changed.append(rel)

print("Updated:")
for rel in changed:
    print(" -", rel)

print()
print("Now run: npm run build")
