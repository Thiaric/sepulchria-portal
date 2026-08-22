from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "components/portal/active-city-counter.tsx"

if not path.exists():
    raise SystemExit(
        "Missing components/portal/active-city-counter.tsx"
    )

text = path.read_text(encoding="utf-8")
original = text

# ---------------------------------------------------------------------------
# Presence colours are semantic UI state, not decorative skin colours.
# They must remain:
#   online = green
#   away   = amber/orange
#   busy   = red
#
# Remove Sepulchria skin-token references from those dots/shadows so no
# selected portal skin can recolour them.
# ---------------------------------------------------------------------------

# The two aggregate "People in Sepulchria" green dots:
text = text.replace(
    'className="h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--sep-colour-788d5e))] shadow-[0_0_10px_rgba(var(--sep-rgb-120-141-94),0.55)]"',
    'className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.55)]"',
)

# Individual character presence dots.
text = text.replace(
    '"border-[rgb(var(--sep-colour-102519))] bg-emerald-500 shadow-[0_0_6px_rgba(var(--sep-rgb-16-185-129),0.75)]"',
    '"border-emerald-950 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.75)]"',
)

text = text.replace(
    '"border-[rgb(var(--sep-colour-2f2511))] bg-amber-500 shadow-[0_0_6px_rgba(var(--sep-rgb-245-158-11),0.65)]"',
    '"border-amber-950 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.65)]"',
)

text = text.replace(
    '"border-[rgb(var(--sep-colour-321313))] bg-red-500 shadow-[0_0_6px_rgba(var(--sep-rgb-239-68-68),0.65)]"',
    '"border-red-950 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]"',
)

# Safety check: these semantic presence colours must no longer depend on
# --sep-colour / --sep-rgb variables.
bad = [
    "--sep-colour-788d5e",
    "--sep-rgb-120-141-94",
    "--sep-colour-102519",
    "--sep-colour-2f2511",
    "--sep-colour-321313",
    "--sep-rgb-16-185-129",
    "--sep-rgb-245-158-11",
    "--sep-rgb-239-68-68",
]

remaining = [
    token
    for token in bad
    if token in text
]

if remaining:
    raise SystemExit(
        "Presence colour repair incomplete. Remaining themed semantic tokens:\n- "
        + "\n- ".join(remaining)
    )

if text == original:
    raise SystemExit(
        "No changes were made. The expected current presence colour classes "
        "were not found; push the latest repository before retrying."
    )

path.write_text(text, encoding="utf-8")

print("Updated components/portal/active-city-counter.tsx")
print()
print("Presence colours are now skin-independent:")
print("  Online = green")
print("  Away   = amber/orange")
print("  Busy   = red")
print()
print("No SQL required.")
print("Run: npm run build")
