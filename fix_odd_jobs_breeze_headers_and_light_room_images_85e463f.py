from pathlib import Path
import subprocess

BASE = '85e463f'
ODD = Path('app/(portal)/game/components/OddJobsPanel.tsx')
BREEZE = Path('app/(portal)/game/components/BreezeLodgingsPanel.tsx')

DETAILS_OLD = 'className="group max-h-[72%] shrink-0 overflow-y-auto border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]"'
DETAILS_NEW = 'className="group max-h-[72%] shrink-0 overflow-hidden border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))] open:overflow-y-auto"'

OVERLAY1_OLD = '<div className="pointer-events-none absolute inset-0 z-[6] bg-[rgb(var(--sep-colour-0d0a08))]/58" />'
OVERLAY1_NEW = '<div className="pointer-events-none absolute inset-0 z-[6] bg-black/42" />'
OVERLAY2_OLD = '<div className="pointer-events-none absolute inset-0 z-[7] bg-gradient-to-t from-[rgb(var(--sep-colour-0d0a08))]/92 via-[rgb(var(--sep-colour-0d0a08))]/45 to-[rgb(var(--sep-colour-0d0a08))]/18" />'
OVERLAY2_NEW = '<div className="pointer-events-none absolute inset-0 z-[7] bg-gradient-to-t from-black/82 via-black/32 to-black/10" />'
TITLE_OLD = '<h4 className="font-serif text-[12px] text-[rgb(var(--sep-colour-e8d3ad))] [text-shadow:0_2px_4px_rgba(var(--sep-rgb-0-0-0),0.95)]">'
TITLE_NEW = '<h4 className="font-serif text-[12px] text-[#f0dfbd] [text-shadow:0_2px_4px_rgba(0,0,0,0.95)]">'
STATUS_OLD = '<p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b7a58c))] [text-shadow:0_2px_4px_rgba(var(--sep-rgb-0-0-0),0.95)]">'
STATUS_NEW = '<p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#c9b99d] [text-shadow:0_2px_4px_rgba(0,0,0,0.95)]">'

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

for path in (ODD, BREEZE):
    if not path.exists():
        raise SystemExit(f"Missing {path}. No files were changed.")

odd_text = ODD.read_text(encoding="utf-8")
breeze_text = BREEZE.read_text(encoding="utf-8")

if odd_text.count(DETAILS_OLD) != 1:
    raise SystemExit(
        f"Odd Jobs details shell mismatch: found {odd_text.count(DETAILS_OLD)}. "
        "No files were changed."
    )

if breeze_text.count(DETAILS_OLD) != 1:
    raise SystemExit(
        f"Breeze details shell mismatch: found {breeze_text.count(DETAILS_OLD)}. "
        "No files were changed."
    )

checks = [
    ("first room-image overlay", OVERLAY1_OLD),
    ("second room-image overlay", OVERLAY2_OLD),
    ("room-image title", TITLE_OLD),
    ("room-image status", STATUS_OLD),
]
for label, old in checks:
    count = breeze_text.count(old)
    if count != 1:
        raise SystemExit(
            f"Could not uniquely find {label}; found {count}. "
            "No files were changed."
        )

new_odd = odd_text.replace(DETAILS_OLD, DETAILS_NEW, 1)

new_breeze = (
    breeze_text
    .replace(DETAILS_OLD, DETAILS_NEW, 1)
    .replace(OVERLAY1_OLD, OVERLAY1_NEW, 1)
    .replace(OVERLAY2_OLD, OVERLAY2_NEW, 1)
    .replace(TITLE_OLD, TITLE_NEW, 1)
    .replace(STATUS_OLD, STATUS_NEW, 1)
)

ODD.write_text(new_odd, encoding="utf-8")
BREEZE.write_text(new_breeze, encoding="utf-8")

print("SUCCESS")
print("")
print("Odd Jobs + Breeze:")
print("  - no scrollbar inside collapsed clickable header")
print("  - scrolling restored only when opened")
print("")
print("Breeze room images:")
print("  - photos stay visible on light skins")
print("  - photo overlay is neutral dark, not skin-inverted")
print("  - photo text remains readable")
print("")
print("Run: npm run build")
