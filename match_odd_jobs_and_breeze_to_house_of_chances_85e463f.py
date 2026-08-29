from pathlib import Path
import subprocess

BASE = '85e463f'
ODD = Path('app/(portal)/game/components/OddJobsPanel.tsx')
BREEZE = Path('app/(portal)/game/components/BreezeLodgingsPanel.tsx')

DETAILS_OLD = '<details\n      data-sep-interaction-ignore="true"\n      className="group max-h-[72%] shrink-0 overflow-hidden border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))] open:overflow-y-auto"\n    >'
DETAILS_NEW = '<details\n      data-sep-interaction-ignore="true"\n      className="group shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]"\n    >'
SUMMARY_OLD = '<summary\n        className="sticky top-0 z-30 flex min-h-[58px] w-full cursor-pointer list-none items-center justify-between gap-3 bg-[rgb(var(--sep-colour-120e0b))] px-3 py-2 [transform:none!important] [&::-webkit-details-marker]:hidden"\n      >'
SUMMARY_NEW = '<summary\n        className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[linear-gradient(90deg,rgb(var(--sep-colour-100c09)),rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-100c09)))] px-3 py-2 [&::-webkit-details-marker]:hidden"\n      >'
CONTENT_OLD = '<div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-3">'
CONTENT_NEW = '<div className="max-h-[58vh] overflow-y-auto border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-3">'

head = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    check=True,
    capture_output=True,
    text=True,
    encoding="utf-8",
).stdout.strip()

if not head.startswith(BASE):
    raise SystemExit(
        f"This patch expects HEAD {BASE}; current HEAD is {head}. "
        "No files were changed."
    )

loaded = {}

for path in (ODD, BREEZE):
    if not path.exists():
        raise SystemExit(f"Missing {path}. No files were changed.")

    text = path.read_text(encoding="utf-8")

    if text.count(DETAILS_OLD) != 1:
        raise SystemExit(
            f"Could not uniquely find current details shell in {path}; "
            f"found {text.count(DETAILS_OLD)}. No files were changed."
        )

    if text.count(SUMMARY_OLD) != 1:
        raise SystemExit(
            f"Could not uniquely find current summary in {path}; "
            f"found {text.count(SUMMARY_OLD)}. No files were changed."
        )

    if text.count(CONTENT_OLD) != 1:
        raise SystemExit(
            f"Could not uniquely find expanded content wrapper in {path}; "
            f"found {text.count(CONTENT_OLD)}. No files were changed."
        )

    loaded[path] = (
        text
        .replace(DETAILS_OLD, DETAILS_NEW, 1)
        .replace(SUMMARY_OLD, SUMMARY_NEW, 1)
        .replace(CONTENT_OLD, CONTENT_NEW, 1)
    )

for path, text in loaded.items():
    path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Odd Jobs Bureau and Breeze Lodgings now use the House of Chances")
print("collapsed-panel structure and header styling.")
print("")
print("Key difference:")
print("  - the <details> shell itself no longer has max-height/overflow")
print("  - therefore the closed panel collapses to the header exactly")
print("  - only the OPEN content receives max-height + vertical scrolling")
print("")
print("Breeze room-image visibility fix is preserved.")
print("Run: npm run build")
