from __future__ import annotations

import subprocess
from pathlib import Path

EXPECTED_HEAD = "605452dda6011ceabe8e9da684a7a5f4f1da3d96"
ROOT = Path.cwd()

def fail(msg: str) -> None:
    raise SystemExit(f"\nERROR: {msg}\n")

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        fail(f"Missing file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, text: str) -> None:
    p = ROOT / path
    p.write_text(text, encoding="utf-8", newline="\n")
    print(f"updated: {path}")

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        f"This patch is built for {EXPECTED_HEAD[:7]}, "
        f"but your current HEAD is {head[:7]}."
    )

proxy_path = "lib/supabase/proxy.ts"
proxy = read(proxy_path)

def ensure_route_in_array(text: str, array_name: str, route: str, anchor: str) -> str:
    start = text.find(f"const {array_name} = [")
    if start == -1:
        fail(f"Could not find {array_name}")
    end = text.find("];", start)
    if end == -1:
        fail(f"Could not find end of {array_name}")

    block = text[start:end]
    if f'"{route}"' in block:
        return text

    anchor_pos = block.find(anchor)
    if anchor_pos == -1:
        fail(f"Could not find insertion anchor in {array_name}")

    absolute = start + anchor_pos
    return text[:absolute] + f'  "{route}",\n' + text[absolute:]

for route in ("/purchases", "/refund-policy"):
    proxy = ensure_route_in_array(
        proxy,
        "PUBLIC_ROUTES",
        route,
        '  "/auth",'
    )

for route in ("/purchases", "/refund-policy"):
    proxy = ensure_route_in_array(
        proxy,
        "SANCTION_ACCESS_ROUTES",
        route,
        '  "/auth",'
    )

write(proxy_path, proxy)

homepage_path = "components/homepage/sepulchria-homepage.tsx"
homepage = read(homepage_path)

marker = 'data-homepage-footer-nav="true"'
marker_pos = homepage.find(marker)
if marker_pos == -1:
    fail("Could not find homepage footer navigation marker")

nav_start = homepage.rfind("<nav", 0, marker_pos)
if nav_start == -1:
    fail("Could not find opening homepage footer <nav>")

nav_end = homepage.find("</nav>", marker_pos)
if nav_end == -1:
    fail("Could not find closing homepage footer </nav>")
nav_end += len("</nav>")

new_nav = '''<nav
              data-homepage-footer-nav="true"
              aria-label="Footer navigation"
              className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[8px] uppercase tracking-[0.18em] sm:justify-end [&_a]:uppercase [&_button]:uppercase"
            >
              <Link href="#">
                Discord
              </Link>

              <Link href="#">
                Credits
              </Link>

              <Link
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

              <Link
                href="/community-rules"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Community Rules",
                    href: "/community-rules",
                  });
                }}
              >
                Community Rules
              </Link>

              <Link
                href="/safety"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Safety",
                    href: "/safety",
                  });
                }}
              >
                Safety
              </Link>

              <Link
                href="/age-policy"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "18+ Policy",
                    href: "/age-policy",
                  });
                }}
              >
                18+ Policy
              </Link>

              <Link
                href="/privacy"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Privacy",
                    href: "/privacy",
                  });
                }}
              >
                Privacy
              </Link>

              <Link
                href="/cookies"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Cookies",
                    href: "/cookies",
                  });
                }}
              >
                Cookies
              </Link>

              <CookieSettingsButton className="uppercase tracking-[0.18em]" />

              <Link
                href="/terms"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Terms",
                    href: "/terms",
                  });
                }}
              >
                Terms
              </Link>

              <a
                href="mailto:sepulchriarpg@gmail.com"
                className="normal-case tracking-normal"
              >
                sepulchriarpg@gmail.com
              </a>
            </nav>'''

homepage = homepage[:nav_start] + new_nav + homepage[nav_end:]
write(homepage_path, homepage)

print("\nPatch applied successfully.")
print("Fixed:")
print("  - /purchases public")
print("  - /refund-policy public")
print("  - Optional Purchases opens in modal")
print("  - Refund Policy opens in modal")
print("  - Community Rules opens in modal")
print("  - Safety opens in modal")
print("  - 18+ Policy opens in modal")
print("  - Privacy opens in modal")
print("  - Cookies opens in modal")
print("  - Terms opens in modal")
print("  - all policy links keep real hrefs for crawlers/Paddle")
print("  - visible contact email: sepulchriarpg@gmail.com")
print("\nNow run: npm run build")
