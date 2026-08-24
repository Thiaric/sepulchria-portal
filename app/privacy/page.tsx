import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

export const metadata = {
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
