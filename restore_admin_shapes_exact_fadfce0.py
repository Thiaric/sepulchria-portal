#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
REF = "fadfce0"

FILES = [
    "app/(portal)/admin/shapes/page.tsx",
    "app/(portal)/admin/shapes/ShapeActionForm.tsx",
    "components/portal/admin-context-panel.tsx",
]

def git_show(path: str) -> str:
    result = subprocess.run(
        ["git", "show", f"{REF}:{path}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise SystemExit(
            f"Could not restore {path} from {REF}:\n{result.stderr}"
        )
    return result.stdout

for rel in FILES:
    target = ROOT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(git_show(rel), encoding="utf-8")
    print(f"RESTORE {rel} <- {REF}")

lazy = ROOT / "app/(portal)/admin/shapes/LazyShapeDetails.tsx"
if lazy.exists():
    lazy.unlink()
    print("DELETE app/(portal)/admin/shapes/LazyShapeDetails.tsx")

print()
print("RESTORED.")
print("Run: npm run build")
