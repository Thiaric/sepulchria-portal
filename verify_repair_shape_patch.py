from pathlib import Path

path = Path(r"app/(portal)/game/components/WarpingPanel.tsx")
if not path.exists():
    raise SystemExit("ERROR: Run this from the sepulchria-portal repository root.")

text = path.read_text(encoding="utf-8")

# The first patch writes the file BEFORE its over-broad verification.
# Therefore, if the requested new generator is already present, this repair
# patch must NOT patch it a second time.
new_markers = [
    "`◆ Warp [${s.name}]`",
    "`School [${s.school}]`",
    "`Save Required [DC ${dcText} - ${saveAttributeText}]`",
    "`Damage [${damageValues.join(",
]

if all(marker in text for marker in new_markers):
    print("REPAIR COMPLETE")
    print("The first patch DID apply its code before reporting the false validation error.")
    print("No second modification was necessary.")
    print()
    print("Verified new Warp generator markers:")
    for marker in new_markers:
        print("  OK:", marker)
    raise SystemExit(0)

# If for any reason the first patch did not write, fail safely rather than
# applying an unknown transformation.
old_markers = [
    "`◆ Warp ${s.name}`",
    "`Save required: ${saveNames.join(\", \")}`",
    "`Profiles: ${castProfiles.join(\"; \")}`",
    "`Movement: ${s.movement}`",
]

if all(marker in text for marker in old_markers):
    raise SystemExit(
        "The file is still on the old generator. Restore the baseline and run the original patch again; "
        "its code write is valid, only its final verifier was wrong."
    )

raise SystemExit(
    "ERROR: WarpingPanel.tsx is in neither the expected old nor patched state. No changes made."
)
