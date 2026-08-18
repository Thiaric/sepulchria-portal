import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
};

type CategoryRelation = { name: string } | { name: string }[] | null;
type SubcategoryRelation = { name: string } | { name: string }[] | null;

type Listing = {
  id: string;
  buy_price: number;
  sell_price: number | null;
  stock_mode: "finite" | "unlimited";
  stock_quantity: number | null;
  item: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string | null;
    quality: string;
    is_active: boolean;
    is_quest_item: boolean;
    is_usable: boolean;
    category: CategoryRelation;
    subcategory: SubcategoryRelation;
  } | {
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string | null;
    quality: string;
    is_active: boolean;
    is_quest_item: boolean;
    is_usable: boolean;
    category: CategoryRelation;
    subcategory: SubcategoryRelation;
  }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function MarketShopPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: shop, error: shopError } = await supabase
    .from("market_shops")
    .select("id, name, slug, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (shopError) {
    throw new Error(shopError.message);
  }

  if (!shop) {
    notFound();
  }

  const { data, error } = await supabase
    .from("market_listings")
    .select(`
      id,
      buy_price,
      sell_price,
      stock_mode,
      stock_quantity,
      item:items(
        id,
        name,
        slug,
        description,
        image_url,
        quality,
        is_active,
        is_quest_item,
        is_usable,
        category:item_categories(name),
        subcategory:item_subcategories(name)
      )
    `)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Unable to load shop catalogue: ${error.message}`);
  }

  const listings = ((data ?? []) as unknown as Listing[])
    .filter((listing) => one(listing.item)?.is_active === true);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/market"
          className="text-[8px] uppercase tracking-[0.18em] text-[#a88658] hover:text-[#dfbd84]"
        >
          ← Back to Market
        </Link>

        <section className="mt-4 overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          {shop.image_url ? (
            <div className="relative h-44 border-b border-[#60482e]/35">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shop.image_url}
                alt=""
                className="h-full w-full object-cover opacity-65"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-[#15100d]/30 to-transparent" />
            </div>
          ) : null}

          <div className="p-5 sm:p-7">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
              Market shop
            </p>
            <h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              {shop.name}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#a99b89]">
              {shop.description}
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {listings.map((listing) => {
            const item = one(listing.item);
            if (!item) return null;

            const category = one(item.category);
            const subcategory = one(item.subcategory);
            const outOfStock =
              listing.stock_mode === "finite" &&
              Number(listing.stock_quantity ?? 0) <= 0;

            return (
              <article
                key={listing.id}
                className="flex gap-4 border border-[#60482e]/40 bg-[#15100d] p-4"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden border border-[#59432c]/40 bg-[#100c09]">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#705b3e]">
                      ◇
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-serif text-xl text-[#dcc49a]">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-[7px] uppercase tracking-[0.13em] text-[#756958]">
                        {[category?.name, subcategory?.name, item.quality]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-[#e1bd79]">
                      {Number(listing.buy_price).toLocaleString("en-GB")} R
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-3 text-[10px] leading-5 text-[#958775]">
                    {item.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={
                        outOfStock
                          ? "border border-red-900/45 bg-red-950/10 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-red-400"
                          : "border border-[#59432c]/40 bg-[#100c09] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#947e61]"
                      }
                    >
                      {listing.stock_mode === "unlimited"
                        ? "Unlimited stock"
                        : outOfStock
                          ? "Out of stock"
                          : `${listing.stock_quantity} in stock`}
                    </span>

                    {listing.sell_price !== null ? (
                      <span className="border border-[#59432c]/40 bg-[#100c09] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#806f5b]">
                        Buyback {Number(listing.sell_price).toLocaleString("en-GB")} R
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-[7px] uppercase tracking-[0.12em] text-[#665b4d]">
                    Purchasing unlocks in Economy 3
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {!listings.length ? (
          <section className="mt-6 border border-[#60482e]/40 bg-[#15100d] p-8 text-center text-sm text-[#8f8271]">
            This shop has no available catalogue entries.
          </section>
        ) : null}
      </div>
    </main>
  );
}
