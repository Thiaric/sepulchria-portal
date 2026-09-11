import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "support@sepulchria.com";

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
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))] refund_policy_page_main_main"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10 refund_policy_page_article_refund_policy">
          

          <p className="mt-1 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))] refund_policy_page_p_refund_policy">
            Sepulchria · Purchases
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))] refund_policy_page_h1_refund_policy">
            Refund Policy
          </h1>

          <p className="mt-3 text-xs text-[rgb(var(--sep-colour-7f7466))] refund_policy_page_p_refund_policy_2">
            Effective: 7 September 2026
          </p>

          <div className="mt-5 border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-c9b08b))] refund_policy_page_div_refund_policy">
            This policy applies to optional real-money digital purchases made for Sepulchria.
            Purchases made only with in-game Remnants are not real-money transactions and are not
            covered by this refund process.
          </div>

          <div className="mt-8 space-y-4 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))] refund_policy_page_div_refund_policy_2">
            <Section title="1. Payment processor and Merchant of Record">
              <p className="refund_policy_page_p_refund_policy_3">
                Stripe Managed Payments processes Sepulchria real-money purchases, with Stripe
                acting as Merchant of Record. Approved refunds are returned through Stripe to the
                payment method used for the purchase.
              </p>
            </Section>

            <Section title="2. Requesting a refund">
              <p className="refund_policy_page_p_refund_policy_4">
                A refund request for an eligible real-money purchase may be submitted within
                14 days of purchase by contacting{" "}
                <a
                  className="text-[rgb(var(--sep-colour-d2ae78))] underline refund_policy_page_a_refund_policy"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
                . Include enough information to identify the purchase, such as the order number
                and the account email used for the transaction.
              </p>
            </Section>

            <Section title="3. Review of requests">
              <p className="refund_policy_page_p_refund_policy_5">
                Refund requests are reviewed in accordance with applicable consumer rights,
                Stripe&apos;s applicable Managed Payments and refund rules, and the circumstances of the purchase.
                Submission of a request does not remove any mandatory rights you may have under
                applicable law.
              </p>
            </Section>

            <Section title="4. Effect of a refund">
              <p className="refund_policy_page_p_refund_policy_6">
                When a purchase is refunded, access to the corresponding paid digital entitlement
                may be revoked. Where the same entitlement remains valid because it was separately
                obtained through another eligible purchase or grant, that separate entitlement is
                unaffected.
              </p>
            </Section>

            <Section title="5. Remnants purchases">
              <p className="refund_policy_page_p_refund_policy_7">
                Purchases made exclusively with Remnants, Sepulchria&apos;s in-game currency, are
                not cash purchases and are not refundable for money.
              </p>
            </Section>

            <Section title="6. Consumer rights">
              <p className="refund_policy_page_p_refund_policy_8">
                Nothing in this policy limits rights that cannot lawfully be excluded or restricted.
                Where applicable law gives you stronger rights, those rights take priority.
              </p>
            </Section>

            <Section title="7. Contact">
              <p className="refund_policy_page_p_refund_policy_9">
                Questions about a Sepulchria purchase or refund request can be sent to{" "}
                <a
                  className="text-[rgb(var(--sep-colour-d2ae78))] underline refund_policy_page_a_refund_policy_2"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
                .
              </p>
            </Section>
          </div>

          
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
    <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5 refund_policy_page_section_section">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))] refund_policy_page_h2_heading">
        {title}
      </h2>
      <div className="mt-2 space-y-3 refund_policy_page_div_container">{children}</div>
    </section>
  );
}
