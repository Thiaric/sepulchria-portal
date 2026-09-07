from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

EXPECTED_HEAD = "e931882"
TARGET = Path("lib/supabase/proxy.ts")
BACKUP = Path("lib/supabase/proxy.ts.before_guest_root_homepage_e931882.bak")

OLD = '  const { data } = await supabase.auth.getClaims();\n  const user = data?.claims;\n  const pathname = request.nextUrl.pathname;\n\n  if (!user && !isPublicRoute(pathname)) {\n'
NEW = '  const { data } = await supabase.auth.getClaims();\n  const user = data?.claims;\n  const pathname = request.nextUrl.pathname;\n\n  // Keep "/" as the portal dashboard for authenticated users,\n  // but serve the existing public homepage there for guests/crawlers.\n  // This is a rewrite, not a redirect, so the visible URL remains "/".\n  if (pathname === "/" && !user) {\n    const url = request.nextUrl.clone();\n    url.pathname = "/homepage";\n\n    return NextResponse.rewrite(url);\n  }\n\n  if (!user && !isPublicRoute(pathname)) {\n'

def fail(message: str) -> None:
    raise SystemExit(f"\nERROR: {message}\n")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
except Exception:
    fail("Could not determine current Git commit. Run this from the repo root.")

if head != EXPECTED_HEAD:
    fail(f"Expected HEAD {EXPECTED_HEAD}, found {head}. Nothing changed.")

if not TARGET.exists():
    fail(f"Missing {TARGET}. Nothing changed.")

text = TARGET.read_text(encoding="utf-8")

if 'pathname === "/" && !user' in text:
    fail("Guest-root homepage rewrite already appears to be present. Nothing changed.")

count = text.count(OLD)
if count != 1:
    fail(
        f"Expected exactly 1 insertion point in {TARGET}, found {count}. "
        "Nothing changed."
    )

if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)

patched = text.replace(OLD, NEW, 1)
TARGET.write_text(patched, encoding="utf-8")

print("PATCHED SUCCESSFULLY")
print(f"- Updated: {TARGET}")
print(f"- Backup:  {BACKUP}")
print("")
print("Behaviour now:")
print("- Signed OUT: / serves /homepage internally, while the URL stays /")
print("- Signed IN:  / remains the existing portal dashboard")
print("")
print("Next run:")
print("  npm run build")
