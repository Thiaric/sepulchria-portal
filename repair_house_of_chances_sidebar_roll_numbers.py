from pathlib import Path

path = Path("components/admin/house-of-chances-context-panel.tsx")

if not path.exists():
    raise SystemExit(f"Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

replacements = {
    'roll1: node.dataset.housePlayRoll1 ?? "",':
        'roll1: node.getAttribute("data-house-play-roll-1") ?? "",',
    'roll2: node.dataset.housePlayRoll2 ?? "",':
        'roll2: node.getAttribute("data-house-play-roll-2") ?? "",',
    'roll3: node.dataset.housePlayRoll3 ?? "",':
        'roll3: node.getAttribute("data-house-play-roll-3") ?? "",',

    'roll1Min: node.dataset.houseRuleRoll1Min ?? "",':
        'roll1Min: node.getAttribute("data-house-rule-roll-1-min") ?? "",',
    'roll1Max: node.dataset.houseRuleRoll1Max ?? "",':
        'roll1Max: node.getAttribute("data-house-rule-roll-1-max") ?? "",',
    'roll2Min: node.dataset.houseRuleRoll2Min ?? "",':
        'roll2Min: node.getAttribute("data-house-rule-roll-2-min") ?? "",',
    'roll2Max: node.dataset.houseRuleRoll2Max ?? "",':
        'roll2Max: node.getAttribute("data-house-rule-roll-2-max") ?? "",',
    'roll3Min: node.dataset.houseRuleRoll3Min ?? "",':
        'roll3Min: node.getAttribute("data-house-rule-roll-3-min") ?? "",',
    'roll3Max: node.dataset.houseRuleRoll3Max ?? "",':
        'roll3Max: node.getAttribute("data-house-rule-roll-3-max") ?? "",',
}

changed = 0
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new, 1)
        changed += 1

if changed != len(replacements):
    raise SystemExit(
        f"Expected to repair {len(replacements)} attribute readers but repaired {changed}. "
        "Do not edit manually; send me the current file if this happens."
    )

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Fixed House of Chances sidebar numeric attribute reading.")
print("Roll boxes and numeric live-search should now work.")
print("Now run: npm run build")
