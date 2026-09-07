from pathlib import Path

path = Path("components/homepage/sepulchria-homepage.tsx")

if not path.exists():
    raise SystemExit(
        "\nERROR: components/homepage/sepulchria-homepage.tsx not found\n"
    )

text = path.read_text(encoding="utf-8")

marker = 'data-homepage-footer-nav="true"'
marker_pos = text.find(marker)

if marker_pos == -1:
    raise SystemExit(
        '\nERROR: Could not find data-homepage-footer-nav="true" in the homepage.\n'
    )

nav_start = text.rfind("<nav", 0, marker_pos)
if nav_start == -1:
    raise SystemExit("\nERROR: Could not find opening footer <nav>.\n")

nav_end = text.find("</nav>", marker_pos)
if nav_end == -1:
    raise SystemExit("\nERROR: Could not find closing footer </nav>.\n")

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

              <a href="mailto:sepulchriarpg@gmail.com">
                Contact
              </a>
            </nav>'''

text = text[:nav_start] + new_nav + text[nav_end:]

path.write_text(text, encoding="utf-8", newline="\n")

print("updated: components/homepage/sepulchria-homepage.tsx")
print("Footer nav replaced successfully.")
print("Contact label: Contact")
print("Contact target: mailto:sepulchriarpg@gmail.com")
print("Policy links still open through HomepagePublicModal.")
