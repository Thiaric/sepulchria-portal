import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "support@sepulchria.com";

export const metadata = {
  title: "Optional Purchases | Sepulchria",
  description:
    "Information about optional digital purchases available inside the Sepulchria online play-by-chat roleplaying game.",
};

const purchaseTypes = [
  {
    title: "Portal Skins",
    price: "From £1.99",
    text: "Optional visual themes for the Sepulchria portal interface.",
  },
  {
    title: "Cosmetic Frames & Backgrounds",
    price: "From £2.99",
    text: "Optional cosmetic presentation for characters and selected interface elements.",
  },
  {
    title: "Location Music",
    price: "From £0.99",
    text: "Optional music unlocks for supported in-game locations.",
  },
  {
    title: "Friend List Access",
    price: "£10.00",
    text: "Unlocks the Friend List feature for the purchasing account.",
  },
  {
    title: "Private Locations",
    price: "£20.00",
    text: "Unlocks access to create and manage eligible private roleplay locations.",
  },
  {
    title: "Bundles",
    price: "Price shown before purchase",
    text: "Curated groups of Sepulchria digital features or cosmetics. The exact contents and total price are shown before checkout.",
  },
] as const;

export default function PurchasesPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />
      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))] purchases_page_main_main"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10 purchases_page_article_optional_digital_purchases">
          

          <p className="mt-1 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))] purchases_page_p_optional_digital_purchases">
            Sepulchria · Optional Purchases
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))] purchases_page_h1_optional_digital_purchases">
            Optional Digital Purchases
          </h1>

          <div className="mt-5 border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-c9b08b))] purchases_page_div_optional_digital_purchases">
            Sepulchria is an English-language online play-by-chat fantasy roleplaying game.
            These are optional digital extras for players of the game; Sepulchria is not an
            online retail marketplace.
          </div>

          <div className="mt-8 space-y-4 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))] purchases_page_div_optional_digital_purchases_2">
            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5 purchases_page_section_sepulchria">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))] purchases_page_h2_sepulchria">
                What Sepulchria is
              </h2>
              <div className="mt-2 space-y-3 purchases_page_div_sepulchria">
                <p className="purchases_page_p_sepulchria">
                  Players create characters and take part in a persistent shared fantasy world
                  through written roleplay, location chats, private communication, events and
                  other game systems.
                </p>
                <p className="purchases_page_p_sepulchria_2">
                  An account is required to enter the game and to access the in-game Store.
                  Purchases are attached to the relevant Sepulchria account or character and are
                  delivered digitally.
                </p>
              </div>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5 purchases_page_section_optional_digital_purchases">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))] purchases_page_h2_optional_digital_purchases">
                Current purchase types and pricing
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 purchases_page_div_optional_digital_purchases_3">
                {purchaseTypes.map((item) => (
                  <article
                    key={item.title}
                    className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 purchases_page_article_article"
                  >
                    <div className="flex items-start justify-between gap-4 purchases_page_div_container">
                      <h3 className="font-serif text-base text-[rgb(var(--sep-colour-d7bd91))] purchases_page_h3_heading">
                        {item.title}
                      </h3>
                      <span className="shrink-0 text-[11px] font-semibold text-[rgb(var(--sep-colour-d2ae78))] purchases_page_span_text">
                        {item.price}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-9f907b))] purchases_page_p_text">
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-[rgb(var(--sep-colour-8f8270))] purchases_page_p_optional_digital_purchases_2">
                The in-game Store shows the exact product, contents, currency and final price
                before checkout. Promotional discounts may temporarily reduce a displayed price.
              </p>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5 purchases_page_section_payments_delivery">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))] purchases_page_h2_payments_delivery">
                Payments and delivery
              </h2>
              <div className="mt-2 space-y-3 purchases_page_div_payments_delivery">
                <p className="purchases_page_p_payments_delivery">
                  Real-money purchases are processed through Stripe Managed Payments. Stripe acts
                  as Merchant of Record for these transactions and handles checkout, payment
                  processing and applicable transaction taxes.
                </p>
                <p className="purchases_page_p_payments_delivery_2">
                  Successful purchases are fulfilled digitally to the eligible Sepulchria account
                  or character. Purchase history is available to the player inside the game.
                </p>
              </div>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5 purchases_page_section_support_refunds">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))] purchases_page_h2_support_refunds">
                Support and refunds
              </h2>
              <div className="mt-2 space-y-3 purchases_page_div_support_refunds">
                <p className="purchases_page_p_support_refunds">
                  For purchase questions, contact{" "}
                  <a
                    className="text-[rgb(var(--sep-colour-d2ae78))] underline purchases_page_a_support_refunds"
                    href={`mailto:${contactEmail}`}
                  >
                    {contactEmail}
                  </a>
                  .
                </p>
                <p className="purchases_page_p_support_refunds_2">
                  Refund information is available in our{" "}
                  <Link
                    className="text-[rgb(var(--sep-colour-d2ae78))] underline"
                    href="/refund-policy"
                  >
                    Refund Policy
                  </Link>
                  .
                </p>
              </div>
            </section>
          </div>

          
        </article>
      </main>
    </>
  );
}
