import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

export const metadata = {
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
