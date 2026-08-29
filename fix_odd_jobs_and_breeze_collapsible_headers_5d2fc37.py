from pathlib import Path
import subprocess

BASE = '5d2fc37'
FILES = ['app/(portal)/game/components/OddJobsPanel.tsx', 'app/(portal)/game/components/BreezeLodgingsPanel.tsx']
DETAILS_OLD = '<details className="group max-h-[72%] shrink-0 overflow-y-auto border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">'
DETAILS_NEW = '<details\n      data-sep-interaction-ignore="true"\n      className="group max-h-[72%] shrink-0 overflow-y-auto border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]"\n    >'
SUMMARY_OLD = '<summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 bg-[rgb(var(--sep-colour-120e0b))] px-3 py-2 [&::-webkit-details-marker]:hidden">'
SUMMARY_NEW = '<summary\n        className="sticky top-0 z-30 flex min-h-[58px] w-full cursor-pointer list-none items-center justify-between gap-3 bg-[rgb(var(--sep-colour-120e0b))] px-3 py-2 [transform:none!important] [&::-webkit-details-marker]:hidden"\n      >'

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

for raw_path in FILES:
    path = Path(raw_path)

    if not path.exists():
        raise SystemExit(
            f"Missing {path}. No files were changed."
        )

    text = path.read_text(encoding="utf-8")

    if text.count(DETAILS_OLD) != 1:
        raise SystemExit(
            f"Expected exactly one collapsible details shell in {path}; "
            f"found {text.count(DETAILS_OLD)}. No files were changed."
        )

    if text.count(SUMMARY_OLD) != 1:
        raise SystemExit(
            f"Expected exactly one clickable summary in {path}; "
            f"found {text.count(SUMMARY_OLD)}. No files were changed."
        )

    loaded[path] = (
        text
        .replace(DETAILS_OLD, DETAILS_NEW, 1)
        .replace(SUMMARY_OLD, SUMMARY_NEW, 1)
    )

for path, text in loaded.items():
    path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Repaired both collapsible game panels:")
print("  - Odd Jobs Bureau")
print("  - Breeze Lodgings")
print("")
print("Changes:")
print("  - panels are excluded from pointer transform/glow")
print("  - clickable headers have a stable minimum height")
print("  - headers are explicitly non-transforming")
print("  - native details click/open behaviour remains intact")
print("  - expanded Work / Rent / Enter controls remain functional")
print("")
print("Run: npm run build")
