import Link from "next/link";

import {
  PRIVACY_VERSION,
} from "@/lib/legal/versions";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#090706] px-5 py-12 text-[#d8cbb5]">
      <article className="mx-auto max-w-3xl border border-[#60482e]/55 bg-[#110d0a] p-6 shadow-[0_24px_80px_rgba(0,0,0,.45)] sm:p-10">
        <Link
          href="/auth/sign-up"
          className="text-[10px] uppercase tracking-[0.2em] text-[#b08b59] hover:text-[#e2bf88]"
        >
          ← Return to registration
        </Link>

        <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[#876a46]">
          Sepulchria
        </p>

        <h1 className="mt-3 font-serif text-4xl text-[#e5cfa6]">
          Privacy Policy
        </h1>

        <p className="mt-3 text-xs text-[#7f7466]">
          Development version: {PRIVACY_VERSION}
        </p>

        <div className="mt-8 border border-[#7a5b37]/45 bg-[#21160f] p-4 text-sm leading-6 text-[#c7aa7c]">
          Development notice: this page is a functional placeholder for the
          registration-consent system. Replace it with your final reviewed
          Privacy Policy before public launch.
        </div>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[#aa9c88]">
          <section>
            <h2 className="font-serif text-xl text-[#d7bd91]">
              1. Information used by the service
            </h2>
            <p className="mt-2">
              Sepulchria uses account information such as email address,
              authentication data, character information and content submitted
              through game, forum and messaging features in order to provide the
              service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#d7bd91]">
              2. Authentication and hosting
            </h2>
            <p className="mt-2">
              The service uses third-party infrastructure for authentication,
              hosting and database functionality. The final policy should identify
              the providers in use at launch and explain the relevant processing.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#d7bd91]">
              3. Community content
            </h2>
            <p className="mt-2">
              Information intentionally posted to public character profiles,
              forums or other public areas may be visible to other users. Direct
              and administrative features may have different visibility rules.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#d7bd91]">
              4. Retention and account management
            </h2>
            <p className="mt-2">
              The final policy should state how long account and gameplay data is
              retained, how deletion requests are handled and which information
              may need to be retained for security or legal reasons.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#d7bd91]">
              5. Contact and rights
            </h2>
            <p className="mt-2">
              Before public launch, add the appropriate operator contact details
              and the procedures users should follow to exercise applicable data
              protection rights.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
