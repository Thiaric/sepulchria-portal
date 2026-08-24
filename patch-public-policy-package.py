
from pathlib import Path

ROOT = Path.cwd()

def replace_once(path: Path, old: str, new: str, label: str):
    if not path.exists():
        raise SystemExit(f"ERROR [{label}]: file not found: {path}")
    text = path.read_text(encoding="utf-8")
    if new in text:
        print(f"Already applied [{label}]")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR [{label}]: expected exactly one matching block in {path}, found {count}. "
            "Stopped before making this replacement."
        )
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"Applied [{label}]")

def create_file(path: Path, content: str, label: str):
    if path.exists():
        existing = path.read_text(encoding="utf-8")
        if existing == content:
            print(f"Already exists [{label}]")
            return
        raise SystemExit(f"ERROR [{label}]: {path} already exists with different content.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"Created [{label}]")

def replace_file_guarded(path: Path, required_fragments: list[str], content: str, label: str):
    if not path.exists():
        raise SystemExit(f"ERROR [{label}]: file not found: {path}")
    current = path.read_text(encoding="utf-8")
    if current == content:
        print(f"Already applied [{label}]")
        return
    missing = [fragment for fragment in required_fragments if fragment not in current]
    if missing:
        raise SystemExit(
            f"ERROR [{label}]: current file does not match the expected baseline. "
            f"Missing marker: {missing[0]!r}. Stopped."
        )
    path.write_text(content, encoding="utf-8")
    print(f"Replaced [{label}]")

LEGAL_HEADER = '''import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

'''

terms = LEGAL_HEADER + r'''export const metadata = {
  title: "Terms of Service | Sepulchria",
  description: "Terms governing use of the Sepulchria roleplaying service.",
};

export default function TermsPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]">
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10">
          <PolicyHeader eyebrow="Sepulchria · Legal" title="Terms of Service" effective="24 August 2026" />

          <div className="mt-8 space-y-8 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
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
  return <section><h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}
'''

privacy = LEGAL_HEADER + r'''export const metadata = {
  title: "Privacy Notice | Sepulchria",
  description: "How Sepulchria collects, uses and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]">
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 sm:p-10">
          <Link href="/homepage" className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))]">← Homepage</Link>
          <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">Sepulchria · Privacy</p>
          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">Privacy Notice</h1>
          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))]">Effective: 24 August 2026</p>
          <div className="mt-8 space-y-8 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <Section title="1. Who is responsible for your information"><p>Sepulchria is responsible for the personal information described in this Notice. Privacy enquiries and requests can be sent to <a className="text-[rgb(var(--sep-colour-d2ae78))] underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p></Section>
            <Section title="2. Information we collect">
              <ul className="list-disc space-y-2 pl-5"><li>account information, including email address and authentication identifiers;</li><li>date of birth and your confirmation that you are at least 18;</li><li>character information, profiles, biographies, images and game data;</li><li>content you submit through location chat, Whispers, Instant Chat, Private Messages, forums, reports and support features;</li><li>friend, block, presence and other social or preference information;</li><li>moderation, report, sanction, appeal and safety records;</li><li>technical and security information reasonably generated when the service is used, such as session, request and authentication information.</li></ul>
            </Section>
            <Section title="3. Why we use personal information">
              <p>We use personal information to:</p><ul className="list-disc space-y-2 pl-5"><li>create and authenticate accounts and provide the game and communication features you request;</li><li>operate character, social, forum, messaging, market and gameplay systems;</li><li>enforce the 18+ rule, Community Rules and Terms;</li><li>receive and investigate reports, preserve evidence, handle appeals and protect users;</li><li>detect misuse, secure the service and prevent ban evasion, fraud or unauthorised access;</li><li>comply with legal, regulatory, safeguarding and law-enforcement obligations where applicable;</li><li>maintain and improve the reliability and administration of the service.</li></ul>
            </Section>
            <Section title="4. Lawful bases"><p>Depending on the activity, we process personal information because it is necessary to provide the service you request and perform our agreement with you; because we have legitimate interests in operating, securing and moderating Sepulchria; to comply with legal obligations; or, where specifically required, on the basis of your consent.</p><p>Where particularly sensitive information is processed, we will only do so where an additional lawful condition applies. Sepulchria is not intended as a service for users to provide sensitive real-world personal information unnecessarily.</p></Section>
            <Section title="5. Public and private content"><p>Material posted to public profiles, public forums or public game areas may be visible to other users. Private Messages, Whispers, Instant Chat and Private Locations have more limited visibility, but authorised staff may access reported content and relevant context where reasonably necessary for moderation, user safety, service security or legal compliance.</p></Section>
            <Section title="6. Service providers and sharing"><p>Sepulchria uses service providers to operate its infrastructure. The current application uses Supabase for database, authentication and related backend services. Hosting and technical providers may process limited data as needed to deliver and secure the service.</p><p>Information may also be disclosed where reasonably necessary to comply with law, respond to lawful requests, report serious child-safety or other illegal content, protect users, or establish, exercise or defend legal claims. We do not sell personal information.</p></Section>
            <Section title="7. International processing"><p>Some service providers may process information from infrastructure located outside the UK. Where UK data-protection law requires safeguards for an international transfer, we rely on the provider&apos;s applicable transfer mechanism or other lawful safeguards.</p></Section>
            <Section title="8. Retention"><p>We keep account and game information for as long as the account is active and for a reasonable period afterwards where needed to administer the service. Different records may be retained for different periods.</p><p>Reports, moderation evidence, sanctions, appeals, security records and serious safety incidents may be retained longer where reasonably necessary for enforcement, repeat-offender detection, legal obligations, safeguarding, dispute handling or the defence of legal claims. We periodically review whether retained information is still needed.</p></Section>
            <Section title="9. Account closure and deletion requests"><p>You may contact us to request account closure or deletion of personal information. Deletion rights are not absolute. We may retain limited information where the law permits or requires this, including information needed for security, moderation evidence, legal claims or compliance obligations.</p></Section>
            <Section title="10. Your data-protection rights"><p>Depending on the circumstances, UK data-protection law may give you rights to request access to your personal information, correction, erasure, restriction, portability, or to object to certain processing. Where processing relies on consent, you may withdraw that consent for future processing.</p><p>To make a request, email <a className="text-[rgb(var(--sep-colour-d2ae78))] underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>. We may need enough information to verify that the request relates to you.</p></Section>
            <Section title="11. Complaints"><p>Please contact us first if you have a privacy concern so we can investigate it. You may also have the right to complain to the UK Information Commissioner&apos;s Office (ICO).</p></Section>
            <Section title="12. Security"><p>We use technical and organisational measures intended to protect account and service data, including access controls and restricted staff tooling. No online service can guarantee absolute security.</p></Section>
            <Section title="13. Cookies and local storage"><p>Sepulchria uses cookies and similar browser storage for authentication, security and user preferences. See the Cookie Notice for current details.</p></Section>
            <Section title="14. Changes to this Notice"><p>We may update this Notice when the service, our providers or legal requirements change. Material changes will be brought to users&apos; attention where appropriate.</p></Section>
          </div>
          <PolicyFooter />
        </article>
      </main>
    </>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/cookies">Cookies</Link></footer>;
}
'''

safety = LEGAL_HEADER + r'''export const metadata = {
  title: "Safety | Sepulchria",
  description: "Safety, reporting and moderation information for Sepulchria users.",
};
export default function SafetyPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]">
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 sm:p-10">
          <Link href="/homepage" className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))]">← Homepage</Link>
          <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">Sepulchria · Community & Safety</p>
          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">Safety & Reporting</h1>
          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))]">Effective: 24 August 2026</p>
          <div className="mt-8 space-y-8 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <Section title="18+ service"><p>Sepulchria is for adults aged 18 or older. See our Age Policy for the rules that apply to account eligibility and age concerns.</p></Section>
            <Section title="Report harmful or rule-breaking content"><p>Use the Report control attached to content whenever possible. Reports can be made for forum content, character profiles, location messages, Private Messages and Instant Chat. Reports preserve the reported material and relevant context for authorised staff review.</p><p>For a concern that cannot be reported through an attached control, use the support system or contact <a className="text-[rgb(var(--sep-colour-d2ae78))] underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p></Section>
            <Section title="Child-safety and illegal-content concerns"><p>Sepulchria has zero tolerance for child sexual exploitation or abuse, sexual content involving minors, grooming or sexual solicitation of minors. Serious child-safety concerns and other potentially illegal or immediately dangerous content may be escalated urgently and, where appropriate, reported to the relevant authorities.</p></Section>
            <Section title="Private communications"><p>Private Messages, Whispers, Instant Chat and Private Locations are not publicly visible, but the Community Rules still apply. Authorised staff may review reported content and relevant surrounding context where reasonably necessary to investigate a safety concern, enforce the rules, secure the service or comply with law.</p></Section>
            <Section title="Blocking"><p>Blocking tools are available to help users limit unwanted contact. Blocking does not prevent staff from reviewing a report or taking action where required.</p></Section>
            <Section title="Moderation action"><p>Depending on severity and context, staff may take no action, obscure or remove content, issue warnings, restrict features, suspend access or permanently remove an account. Relevant evidence and moderation records may be preserved.</p></Section>
            <Section title="Appeals"><p>Where an appeal is available for a sanction, the affected user can use the appeal process provided in Sepulchria. Appeals are reviewed through the moderation system and do not guarantee that a decision will be changed.</p></Section>
            <Section title="Immediate danger"><p>Sepulchria is not an emergency service. If you believe someone is in immediate real-world danger, contact the appropriate emergency service in your location rather than waiting for a response from Sepulchria.</p></Section>
            <Section title="Community standards"><p>Our Community Rules contain the detailed rules on prohibited content, harassment, sexual content, consent, minors, harmful content and enforcement.</p><Link href="/community-rules" className="inline-block text-[rgb(var(--sep-colour-d2ae78))] underline">Read the Community Rules →</Link></Section>
          </div>
          <PolicyFooter />
        </article>
      </main>
    </>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}
'''

age = LEGAL_HEADER + r'''export const metadata = {
  title: "18+ Age Policy | Sepulchria",
  description: "Sepulchria's 18+ account and roleplay age policy.",
};
export default function AgePolicyPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]">
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 sm:p-10">
          <Link href="/homepage" className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))]">← Homepage</Link>
          <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">Sepulchria · 18+ Policy</p>
          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">Age Policy</h1>
          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))]">Effective: 24 August 2026</p>
          <div className="mt-8 space-y-8 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <Section title="1. Sepulchria is 18+ only"><p>You must be at least 18 years old to register for or use Sepulchria. There is no under-18 account tier.</p></Section>
            <Section title="2. Registration information"><p>Registration requires a date of birth and an explicit confirmation that the user is at least 18. The information you provide must be truthful. Providing a false date of birth or falsely confirming that you are 18+ is a breach of the Terms.</p></Section>
            <Section title="3. Age concerns"><p>If staff reasonably believe an account may be used by a person under 18, access may be restricted while the concern is reviewed. Sepulchria may take proportionate additional steps where reasonably necessary to establish whether the account is eligible to use the service.</p></Section>
            <Section title="4. Characters involved in sexual roleplay"><p>Every character involved in explicit sexual roleplay must be explicitly presented as at least 18 years old. Sexual content involving, depicting or sexualising a real or fictional minor or minor-presenting character is prohibited.</p></Section>
            <Section title="5. Adult roleplay"><p>Consensual explicit sexual roleplay in writing is permitted only in private communication spaces, between players who are all 18 or older, and where every participating character is presented as 18 or older. Pornographic images, video, audio, animation and other prohibited pornographic media are not permitted, including in private spaces.</p></Section>
            <Section title="6. Reporting an under-18 concern"><p>If you believe a user may be under 18, or if you encounter grooming, sexual solicitation of a minor or sexual content involving a minor, use the Report system or contact <a className="text-[rgb(var(--sep-colour-d2ae78))] underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p></Section>
            <Section title="7. Privacy"><p>Date-of-birth and age-related information is handled in accordance with our Privacy Notice. Users should not send identity documents or other sensitive verification material unless Sepulchria has specifically introduced and instructed them to use an appropriate verification process.</p></Section>
          </div>
          <PolicyFooter />
        </article>
      </main>
    </>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></footer>;
}
'''

cookies = LEGAL_HEADER + r'''export const metadata = {
  title: "Cookie Notice | Sepulchria",
  description: "Cookies and similar browser storage used by Sepulchria.",
};
export default function CookiesPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]">
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 sm:p-10">
          <Link href="/homepage" className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))]">← Homepage</Link>
          <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">Sepulchria · Privacy</p>
          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">Cookie Notice</h1>
          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))]">Effective: 24 August 2026</p>
          <div className="mt-8 space-y-8 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <Section title="1. What this Notice covers"><p>This Notice explains cookies and similar technologies used when you access Sepulchria. Similar technologies include browser local storage, which can remember information on your device without using a traditional cookie.</p></Section>
            <Section title="2. Strictly necessary authentication"><p>Sepulchria uses Supabase authentication. Authentication and session cookies or equivalent storage are used to keep you signed in, maintain account sessions, protect authenticated areas and support security. These technologies are necessary for the account service you request.</p></Section>
            <Section title="3. Preference storage"><p>The portal uses browser local storage for user-interface preferences and state, including features such as portal appearance/theme, interface layout or other local preferences. These values are stored on your device so the interface can remember your choices.</p></Section>
            <Section title="4. Analytics and advertising"><p>The current Sepulchria application does not intentionally deploy advertising cookies or a third-party behavioural advertising system. The current application code also does not include a dedicated third-party analytics package.</p><p>If non-essential analytics, advertising or other optional tracking technologies are introduced, we will update this Notice and implement an appropriate consent choice before using them where required.</p></Section>
            <Section title="5. Managing browser storage"><p>You can use your browser controls to inspect, block or delete cookies and site data. Blocking strictly necessary authentication storage may prevent login or other requested features from working. Clearing local storage may reset interface preferences.</p></Section>
            <Section title="6. Third-party services"><p>Infrastructure providers may use technical mechanisms necessary to deliver and secure their services. Our Privacy Notice explains the use of service providers and personal information more generally.</p></Section>
            <Section title="7. Changes"><p>We will review this Notice when our use of cookies, local storage, analytics or other tracking technology changes.</p></Section>
            <Section title="8. Contact"><p>Questions about cookies or privacy can be sent to <a className="text-[rgb(var(--sep-colour-d2ae78))] underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p></Section>
          </div>
          <PolicyFooter />
        </article>
      </main>
    </>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
function PolicyFooter() {
  return <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgb(var(--sep-colour-60482e))]/40 pt-5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8e7b61))]"><Link href="/terms">Terms</Link><Link href="/community-rules">Community Rules</Link><Link href="/safety">Safety</Link><Link href="/age-policy">Age Policy</Link><Link href="/privacy">Privacy</Link></footer>;
}
'''

replace_file_guarded(
    ROOT / "app/terms/page.tsx",
    ["Development notice: this page is a functional placeholder", "Terms of Service"],
    terms,
    "Final Terms of Service",
)

replace_file_guarded(
    ROOT / "app/privacy/page.tsx",
    ["Development notice: this page is a functional placeholder", "Privacy Policy"],
    privacy,
    "Final Privacy Notice",
)

create_file(ROOT / "app/safety/page.tsx", safety, "Public Safety page")
create_file(ROOT / "app/age-policy/page.tsx", age, "18+ Age Policy")
create_file(ROOT / "app/cookies/page.tsx", cookies, "Cookie Notice")

proxy = ROOT / "lib/supabase/proxy.ts"
replace_once(
    proxy,
    '''const PUBLIC_ROUTES = [
  "/",
  "/homepage",
  "/codex",
  "/rules",
  "/terms",
  "/privacy",
  "/auth",
  "/api/auth",
];''',
    '''const PUBLIC_ROUTES = [
  "/",
  "/homepage",
  "/codex",
  "/rules",
  "/terms",
  "/privacy",
  "/community-rules",
  "/safety",
  "/age-policy",
  "/cookies",
  "/auth",
  "/api/auth",
];''',
    "Public policy routes",
)

replace_once(
    proxy,
    '''const SANCTION_ACCESS_ROUTES = [
  "/sanctions",
  "/support",
  "/terms",
  "/privacy",
  "/auth",
  "/api/sanctions",
  "/api/support",
];''',
    '''const SANCTION_ACCESS_ROUTES = [
  "/sanctions",
  "/support",
  "/terms",
  "/privacy",
  "/community-rules",
  "/safety",
  "/age-policy",
  "/cookies",
  "/auth",
  "/api/sanctions",
  "/api/support",
];''',
    "Policy access while sanctioned",
)

home = ROOT / "components/homepage/sepulchria-homepage.tsx"
replace_once(
    home,
    '''      <Link
  href="/community-rules"
  className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
>
  Community Rules
</Link>

      <Link
        href="/privacy"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        Privacy
      </Link>

      <Link
        href="/terms"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        Terms
      </Link>''',
    '''      <Link
        href="/community-rules"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        Community Rules
      </Link>

      <Link
        href="/safety"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        Safety
      </Link>

      <Link
        href="/age-policy"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        18+ Policy
      </Link>

      <Link
        href="/privacy"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        Privacy
      </Link>

      <Link
        href="/cookies"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        Cookies
      </Link>

      <Link
        href="/terms"
        className="transition hover:text-[rgb(var(--sep-colour-cdb487))]"
      >
        Terms
      </Link>''',
    "Homepage public policy links",
)

print("")
print("Public policy package patch complete.")
print("Run: npm run build")
