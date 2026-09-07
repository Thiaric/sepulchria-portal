import Link from "next/link";
import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

const contactEmail = "sepulchriarpg@gmail.com";

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
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10">
          

          <p className="mt-8 text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">
            Sepulchria · Optional Purchases
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))]">
            Optional Digital Purchases
          </h1>

          <div className="mt-5 border-l-2 border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-18110d))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-c9b08b))]">
            Sepulchria is an English-language online play-by-chat fantasy roleplaying game.
            These are optional digital extras for players of the game; Sepulchria is not an
            online retail marketplace.
          </div>

          <div className="mt-8 space-y-4 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                What Sepulchria is
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  Players create characters and take part in a persistent shared fantasy world
                  through written roleplay, location chats, private communication, events and
                  other game systems.
                </p>
                <p>
                  An account is required to enter the game and to access the in-game Store.
                  Purchases are attached to the relevant Sepulchria account or character and are
                  delivered digitally.
                </p>
              </div>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                Current purchase types and pricing
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {purchaseTypes.map((item) => (
                  <article
                    key={item.title}
                    className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-serif text-base text-[rgb(var(--sep-colour-d7bd91))]">
                        {item.title}
                      </h3>
                      <span className="shrink-0 text-[11px] font-semibold text-[rgb(var(--sep-colour-d2ae78))]">
                        {item.price}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-9f907b))]">
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-[rgb(var(--sep-colour-8f8270))]">
                The in-game Store shows the exact product, contents, currency and final price
                before checkout. Promotional discounts may temporarily reduce a displayed price.
              </p>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                Payments and delivery
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  Real-money purchases are processed through Paddle, which acts as Merchant of
                  Record for Paddle-processed transactions. Paddle handles checkout and payment
                  processing.
                </p>
                <p>
                  Successful purchases are fulfilled digitally to the eligible Sepulchria account
                  or character. Purchase history is available to the player inside the game.
                </p>
              </div>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
                Support and refunds
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  For purchase questions, contact{" "}
                  <a
                    className="text-[rgb(var(--sep-colour-d2ae78))] underline"
                    href={`mailto:${contactEmail}`}
                  >
                    {contactEmail}
                  </a>
                  .
                </p>
                <p>
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
