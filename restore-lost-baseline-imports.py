
from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()
BASE = "259e502978f8d80f5ef179898c8c83aebcd27bfb"

if not (ROOT / ".git").exists():
    raise SystemExit("ERROR: run this from the Sepulchria repository root.")

# We only restore imports that existed at the known-good baseline and are now
# missing. We do NOT alter function bodies or permission logic.
IMPORT_RE = re.compile(
    r'(?P<stmt>import\s+(?:(?:type\s+)?[\s\S]*?)\s+from\s+["\'](?P<module>[^"\']+)["\'];)',
    re.MULTILINE,
)

def git_show(rel: str) -> str | None:
    result = subprocess.run(
        ["git", "show", f"{BASE}:{rel}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )
    if result.returncode != 0:
        return None
    return result.stdout

def imported_identifiers(stmt: str) -> set[str]:
    names: set[str] = set()

    # Remove module suffix.
    head = re.sub(
        r'\s+from\s+["\'][^"\']+["\'];\s*$',
        "",
        stmt.strip(),
        flags=re.DOTALL,
    )
    head = re.sub(r"^import\s+", "", head).strip()

    # Side-effect import has no identifiers.
    if head.startswith(("\"", "'")):
        return names

    # Default import before comma or standalone.
    if not head.startswith("{") and not head.startswith("*"):
        default = head.split(",", 1)[0].strip()
        if default and re.match(r"^[A-Za-z_$][\w$]*$", default):
            names.add(default)

    # Named imports.
    m = re.search(r"\{([\s\S]*?)\}", head)
    if m:
        for raw in m.group(1).split(","):
            part = raw.strip()
            if not part:
                continue
            part = re.sub(r"^type\s+", "", part)
            if " as " in part:
                _, local = part.split(" as ", 1)
                names.add(local.strip())
            else:
                names.add(part)

    # Namespace import: import * as Foo
    m = re.search(r"\*\s+as\s+([A-Za-z_$][\w$]*)", head)
    if m:
        names.add(m.group(1))

    return names

def module_of(stmt: str) -> str:
    m = re.search(r'from\s+["\']([^"\']+)["\'];', stmt, re.DOTALL)
    return m.group(1) if m else ""

def current_import_names(text: str) -> set[str]:
    names: set[str] = set()
    for m in IMPORT_RE.finditer(text):
        names |= imported_identifiers(m.group("stmt"))
    return names

def insertion_point(text: str) -> int:
    # Insert after "use server"/"use client" if present, otherwise before first import.
    directive = re.match(r'^\s*"(?:use server|use client)";\s*', text)
    if directive:
        return directive.end()
    first_import = re.search(r"^import\b", text, re.MULTILINE)
    return first_import.start() if first_import else 0

changed_files = subprocess.run(
    ["git", "diff", "--name-only", BASE, "--", "*.ts", "*.tsx"],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
    errors="ignore",
    check=True,
).stdout.splitlines()

restored = []
skipped = []

for rel in changed_files:
    path = ROOT / rel
    if not path.exists():
        continue

    baseline = git_show(rel)
    if baseline is None:
        continue

    current = path.read_text(encoding="utf-8", errors="ignore")
    current_names = current_import_names(current)

    to_restore = []

    for m in IMPORT_RE.finditer(baseline):
        stmt = m.group("stmt")
        module = m.group("module")

        # Never restore the old auth import; the permission patch intentionally
        # changed this module.
        if module == "@/lib/auth/require-staff":
            continue

        baseline_names = imported_identifiers(stmt)
        missing_names = baseline_names - current_names

        # Restore the original import statement only when at least one identifier
        # from that statement disappeared entirely.
        if missing_names:
            to_restore.append((stmt, missing_names))
            current_names |= baseline_names

    if not to_restore:
        continue

    point = insertion_point(current)
    block = "\n\n" + "\n".join(stmt for stmt, _ in to_restore) + "\n"
    current = current[:point] + block + current[point:]
    path.write_text(current, encoding="utf-8")

    for stmt, names in to_restore:
        restored.append((rel, module_of(stmt), sorted(names)))

print("")
if restored:
    print("Restored baseline imports lost by the permissions patch:")
    for rel, module, names in restored:
        print(f"  - {rel}")
        print(f"      from {module}: {', '.join(names)}")
else:
    print("No missing baseline imports were detected.")

print("")
print("This did NOT change any permission checks or function bodies.")
print("Now run: npm run build")
