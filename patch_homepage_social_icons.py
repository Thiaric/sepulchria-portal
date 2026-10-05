from pathlib import Path
import sys

ROOT = Path.cwd()
PATH = ROOT / "components" / "homepage" / "sepulchria-homepage.tsx"

if not PATH.exists():
    print(
        "ERROR: Run this script from the sepulchria-portal repository root.",
        file=sys.stderr,
    )
    sys.exit(1)

text = PATH.read_text(encoding="utf-8")

old = '''            >
              <Link href="https://discord.com/channels/1542825856982982676/1542926663959052419" target="_new">
                Discord
              </Link>
'''

new = '''            >
              <Link
                href="https://www.instagram.com/sepulchriarpg/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sepulchria on Instagram"
                title="Instagram"
                className="inline-flex items-center justify-center"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="5"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="4.2"
                  />
                  <circle
                    cx="17.4"
                    cy="6.8"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </Link>

              <Link
                href="https://www.tiktok.com/@sepulchria.rpg4?lang=en-GB"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sepulchria on TikTok"
                title="TikTok"
                className="inline-flex items-center justify-center"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                >
                  <path d="M14.2 3h2.7c.25 1.47 1.07 2.73 2.31 3.55A5.8 5.8 0 0 0 22 7.5v2.66a8.4 8.4 0 0 1-5.14-1.68v6.47a6.15 6.15 0 1 1-5.3-6.1v2.73a3.48 3.48 0 1 0 2.64 3.37V3Z" />
                </svg>
              </Link>

              <Link href="https://discord.com/channels/1542825856982982676/1542926663959052419" target="_new">
                Discord
              </Link>
'''

count = text.count(old)

if count != 1:
    print(
        f"ERROR: Expected exactly 1 Discord footer block, found {count}. No changes made.",
        file=sys.stderr,
    )
    sys.exit(1)

text = text.replace(old, new, 1)
PATH.write_text(text, encoding="utf-8")

print("OK: added Instagram and TikTok icons before Discord in the homepage footer.")
print("Next: npm run build")
