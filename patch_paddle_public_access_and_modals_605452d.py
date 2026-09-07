from __future__ import annotations

import subprocess
from pathlib import Path

EXPECTED_HEAD = "605452dda6011ceabe8e9da684a7a5f4f1da3d96"
ROOT = Path.cwd()

def fail(message: str) -> None:
    raise SystemExit(f"\nERROR: {message}\n")

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        fail(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"updated: {path}")

def replace_once(path: str, old: str, new: str, label: str) -> None:
    content = read(path)
    if new in content:
        print(f"already done: {path} ({label})")
        return
    count = content.count(old)
    if count != 1:
        fail(f"{path}: {label}: expected exactly 1 match, found {count}")
    write(path, content.replace(old, new, 1))

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        f"This patch is built for {EXPECTED_HEAD[:7]}, but your current HEAD is {head[:7]}.\n"
        "Ask for a refreshed patch against the current commit."
    )

# ---------------------------------------------------------------------------
# 1) Make /purchases and /refund-policy genuinely PUBLIC.
# ---------------------------------------------------------------------------

proxy_path = "lib/supabase/proxy.ts"
proxy = read(proxy_path)

public_anchor = '''  "/cookies",
  "/auth",'''
public_replacement = '''  "/cookies",
  "/purchases",
  "/refund-policy",
  "/auth",'''

if '  "/purchases",' not in proxy or '  "/refund-policy",' not in proxy:
    if public_anchor not in proxy:
        fail(f"{proxy_path}: could not find PUBLIC_ROUTES insertion point")
    proxy = proxy.replace(public_anchor, public_replacement, 1)

# Also allow these pages while a logged-in account is sanction-restricted,
# just like Terms/Privacy/etc.
sanction_anchor = '''  "/cookies",
  "/auth",
  "/api/sanctions",'''
sanction_replacement = '''  "/cookies",
  "/purchases",
  "/refund-policy",
  "/auth",
  "/api/sanctions",'''

# Only insert into SANCTION_ACCESS_ROUTES if not already present there.
sanction_section_start = proxy.find("const SANCTION_ACCESS_ROUTES")
sanction_section_end = proxy.find("];", sanction_section_start)
sanction_section = proxy[sanction_section_start:sanction_section_end]
if '"/purchases"' not in sanction_section or '"/refund-policy"' not in sanction_section:
    if sanction_anchor not in proxy:
        fail(f"{proxy_path}: could not find SANCTION_ACCESS_ROUTES insertion point")
    proxy = proxy.replace(sanction_anchor, sanction_replacement, 1)

write(proxy_path, proxy)

# ---------------------------------------------------------------------------
# 2) Homepage footer:
# - restore modal behaviour
# - keep real hrefs so crawlers/Paddle can follow them
# - show the actual contact email
# ---------------------------------------------------------------------------

homepage_path = "components/homepage/sepulchria-homepage.tsx"
homepage = read(homepage_path)

# Remove the direct-navigation block added by the previous patch, replacing it
# with only the two new pages + visible email, all preserving modal UX.
old_direct_block = '''              <Link href="/purchases">
                Optional Purchases
              </Link>
              <Link href="/refund-policy">
                Refund Policy
              </Link>
              <Link href="/terms">
                Terms
              </Link>
              <Link href="/privacy">
                Privacy
              </Link>
              <a href="mailto:sepulchriarpg@gmail.com">
                Contact
              </a>'''

new_direct_block = '''              <Link
                href="/purchases"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Optional Purchases",
                    href: "/purchases",
                  });
                }}
              >
                Optional Purchases
              </Link>
              <Link
                href="/refund-policy"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Refund Policy",
                    href: "/refund-policy",
                  });
                }}
              >
                Refund Policy
              </Link>
              <a href="mailto:sepulchriarpg@gmail.com">
                sepulchriarpg@gmail.com
              </a>'''

if old_direct_block in homepage:
    homepage = homepage.replace(old_direct_block, new_direct_block, 1)
elif new_direct_block not in homepage:
    # If the previous patch was not applied, add the new links after Credits.
    credits_anchor = '''              <Link href="#">
                Credits
              </Link>'''
    credits_replacement = credits_anchor + "\n" + new_direct_block
    if credits_anchor not in homepage:
        fail(f"{homepage_path}: could not find Credits link")
    homepage = homepage.replace(credits_anchor, credits_replacement, 1)

# Convert each existing public-policy button to a crawlable Link that STILL opens
# the exact same HomepagePublicModal.
button_specs = [
    ("Community Rules", "/community-rules"),
    ("Safety", "/safety"),
    ("18+ Policy", "/age-policy"),
    ("Privacy", "/privacy"),
    ("Cookies", "/cookies"),
    ("Terms", "/terms"),
]

for title, href in button_specs:
    old = f'''              <button
                type="button"
                onClick={{() =>
                  setPublicModal({{
                    title: "{title}",
                    href: "{href}",
                  }})
                }}

              >
                {title}
              </button>'''

    new = f'''              <Link
                href="{href}"
                onClick={{(event) => {{
                  event.preventDefault();
                  setPublicModal({{
                    title: "{title}",
                    href: "{href}",
                  }});
                }}}}
              >
                {title}
              </Link>'''

    if new in homepage:
        continue

    if old not in homepage:
        fail(f"{homepage_path}: could not find existing {title} modal button")

    homepage = homepage.replace(old, new, 1)

write(homepage_path, homepage)

print("\nPatch applied successfully.")
print("Fixed:")
print("  - /purchases is public")
print("  - /refund-policy is public")
print("  - Optional Purchases opens in the homepage modal")
print("  - Refund Policy opens in the homepage modal")
print("  - Community Rules, Safety, 18+ Policy, Privacy, Cookies and Terms still open in the modal")
print("  - all those policy items now also have real crawlable hrefs")
print("  - homepage contact visibly shows sepulchriarpg@gmail.com")
print("\nNow run: npm run build")
