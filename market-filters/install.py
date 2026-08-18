from pathlib import Path
import json

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
PAGE = ROOT / "app/(portal)/market/[slug]/page.tsx"
COMPONENT = ROOT / "components/market/market-catalogue.tsx"

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run from repository root.")

if not PAGE.exists():
    raise SystemExit("ERROR: Market shop page not found.")

COMPONENT.parent.mkdir(parents=True, exist_ok=True)
COMPONENT.write_text(
    (HERE / "market-catalogue.tsx.txt").read_text(encoding="utf-8"),
    encoding="utf-8",
)

text = PAGE.read_text(encoding="utf-8")
patches = json.loads((HERE / "patches.json").read_text(encoding="utf-8"))

for patch in patches:
    old = patch["old"]
    new = patch["new"]
    label = patch["label"]

    if new in text:
        continue

    if old not in text:
        raise SystemExit(f"ERROR: Could not find current block: {label}")

    text = text.replace(old, new, 1)

start = '        <div className="mt-6 grid gap-3 lg:grid-cols-2">\n'
end = '''        {!listings.length ? (
          <section className="mt-6 border border-[#60482e]/40 bg-[#15100d] p-8 text-center text-sm text-[#8f8271]">
            This shop has no available catalogue entries.
          </section>
        ) : null}
'''

a = text.find(start)
b = text.find(end, a)

if a == -1 or b == -1:
    if "<MarketCatalogue" not in text:
        raise SystemExit("ERROR: Could not find current Market catalogue render block.")
else:
    b += len(end)
    replacement = '''        <MarketCatalogue
          listings={catalogueListings}
          walletBalance={
            wallet?.balance === undefined ||
            wallet?.balance === null
              ? null
              : Number(wallet.balance)
          }
        />
'''
    text = text[:a] + replacement + text[b:]

PAGE.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Compact Market filters installed.")
print("No SQL required.")
print("Run: npm run build")
