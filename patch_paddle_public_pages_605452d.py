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
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"updated: {path}")

def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        fail(f"{path}: expected exactly 1 match, found {count}")
    write(path, content.replace(old, new, 1))

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        "This patch was built for commit "
        f"{EXPECTED_HEAD[:7]}, but your current HEAD is {head[:7]}.\n"
        "Do not force it. Ask for a refreshed patch against your current HEAD."
    )

purchases_page = r'''import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

export const metadata = {
  title: "Optional Purchases | Sepulchria",
  description:
    "Information about optional digital purchases available inside the Sepulchria online play-by-chat roleplaying game.",
};

const purchaseTypes = [
  {
    title: "Portal Skins",
    price: "From £1.99",
    text: "Optional visual themes for the Sepulchria portal interface.",
  },
  {
    title: "Cosmetic Frames & Backgrounds",
    price: "From £2.99",
    text: "Optional cosmetic presentation for characters and selected interface elements.",
  },
  {
    title: "Location Music",
    price: "From £0.99",
    text: "Optional music unlocks for supported in-game locations.",
  },
  {
    title: "Friend List Access",
    price: "£10.00",
    text: "Unlocks the Friend List feature for the purchasing account.",
  },
  {
    title: "Private Locations",
    price: "£20.00",
    text: "Unlocks access to create and manage eligible private roleplay locations.",
  },
  {
    title: "Bundles",
    price: "Price shown before purchase",
    text: "Curated groups of Sepulchria digital features or cosmetics. The exact contents and total price are shown before checkout.",
  },
] as const;

export default function PurchasesPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10">
          <Link
            href="/homepage"
            className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))] hover:text-[rgb(var(--sep-colour-e2bf88))]"
          >
            ← Homepage
          </Link>

          <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">
            Sepulchria · Optional Purchases
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">
            Optional Digital Purchases
          </h1>

          <div className="mt-5 border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-c9b08b))]">
            Sepulchria is an English-language online play-by-chat fantasy roleplaying game.
            These are optional digital extras for players of the game; Sepulchria is not an
            online retail marketplace.
          </div>

          <div className="mt-8 space-y-4 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                What Sepulchria is
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  Players create characters and take part in a persistent shared fantasy world
                  through written roleplay, location chats, private communication, events and
                  other game systems.
                </p>
                <p>
                  An account is required to enter the game and to access the in-game Store.
                  Purchases are attached to the relevant Sepulchria account or character and are
                  delivered digitally.
                </p>
              </div>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                Current purchase types and pricing
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {purchaseTypes.map((item) => (
                  <article
                    key={item.title}
                    className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-serif text-base text-[rgb(var(--sep-colour-d7bd91))]">
                        {item.title}
                      </h3>
                      <span className="shrink-0 text-[11px] font-semibold text-[rgb(var(--sep-colour-d2ae78))]">
                        {item.price}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-9f907b))]">
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-[rgb(var(--sep-colour-8f8270))]">
                The in-game Store shows the exact product, contents, currency and final price
                before checkout. Promotional discounts may temporarily reduce a displayed price.
              </p>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                Payments and delivery
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  Real-money purchases are processed through Paddle, which acts as Merchant of
                  Record for Paddle-processed transactions. Paddle handles checkout and payment
                  processing.
                </p>
                <p>
                  Successful purchases are fulfilled digitally to the eligible Sepulchria account
                  or character. Purchase history is available to the player inside the game.
                </p>
              </div>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                Support and refunds
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  For purchase questions, contact{" "}
                  <a
                    className="text-[rgb(var(--sep-colour-d2ae78))] underline"
                    href={`mailto:${contactEmail}`}
                  >
                    {contactEmail}
                  </a>
                  .
                </p>
                <p>
                  Refund information is available in our{" "}
                  <Link
                    className="text-[rgb(var(--sep-colour-d2ae78))] underline"
                    href="/refund-policy"
                  >
                    Refund Policy
                  </Link>
                  .
                </p>
              </div>
            </section>
          </div>

          <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]">
            <Link href="/terms">Terms</Link>
            <Link href="/refund-policy">Refund Policy</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookies">Cookies</Link>
          </footer>
        </article>
      </main>
    </>
  );
}
'''
write("app/purchases/page.tsx", purchases_page)

refund_page = r'''import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

export const metadata = {
  title: "Refund Policy | Sepulchria",
  description: "Refund information for optional real-money purchases in Sepulchria.",
};

export default function RefundPolicyPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10">
          <Link
            href="/homepage"
            className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))] hover:text-[rgb(var(--sep-colour-e2bf88))]"
          >
            ← Homepage
          </Link>

          <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">
            Sepulchria · Purchases
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">
            Refund Policy
          </h1>

          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))]">
            Effective: 7 September 2026
          </p>

          <div className="mt-5 border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-c9b08b))]">
            This policy applies to optional real-money digital purchases made for Sepulchria.
            Purchases made only with in-game Remnants are not real-money transactions and are not
            covered by this refund process.
          </div>

          <div className="mt-8 space-y-4 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <Section title="1. Payment processor and Merchant of Record">
              <p>
                Paddle processes Sepulchria real-money purchases and acts as Merchant of Record
                for Paddle-processed transactions. Approved refunds are returned through Paddle
                to the payment method used for the purchase.
              </p>
            </Section>

            <Section title="2. Requesting a refund">
              <p>
                A refund request for an eligible real-money purchase may be submitted within
                14 days of purchase by contacting{" "}
                <a
                  className="text-[rgb(var(--sep-colour-d2ae78))] underline"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
                . Include enough information to identify the purchase, such as the order number
                and the account email used for the transaction.
              </p>
            </Section>

            <Section title="3. Review of requests">
              <p>
                Refund requests are reviewed in accordance with applicable consumer rights,
                Paddle&apos;s buyer and refund rules, and the circumstances of the purchase.
                Submission of a request does not remove any mandatory rights you may have under
                applicable law.
              </p>
            </Section>

            <Section title="4. Effect of a refund">
              <p>
                When a purchase is refunded, access to the corresponding paid digital entitlement
                may be revoked. Where the same entitlement remains valid because it was separately
                obtained through another eligible purchase or grant, that separate entitlement is
                unaffected.
              </p>
            </Section>

            <Section title="5. Remnants purchases">
              <p>
                Purchases made exclusively with Remnants, Sepulchria&apos;s in-game currency, are
                not cash purchases and are not refundable for money.
              </p>
            </Section>

            <Section title="6. Consumer rights">
              <p>
                Nothing in this policy limits rights that cannot lawfully be excluded or restricted.
                Where applicable law gives you stronger rights, those rights take priority.
              </p>
            </Section>

            <Section title="7. Contact">
              <p>
                Questions about a Sepulchria purchase or refund request can be sent to{" "}
                <a
                  className="text-[rgb(var(--sep-colour-d2ae78))] underline"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
                .
              </p>
            </Section>
          </div>

          <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]">
            <Link href="/purchases">Optional Purchases</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookies">Cookies</Link>
          </footer>
        </article>
      </main>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
        {title}
      </h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
'''
write("app/refund-policy/page.tsx", refund_page)

homepage_path = "components/homepage/sepulchria-homepage.tsx"

old_footer_links = r'''              <button
                type="button"
                onClick={() =>
                  setPublicModal({
                    title: "Community Rules",
                    href: "/community-rules",
                  })
                }

              >
                Community Rules
              </button>
              <button
                type="button"
                onClick={() =>
                  setPublicModal({
                    title: "Safety",
                    href: "/safety",
                  })
                }

              >
                Safety
              </button>
              <button
                type="button"
                onClick={() =>
                  setPublicModal({
                    title: "18+ Policy",
                    href: "/age-policy",
                  })
                }

              >
                18+ Policy
              </button>
              <button
                type="button"
                onClick={() =>
                  setPublicModal({
                    title: "Privacy",
                    href: "/privacy",
                  })
                }

              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() =>
                  setPublicModal({
                    title: "Cookies",
                    href: "/cookies",
                  })
                }

              >
                Cookies
              </button>
              <CookieSettingsButton className="uppercase tracking-[0.18em]" />
              <button
                type="button"
                onClick={() =>
                  setPublicModal({
                    title: "Terms",
                    href: "/terms",
                  })
                }

              >
                Terms
              </button>'''

new_footer_links = r'''              <Link
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

replace_once(homepage_path, old_footer_links, new_footer_links)

terms_path = "app/terms/page.tsx"

old_terms_8 = r'''            <Section title="8. Virtual items, currency and game features"><p>Remnants, Items, abilities, characters, titles and other in-game benefits are features of the game. Unless we expressly state otherwise, they have no cash value, are not redeemable for money and do not create ownership of the underlying service or game systems. Unauthorised real-money trading is prohibited.</p></Section>'''

new_terms_8 = r'''            <Section title="8. Virtual items, currency, paid extras and game features">
              <p>Remnants, Items, abilities, characters, titles and other in-game benefits are features of the game. Unless we expressly state otherwise, they have no cash value, are not redeemable for money and do not create ownership of the underlying service or game systems. Unauthorised real-money trading is prohibited.</p>
              <p>Sepulchria may also offer optional real-money digital extras such as Portal Skins, cosmetics, music, feature access, Private Locations and bundles. These purchases supplement the Sepulchria roleplaying game; Sepulchria is not an online retail marketplace.</p>
              <p>Real-money purchases processed through Paddle are sold and processed by Paddle as Merchant of Record. Paddle handles checkout and payment processing for those transactions. The product, contents, currency and price are shown before purchase.</p>
              <p>Our <Link className="text-[rgb(var(--sep-colour-d2ae78))] underline" href="/purchases">Optional Purchases</Link> page describes the available purchase types and pricing. Our <Link className="text-[rgb(var(--sep-colour-d2ae78))] underline" href="/refund-policy">Refund Policy</Link> explains how refund requests are handled.</p>
            </Section>'''

replace_once(terms_path, old_terms_8, new_terms_8)

old_terms_footer = r'''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

new_terms_footer = r'''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/purchases">Optional Purchases</Link><Link href="/refund-policy">Refund Policy</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

replace_once(terms_path, old_terms_footer, new_terms_footer)

privacy_path = "app/privacy/page.tsx"

old_privacy_6 = r'''            <Section title="6. Service providers and sharing"><p>Sepulchria uses service providers to operate its infrastructure. The current application uses Supabase for database, authentication and related backend services. Hosting and technical providers may process limited data as needed to deliver and secure the service.</p><p>Information may also be disclosed where reasonably necessary to comply with law, respond to lawful requests, report serious child-safety or other illegal content, protect users, or establish, exercise or defend legal claims. We do not sell personal information.</p></Section>'''

new_privacy_6 = r'''            <Section title="6. Service providers and sharing">
              <p>Sepulchria uses service providers to operate its infrastructure. The current application uses Supabase for database, authentication and related backend services. Hosting and technical providers may process limited data as needed to deliver and secure the service.</p>
              <p>For optional real-money purchases, Paddle acts as Merchant of Record and payment processor for Paddle-processed transactions. Paddle receives and processes the information needed to complete checkout, collect payment, administer the transaction and handle related payment or refund activity. Sepulchria does not receive your full payment-card details from Paddle.</p>
              <p>Information may also be disclosed where reasonably necessary to comply with law, respond to lawful requests, report serious child-safety or other illegal content, protect users, or establish, exercise or defend legal claims. We do not sell personal information.</p>
            </Section>'''

replace_once(privacy_path, old_privacy_6, new_privacy_6)

old_privacy_footer = r'''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

new_privacy_footer = r'''function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/purchases">Optional Purchases</Link><Link href="/refund-policy">Refund Policy</Link><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/cookies">Cookies</Link></footer>;
}'''

replace_once(privacy_path, old_privacy_footer, new_privacy_footer)

print("\nPatch applied successfully.")
print("Changed:")
print("  - added /purchases")
print("  - added /refund-policy")
print("  - homepage policy links are real crawlable href links while keeping modal UX")
print("  - Terms explain optional purchases and Paddle Merchant of Record")
print("  - Privacy explains Paddle payment processing")
print("  - Terms/Privacy footers link Purchases and Refund Policy")
print("\nNext run: npm run build")
