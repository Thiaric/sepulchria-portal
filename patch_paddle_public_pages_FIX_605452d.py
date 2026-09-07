from __future__ import annotations

import re
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

head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
if head != EXPECTED_HEAD:
    fail(
        f"This repair patch is for {EXPECTED_HEAD[:7]}, but HEAD is {head[:7]}.\n"
        "Ask for a refreshed patch against the current commit."
    )

for required in ("app/purchases/page.tsx", "app/refund-policy/page.tsx"):
    if not (ROOT / required).exists():
        fail(
            f"{required} is missing. The first patch should have created it before failing. "
            "Ask for a full rebuild patch."
        )
    print(f"kept: {required}")

homepage_path = "components/homepage/sepulchria-homepage.tsx"
homepage = read(homepage_path)

if 'href="/purchases"' in homepage and 'href="/refund-policy"' in homepage:
    print(f"already done: {homepage_path} (crawlable policy links)")
else:
    pattern = re.compile(
        r'''<button\s*
                type="button"\s*
                onClick=\{\(\) =>\s*
                  setPublicModal\(\{\s*
                    title: "Community Rules",\s*
                    href: "/community-rules",\s*
                  \}\)\s*
                \}\s*
              >\s*
                Community Rules\s*
              </button>\s*
              <button\s*
                type="button"\s*
                onClick=\{\(\) =>\s*
                  setPublicModal\(\{\s*
                    title: "Safety",\s*
                    href: "/safety",\s*
                  \}\)\s*
                \}\s*
              >\s*
                Safety\s*
              </button>\s*
              <button\s*
                type="button"\s*
                onClick=\{\(\) =>\s*
                  setPublicModal\(\{\s*
                    title: "18\+ Policy",\s*
                    href: "/age-policy",\s*
                  \}\)\s*
                \}\s*
              >\s*
                18\+ Policy\s*
              </button>\s*
              <button\s*
                type="button"\s*
                onClick=\{\(\) =>\s*
                  setPublicModal\(\{\s*
                    title: "Privacy",\s*
                    href: "/privacy",\s*
                  \}\)\s*
                \}\s*
              >\s*
                Privacy\s*
              </button>\s*
              <button\s*
                type="button"\s*
                onClick=\{\(\) =>\s*
                  setPublicModal\(\{\s*
                    title: "Cookies",\s*
                    href: "/cookies",\s*
                  \}\)\s*
                \}\s*
              >\s*
                Cookies\s*
              </button>\s*
              <CookieSettingsButton className="uppercase tracking-\[0\.18em\]" />\s*
              <button\s*
                type="button"\s*
                onClick=\{\(\) =>\s*
                  setPublicModal\(\{\s*
                    title: "Terms",\s*
                    href: "/terms",\s*
                  \}\)\s*
                \}\s*
              >\s*
                Terms\s*
              </button>''',
        re.VERBOSE | re.DOTALL,
    )

    replacement = '''<Link
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
              </Link>'''

    homepage2, count = pattern.subn(replacement, homepage, count=1)
    if count != 1:
        fail(
            f"{homepage_path}: could not locate the legal-button block. "
            "No files after this point were changed."
        )
    write(homepage_path, homepage2)

terms_path = "app/terms/page.tsx"

old_terms_8 = '''            <Section title="8. Virtual items, currency and game features"><p>Remnants, Items, abilities, characters, titles and other in-game benefits are features of the game. Unless we expressly state otherwise, they have no cash value, are not redeemable for money and do not create ownership of the underlying service or game systems. Unauthorised real-money trading is prohibited.</p></Section>'''

new_terms_8 = '''            <Section title="8. Virtual items, currency, paid extras and game features">
              <p>Remnants, Items, abilities, characters, titles and other in-game benefits are features of the game. Unless we expressly state otherwise, they have no cash value, are not redeemable for money and do not create ownership of the underlying service or game systems. Unauthorised real-money trading is prohibited.</p>
              <p>Sepulchria may also offer optional real-money digital extras such as Portal Skins, cosmetics, music, feature access, Private Locations and bundles. These purchases supplement the Sepulchria roleplaying game; Sepulchria is not an online retail marketplace.</p>
              <p>Real-money purchases processed through Paddle are sold and processed by Paddle as Merchant of Record. Paddle handles checkout and payment processing for those transactions. The product, contents, currency and price are shown before purchase.</p>
              <p>Our <Link className="text-[rgb(var(--sep-colour-d2ae78))] underline" href="/purchases">Optional Purchases</Link> page describes the available purchase types and pricing. Our <Link className="text-[rgb(var(--sep-colour-d2ae78))] underline" href="/refund-policy">Refund Policy</Link> explains how refund requests are handled.</p>
            </Section>'''

replace_once(terms_path, old_terms_8, new_terms_8, "paid purchases section")

old_terms_12 = '''            <Section title="12. Liability"><p>Nothing in these Terms excludes or limits liability where it would be unlawful to do so, including liability that cannot be excluded under applicable consumer law. To the extent permitted by law, Sepulchria is not responsible for indirect or unforeseeable loss arising from use of a free entertainment service, or for loss caused by circumstances outside our reasonable control.</p></Section>'''

new_terms_12 = '''            <Section title="12. Liability"><p>Nothing in these Terms excludes or limits liability where it would be unlawful to do so, including liability that cannot be excluded under applicable consumer law. To the extent permitted by law, Sepulchria is not responsible for indirect or unforeseeable loss arising from use of the roleplaying service or its optional digital features, or for loss caused by circumstances outside our reasonable control.</p></Section>'''

replace_once(terms_path, old_terms_12, new_terms_12, "remove free-service wording")

old_terms_footer = '''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

new_terms_footer = '''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/purchases">Optional Purchases</Link><Link href="/refund-policy">Refund Policy</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

replace_once(terms_path, old_terms_footer, new_terms_footer, "policy footer links")

privacy_path = "app/privacy/page.tsx"

old_privacy_6 = '''            <Section title="6. Service providers and sharing"><p>Sepulchria uses service providers to operate its infrastructure. The current application uses Supabase for database, authentication and related backend services. Hosting and technical providers may process limited data as needed to deliver and secure the service.</p><p>Information may also be disclosed where reasonably necessary to comply with law, respond to lawful requests, report serious child-safety or other illegal content, protect users, or establish, exercise or defend legal claims. We do not sell personal information.</p></Section>'''

new_privacy_6 = '''            <Section title="6. Service providers and sharing">
              <p>Sepulchria uses service providers to operate its infrastructure. The current application uses Supabase for database, authentication and related backend services. Hosting and technical providers may process limited data as needed to deliver and secure the service.</p>
              <p>For optional real-money purchases, Paddle acts as Merchant of Record and payment processor for Paddle-processed transactions. Paddle receives and processes the information needed to complete checkout, collect payment, administer the transaction and handle related payment or refund activity. Sepulchria does not receive your full payment-card details from Paddle.</p>
              <p>Information may also be disclosed where reasonably necessary to comply with law, respond to lawful requests, report serious child-safety or other illegal content, protect users, or establish, exercise or defend legal claims. We do not sell personal information.</p>
            </Section>'''

replace_once(privacy_path, old_privacy_6, new_privacy_6, "Paddle processing disclosure")

old_privacy_footer = '''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

new_privacy_footer = '''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/purchases">Optional Purchases</Link><Link href="/refund-policy">Refund Policy</Link><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

replace_once(privacy_path, old_privacy_footer, new_privacy_footer, "policy footer links")

print("\nRepair patch applied successfully.")
print("The two pages created by the first run were kept.")
print("Now run: npm run build")
