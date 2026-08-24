import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

export const metadata = {
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
