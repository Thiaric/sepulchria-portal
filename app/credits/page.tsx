import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

export const metadata = {
  title: "Credits | Sepulchria",
  description:
    "Credits, creative contributions and asset acknowledgements for Sepulchria.",
};

const contactEmail = "support@sepulchria.com";

export default function CreditsPage() {
  return (
    <>
      <EmbeddedPortalSkinBridge />

      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-4 py-10 text-[rgb(var(--sep-colour-e8dcc4))] sm:px-6 lg:px-8"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10">
          <p className="text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))]">
            Sepulchria · Credits
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))] sm:text-5xl">
            The People Behind Sepulchria
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b87))]">
            Sepulchria is an independent English-language play-by-chat roleplaying project built through writing, worldbuilding, design, development, experimentation and collaboration.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <section className="border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-18110d))] p-5">
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-9b7b53))]">
                Founder, Creator & Lead Developer
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc89e))]">
                Riccardo
              </h2>

              <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-b9aa94))]">
                Riccardo conceived Sepulchria as an English-language play-by-chat RPG and developed its original setting, lore, game systems and overall structure. He has worked extensively on the portal and its code, gameplay mechanics, written content, visual direction, administration tools and the continuing development of the project.
              </p>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-15100d))] p-5">
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8f7657))]">
                Founder, Creator & Creative Contributor
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-d7bd91))]">
                Manuel
              </h2>

              <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
                Manuel played a key role in shaping and expanding the original concept of Sepulchria, contributing significantly to its creative direction through worldbuilding ideas, concept development, collaborative design and the creation of content that helped define and enrich the wider setting.
              </p>
            </section>
          </div>

          <div className="mt-5 space-y-4">
            <CreditsSection title="Artificial Intelligence">
              <p>
                Some elements of Sepulchria have been created or assisted using artificial-intelligence tools. This may include images, visual assets, concepts, written material, development assistance and other supporting content.
              </p>
              <p>
                AI-generated or AI-assisted material is reviewed, adapted and incorporated into the wider project as appropriate.
              </p>
            </CreditsSection>

            <CreditsSection title="Third-Party Images & Material">
              <p>
                Some visual material and other assets used throughout Sepulchria may originate from third-party sources available online and are used where they are believed to be freely available, licensed for reuse, in the public domain, or otherwise suitable for use within the project.
              </p>
              <p>
                Sepulchria does not intentionally claim ownership of third-party work.
              </p>
              <p>
                If you are the original creator or rights holder of material appearing on Sepulchria and believe it has been used incorrectly, please contact{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-[rgb(var(--sep-colour-d2ae78))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4"
                >
                  {contactEmail}
                </a>
                . The material will be reviewed and, where appropriate, removed or replaced upon request.
              </p>
            </CreditsSection>

            <CreditsSection title="Ownership">
              <p>
                Unless otherwise stated, the original setting, lore, characters, terminology, written material, game systems, website content and other original elements created specifically for Sepulchria belong to their respective creators and contributors.
              </p>
              <p>
                Third-party trademarks, copyrighted works and other intellectual property remain the property of their respective owners.
              </p>
            </CreditsSection>
          </div>
        </article>
      </main>
    </>
  );
}

function CreditsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
        {title}
      </h2>

      <div className="mt-2 space-y-3 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
        {children}
      </div>
    </section>
  );
}
