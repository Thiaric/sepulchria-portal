from __future__ import annotations

import subprocess
from pathlib import Path

EXPECTED_COMMIT = "b13fcd8"

ROOT = Path.cwd()
HEADER = ROOT / "components" / "portal" / "portal-header.tsx"


def fail(message: str) -> None:
    raise SystemExit(f"\nERROR: {message}\n")


if not HEADER.exists():
    fail(f"Missing expected file: {HEADER}")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        cwd=ROOT,
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
except Exception:
    head = ""

if head and head != EXPECTED_COMMIT:
    fail(f"This patch was written for {EXPECTED_COMMIT}, but current HEAD is {head}.")

text = HEADER.read_text(encoding="utf-8")

if 'label: "Store"' in text and 'href: "/store"' in text:
    fail("A Store header modal button already appears to be present.")

needle = '''          <div data-cosmetic-header-controls className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3">
            <WorldIndicator
'''

replacement = '''          <div data-cosmetic-header-controls className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3">
            <PortalModalButton
              payload={{
                label: "Store",
                title: "Browse Sepulchria Store products, bundles and premium unlocks.",
                icon: "/icons/store.png",
                href: "/store",
              }}
              aria-label="Open Sepulchria Store"
              title="Sepulchria Store"
              className="relative flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-c69b5c))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 26 26"
                className="pointer-events-none h-6 w-6"
              >
                <defs>
                  <filter
                    id="store-header-icon-colour"
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood
                      floodColor="currentColor"
                      result="colour"
                    />
                    <feComposite
                      in="colour"
                      in2="SourceAlpha"
                      operator="in"
                    />
                  </filter>
                </defs>

                <image
                  href="/icons/store.png"
                  x="0"
                  y="0"
                  width="26"
                  height="26"
                  preserveAspectRatio="xMidYMid meet"
                  filter="url(#store-header-icon-colour)"
                />
              </svg>
            </PortalModalButton>

            <WorldIndicator
'''

count = text.count(needle)
if count != 1:
    fail(f"Expected exactly 1 header controls match, found {count}.")

backup = HEADER.with_suffix(".tsx.before_store_header_button_b13fcd8.bak")
if not backup.exists():
    backup.write_text(text, encoding="utf-8")

HEADER.write_text(text.replace(needle, replacement, 1), encoding="utf-8")

print("\nSUCCESS: Store header button added.")
print("Changed:")
print("  components/portal/portal-header.tsx")
print("\nThe button:")
print("  - appears before the calendar/world indicator")
print("  - is visible on mobile and desktop")
print("  - opens /store in the existing portal modal")
print("  - uses /icons/store.png")
print("\nNext command:")
print("  npm run build")
