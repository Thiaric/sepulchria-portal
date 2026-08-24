import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

export const metadata = {
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
            <Section title="3. Interface and preference storage"><p>The portal uses browser local storage to remember interface choices such as portal appearance, collapsed sidebars, sound preference, recent editor colours and spelling-dictionary choices. Under the current UK PECR appearance/functionality exception, this type of storage may be used without prior consent where the legal conditions are met, but you must be given a simple way to object.</p><p>Sepulchria provides that control through the Cookie &amp; Storage Settings panel. Choosing “Necessary only” disables and removes the listed interface-preference values from this browser.</p></Section>
            <Section title="4. Analytics and advertising"><p>The current Sepulchria application does not intentionally deploy advertising cookies or a third-party behavioural advertising system. The current application code also does not include a dedicated third-party analytics package.</p><p>If non-essential analytics, advertising or other optional tracking technologies are introduced, we will update this Notice and implement an appropriate consent choice before using them where required.</p></Section>
            <Section title="5. Managing browser storage"><p>You can use Sepulchria's Cookie &amp; Storage Settings control to disable interface-preference storage while leaving strictly necessary storage available. You can also use your browser controls to inspect, block or delete cookies and site data. Blocking strictly necessary authentication or security storage may prevent login or other requested features from working.</p></Section>
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
