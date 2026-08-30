from pathlib import Path

path = Path("app/(portal)/ranking/page.tsx")

if not path.exists():
    raise SystemExit(
        "Missing app/(portal)/ranking/page.tsx. "
        "Run this from the sepulchria-portal repository root."
    )

text = path.read_text(encoding="utf-8")

if 'key: "gathering"' in text:
    print("Gatherers Hall of Renown board is already installed.")
    raise SystemExit(0)

anchor = '''  {
    key: "market",
    label: "Market Regulars",
    eyebrow: "Market",
    description:
      "Those with the greatest lifetime Market activity.",
    directMetric: "market",
    valueLabel: "Transactions",
  },
'''

addition = '''  {
    key: "gathering",
    label: "Gatherers",
    eyebrow: "Gathering",
    description:
      "Those who have made the greatest number of Gathering attempts across Sepulchria.",
    metricKeys: [
      "gathering_attempts_total",
    ],
    valueLabel: "Attempts",
  },
'''

if anchor not in text:
    raise SystemExit(
        "Could not find the Market Regulars board. "
        "The ranking page differs from the inspected master version."
    )

text = text.replace(anchor, addition + anchor, 1)
path.write_text(text, encoding="utf-8")

print("Gatherers added to the Hall of Renown.")
print("Run: npm run build")
