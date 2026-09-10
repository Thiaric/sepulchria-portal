import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Shop = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
};

export default async function MarketPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("market_shops")
    .select("id, name, slug, description, image_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load the Market: ${error.message}`);
  }

  const shops = (data ?? []) as Shop[];

  return (
    <main className="p-5 sm:p-7 lg:p-9 market_page_main_main">
      <div className="mx-auto max-w-7xl market_page_div_container">
        <div className="flex flex-wrap items-end justify-between gap-4 market_page_div_container_2">
          <div className="market_page_div_market">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] market_page_p_market">
              Commerce
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] market_page_h1_market">
              Market
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] market_page_p_market_2">
              Browse the merchants and traders of Sepulchria. Each shop maintains
              its own catalogue, prices and stock.
            </p>
          </div>

          <Link
            href="/crafting"
            className="border border-[rgb(var(--sep-colour-a47b43))] bg-[rgb(var(--sep-colour-472d18))] px-4 py-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f3d7a5))] transition hover:border-[rgb(var(--sep-colour-d0a15c))] hover:bg-[rgb(var(--sep-colour-5c391d))]"
          >
            Open Crafting Workbench
          </Link>
        </div>

        {shops.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 market_page_div_container_3">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/market/${shop.slug}`}
                className="group overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] transition hover:border-[rgb(var(--sep-colour-927047))]"
              >
                <div className="relative aspect-[16/6] border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] market_page_div_container_4">
                  {shop.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shop.image_url}
                      alt=""
                      className="h-full w-full object-cover opacity-70 transition group-hover:opacity-85 market_page_img_image"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-serif text-3xl text-[rgb(var(--sep-colour-4e402f))] market_page_div_container_5">
                      ◇
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--sep-colour-100c09))] via-transparent to-transparent market_page_div_container_6" />
                </div>

                <div className="p-5 market_page_div_container_7">
                  <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dec79d))] group-hover:text-[rgb(var(--sep-colour-f0d8aa))] market_page_h2_heading">
                    {shop.name}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] market_page_p_text">
                    {shop.description || "A merchant of Sepulchria."}
                  </p>

                  <p className="mt-4 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a88658))] market_page_p_text_2">
                    Enter shop →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-10 text-center market_page_section_section">
            <p className="font-serif text-xl text-[rgb(var(--sep-colour-a9987e))] market_page_p_text_3">
              The Market has no open shops yet.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
