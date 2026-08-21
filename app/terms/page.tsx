import Link from "next/link";

import {
  TERMS_VERSION,
} from "@/lib/legal/versions";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]">
      <article className="mx-auto max-w-3xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10">
        <Link
          href="/auth/sign-up"
          className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-b08b59))] hover:text-[rgb(var(--sep-colour-e2bf88))]"
        >
          ← Return to registration
        </Link>

        <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">
          Sepulchria
        </p>

        <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">
          Terms of Service
        </h1>

        <p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))]">
          Development version: {TERMS_VERSION}
        </p>

        <div className="mt-8 border border-[rgb(var(--sep-colour-7a5b37))]/45 bg-[rgb(var(--sep-colour-21160f))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-c7aa7c))]">
          Development notice: this page is a functional placeholder for the
          registration-consent system. Replace it with your final reviewed
          Terms of Service before public launch.
        </div>

        <div className="mt-8 space-y-7 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
          <section>
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
              1. Use of Sepulchria
            </h2>
            <p className="mt-2">
              Sepulchria is an online roleplaying platform. Users are responsible
              for activity performed through their accounts and for following
              the published game and community rules.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
              2. Accounts and characters
            </h2>
            <p className="mt-2">
              Account information must be kept secure. Character approval,
              moderation, access to game areas and participation in community
              features may be subject to the rules and staff processes published
              on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
              3. User content
            </h2>
            <p className="mt-2">
              Users remain responsible for content they submit, including roleplay
              posts, forum posts, messages and uploaded character material.
              Content may be moderated where necessary to operate the service or
              enforce its rules.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
              4. Conduct and moderation
            </h2>
            <p className="mt-2">
              Harassment, abuse, unlawful content, attempts to compromise the
              service and deliberate disruption may result in content removal,
              restrictions or account action.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
              5. Changes
            </h2>
            <p className="mt-2">
              These terms may be updated as Sepulchria develops. Where a material
              change requires renewed acceptance, the platform may ask users to
              accept a newer version before continuing.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
