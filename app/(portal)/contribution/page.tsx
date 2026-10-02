import { redirect } from "next/navigation";

import { ContributionCheckout } from "@/components/contributions/contribution-checkout";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Support Sepulchria | Sepulchria",
  description:
    "Make a voluntary one-off contribution to support the continued development and running of Sepulchria.",
};

export default async function ContributionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="flex min-h-full w-full items-start justify-center p-3 sm:p-6 lg:p-8">
      <section className="w-full max-w-3xl overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))]/90 shadow-[0_18px_60px_rgba(var(--sep-rgb-0-0-0),0.32)]">
        <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-211a14))] px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-876a46))]">
            Sepulchria · Contribution
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e5cfa6))] sm:text-4xl">
            Support Sepulchria
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
            If you enjoy Sepulchria and would like to help support its continued development, hosting and running costs, you can make a voluntary one-off contribution here.
          </p>
        </header>

        <div className="px-5 py-6 sm:px-7">
          <div className="border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-xs leading-6 text-[rgb(var(--sep-colour-c9b08b))]">
            Contributions are completely separate from the Sepulchria Store. They do not purchase an item, unlock content, grant Remnants, provide gameplay advantages or create any other entitlement.
          </div>

          <ContributionCheckout />

          <div className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-5 text-[10px] leading-5 text-[rgb(var(--sep-colour-756957))]">
            Payments are processed securely through Stripe. This page creates one-off payments only and does not create a subscription or recurring charge.
          </div>
        </div>
      </section>
    </main>
  );
}
