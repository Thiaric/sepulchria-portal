from pathlib import Path
import shutil

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
PAYLOAD = HERE / "payload"

if not (ROOT / "package.json").exists():
    raise SystemExit(
        "ERROR: Run this installer from the sepulchria-portal repository root."
    )

for source in PAYLOAD.rglob("*"):
    if not source.is_file():
        continue

    relative = source.relative_to(PAYLOAD)
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    print(f"Wrote: {relative.as_posix()}")

print()
print("SUCCESS")
print("D4.2 player Container movement installed.")
print("Now run: npm run build")
