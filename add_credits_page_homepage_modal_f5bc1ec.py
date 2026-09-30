from pathlib import Path
import sys

homepage = Path("components/homepage/sepulchria-homepage.tsx")
proxy = Path("lib/supabase/proxy.ts")
credits = Path("app/credits/page.tsx")

for path in (homepage, proxy):
    if not path.exists():
        print(f"ERROR: Missing {path}. Run this from the sepulchria-portal repository root.")
        sys.exit(1)

homepage_src = homepage.read_text(encoding="utf-8")
proxy_src = proxy.read_text(encoding="utf-8")

old_credits_link = '''              <Link href="#">
                Credits
              </Link>
'''

new_credits_link = '''              <Link
                href="/credits"
                onClick={(event) => {
                  event.preventDefault();
                  setPublicModal({
                    title: "Credits",
                    href: "/credits",
                  });
                }}
              >
                Credits
              </Link>
'''

if homepage_src.count(old_credits_link) != 1:
    print(
        "ERROR: Expected exactly one homepage Credits placeholder link, "
        f"found {homepage_src.count(old_credits_link)}."
    )
    print("No files were changed.")
    sys.exit(1)

homepage_new = homepage_src.replace(
    old_credits_link,
    new_credits_link,
    1,
)

old_proxy_anchor = '''  "/refund-policy",
  "/auth",
'''

new_proxy_anchor = '''  "/refund-policy",
  "/credits",
  "/auth",
'''

if proxy_src.count(old_proxy_anchor) != 1:
    print(
        "ERROR: Expected exactly one public-routes insertion point, "
        f"found {proxy_src.count(old_proxy_anchor)}."
    )
    print("No files were changed.")
    sys.exit(1)

proxy_new = proxy_src.replace(
    old_proxy_anchor,
    new_proxy_anchor,
    1,
)

credits_content = '''import { EmbeddedPortalSkinBridge } from "@/components/portal/embedded-portal-skin-bridge";

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
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-4 py-10 text-[rgb(var(--sep-colour-e8dcc4))] sm:px-6 lg:px-8 credits_page_main_main"
      >
        <article className="mx-auto max-w-4xl border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))] p-6 shadow-[0_24px_80px_rgba(var(--sep-rgb-0-0-0),.45)] sm:p-10 credits_page_article_credits">
          <p className="text-[9px] uppercase tracking-[0.35em] text-[rgb(var(--sep-colour-876a46))] credits_page_p_eyebrow">
            Sepulchria · Credits
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[rgb(var(--sep-colour-e5cfa6))] sm:text-5xl credits_page_h1_credits">
            The People Behind Sepulchria
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b87))] credits_page_p_intro">
            Sepulchria is an independent English-language play-by-chat roleplaying project built through writing, worldbuilding, design, development, experimentation and collaboration.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 credits_page_div_creators">
            <section className="border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-18110d))] p-5 credits_page_section_riccardo">
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-9b7b53))] credits_page_p_role">
                Creator & Lead Developer
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc89e))] credits_page_h2_riccardo">
                Riccardo
              </h2>

              <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-b9aa94))] credits_page_p_riccardo">
                Riccardo conceived Sepulchria as an English-language play-by-chat RPG and developed its original setting, lore, game systems and overall structure. He has worked extensively on the portal and its code, gameplay mechanics, written content, visual direction, administration tools and the continuing development of the project.
              </p>
            </section>

            <section className="border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-15100d))] p-5 credits_page_section_manuel">
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8f7657))] credits_page_p_role_2">
                Creative Contributor
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-d7bd91))] credits_page_h2_manuel">
                Manuel
              </h2>

              <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))] credits_page_p_manuel">
                Manuel helped expand the original concept through discussion, ideas and creative input, and has contributed to the creation and development of content and the wider world of Sepulchria.
              </p>
            </section>
          </div>

          <div className="mt-5 space-y-4 credits_page_div_sections">
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
    <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/10 p-4 sm:p-5 credits_page_section_section">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))] credits_page_h2_section">
        {title}
      </h2>

      <div className="mt-2 space-y-3 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))] credits_page_div_section_content">
        {children}
      </div>
    </section>
  );
}
'''

if credits.exists():
    print("ERROR: app/credits/page.tsx already exists. No files were changed.")
    sys.exit(1)

homepage_backup = homepage.with_suffix(homepage.suffix + ".before-credits-page")
proxy_backup = proxy.with_suffix(proxy.suffix + ".before-credits-page")

if not homepage_backup.exists():
    homepage_backup.write_text(homepage_src, encoding="utf-8")

if not proxy_backup.exists():
    proxy_backup.write_text(proxy_src, encoding="utf-8")

homepage.write_text(homepage_new, encoding="utf-8")
proxy.write_text(proxy_new, encoding="utf-8")

credits.parent.mkdir(parents=True, exist_ok=True)
credits.write_text(credits_content, encoding="utf-8")

print("Credits page added and homepage Credits link wired to the existing public modal.")
print()
print("Changed:")
print("  components/homepage/sepulchria-homepage.tsx")
print("  lib/supabase/proxy.ts")
print("Created:")
print("  app/credits/page.tsx")
print()
print("Run:")
print("  npm run build")
