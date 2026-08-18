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
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
          Commerce
        </p>

        <h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">
          Market
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
          Browse the merchants and traders of Sepulchria. Each shop maintains
          its own catalogue, prices and stock.
        </p>

        {shops.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/market/${shop.slug}`}
                className="group overflow-hidden border border-[#60482e]/45 bg-[#15100d] transition hover:border-[#927047]"
              >
                <div className="relative aspect-[16/6] border-b border-[#60482e]/35 bg-[#100c09]">
                  {shop.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shop.image_url}
                      alt=""
                      className="h-full w-full object-cover opacity-70 transition group-hover:opacity-85"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-serif text-3xl text-[#4e402f]">
                      ◇
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#100c09] via-transparent to-transparent" />
                </div>

                <div className="p-5">
                  <h2 className="font-serif text-2xl text-[#dec79d] group-hover:text-[#f0d8aa]">
                    {shop.name}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-[#8f8271]">
                    {shop.description || "A merchant of Sepulchria."}
                  </p>

                  <p className="mt-4 text-[8px] uppercase tracking-[0.18em] text-[#a88658]">
                    Enter shop →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="mt-8 border border-[#60482e]/40 bg-[#15100d] p-10 text-center">
            <p className="font-serif text-xl text-[#a9987e]">
              The Market has no open shops yet.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
