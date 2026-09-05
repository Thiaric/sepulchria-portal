import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

export const metadata = {
  title: "Terms of Service | Sepulchria",
  description: "Terms governing use of the Sepulchria roleplaying service.",
};

export default function TermsPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10">
          <PolicyHeader eyebrow="Sepulchria · Legal" title="Terms of Service" effective="24 August 2026" />

          <div className="mt-5 border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-c9b08b))]">
            These Terms set the rules for using Sepulchria, including account eligibility, community conduct, moderation, service access and your responsibilities as a player.
          </div>

          <div className="mt-8 space-y-4 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <Section title="1. About these Terms">
              <p>These Terms govern your access to and use of Sepulchria, an online fantasy roleplaying service operated as Sepulchria (&quot;Sepulchria&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;). By creating an account or using the service, you agree to these Terms, our Community Rules, Privacy Notice and other policies that expressly apply to the service.</p>
              <p>Questions about these Terms may be sent to <a className="text-[rgb(var(--sep-colour-d2ae78))] underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
            </Section>
            <Section title="2. Minimum age"><p>Sepulchria is an 18+ service. You must be at least 18 years old to create or use an account. You must provide truthful age information and must not allow a person under 18 to use your account. Our separate Age Policy explains how this rule is applied.</p></Section>
            <Section title="3. Accounts and security"><p>You are responsible for keeping your login credentials secure and for activity carried out through your account. Registration information must be accurate. You must not impersonate another person, evade a suspension or ban, obtain unauthorised access to another account, or interfere with the security or operation of the service.</p></Section>
            <Section title="4. Characters, roleplay and community conduct">
              <p>Sepulchria is a collaborative roleplaying environment. Your use of chats, Private Messages, Instant Chat, Whispers, Private Locations, forums, profiles and other user-to-user features is subject to the Community Rules.</p>
              <p>Mature fictional themes may be permitted within the limits of those rules. Consensual explicit sexual roleplay in writing is allowed only in private communication spaces, only between players aged 18 or older, and only where every character involved is presented as at least 18 years old. Pornographic visual or audiovisual material is prohibited throughout the service.</p>
            </Section>
            <Section title="5. User content">
              <p>You retain ownership of content you create, subject to any rights belonging to others. By submitting content to Sepulchria, you give us a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, display, transmit and technically adapt that content only as reasonably necessary to operate, secure, moderate and provide the service.</p>
              <p>You must have the rights or permissions needed for material you submit or link. You must not submit unlawful content or content that breaches the Community Rules.</p>
            </Section>
            <Section title="6. Moderation, reports and enforcement">
              <p>We may review reported content and relevant surrounding context, investigate suspected rule breaches, preserve evidence, obscure or remove content, restrict features, warn users, suspend accounts or permanently remove access where reasonably necessary to enforce our rules, protect users, secure the service or comply with legal obligations.</p>
              <p>Private communications are not public, but they are not exempt from moderation. Authorised staff may access them where reasonably necessary for a report, safety investigation, security matter or legal obligation.</p>
              <p>Where an appeal process is available, eligible moderation decisions may be appealed through the service. Good-faith reports are permitted; knowingly false or malicious reporting may itself be treated as abuse.</p>
            </Section>
            <Section title="7. Safety and illegal content"><p>Content involving child sexual exploitation or abuse, grooming, sexualisation of minors, encouragement or instruction for suicide or self-harm, prohibited pornographic media, credible threats and other illegal or seriously harmful content may be restricted or escalated urgently. See our Safety page and Community Rules for details.</p></Section>
            <Section title="8. Virtual items, currency and game features"><p>Remnants, Items, abilities, characters, titles and other in-game benefits are features of the game. Unless we expressly state otherwise, they have no cash value, are not redeemable for money and do not create ownership of the underlying service or game systems. Unauthorised real-money trading is prohibited.</p></Section>
            <Section title="9. Service availability and changes"><p>Sepulchria is an evolving online service. We may add, alter, balance, suspend or remove features, game content or access where reasonably necessary. We do not guarantee uninterrupted or error-free availability. We may perform maintenance and may take emergency action to protect the service or its users.</p></Section>
            <Section title="10. Suspension and termination">
              <p>You may stop using Sepulchria at any time. We may restrict, suspend or terminate access for serious or repeated breaches, safety or security risks, unlawful activity, ban evasion, or where operation of the account would expose the service or others to unacceptable risk.</p>
              <p>Account closure does not necessarily require immediate deletion of every record. Information may be retained where reasonably required for legal obligations, security, fraud prevention, moderation evidence, disputes or enforcement, as explained in the Privacy Notice.</p>
            </Section>
            <Section title="11. Intellectual property"><p>The Sepulchria name, original setting, site design, game systems, text, artwork and other materials supplied by the service remain protected by the intellectual-property rights applicable to them. These Terms do not transfer those rights to users. User-created material remains subject to section 5.</p></Section>
            <Section title="12. Liability"><p>Nothing in these Terms excludes or limits liability where it would be unlawful to do so, including liability that cannot be excluded under applicable consumer law. To the extent permitted by law, Sepulchria is not responsible for indirect or unforeseeable loss arising from use of a free entertainment service, or for loss caused by circumstances outside our reasonable control.</p></Section>
            <Section title="13. Privacy and cookies"><p>Our Privacy Notice explains how personal information is used. Our Cookie Notice explains cookies and similar local-storage technologies used by the service.</p></Section>
            <Section title="14. Changes to these Terms"><p>We may update these Terms to reflect changes to the service, law, safety requirements or our operating practices. Material changes will be communicated appropriately and, where needed, we may require renewed acceptance before continued use.</p></Section>
            <Section title="15. Governing law"><p>These Terms are governed by the laws of England and Wales, without removing any mandatory rights you may have under the law of the country in which you live. Courts with jurisdiction under applicable law may hear disputes relating to these Terms.</p></Section>
          </div>
          <PolicyFooter />
        </article>
      </main>
    </>
  );
}

function PolicyHeader({ eyebrow, title, effective }: { eyebrow: string; title: string; effective: string }) {
  return <header><Link href="/homepage" className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))] hover:text-[rgb(var(--sep-colour-e2bf88))]">← Homepage</Link><p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">{eyebrow}</p><h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">{title}</h1><p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))]">Effective: {effective}</p></header>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
        {title}
      </h2>
      <div className="mt-2 space-y-3">
        {children}
      </div>
    </section>
  );
}
function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}
