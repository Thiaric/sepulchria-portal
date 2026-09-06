import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  product_type: "single" | "bundle";
  category:
    | "skin"
    | "cosmetic"
    | "music"
    | "friend_list"
    | "private_location"
    | "bundle";
  is_featured: boolean;
  sort_order: number;
};

type StorePrice = {
  id: string;
  product_id: string;
  currency: string | null;
  money_amount_minor: number | null;
  remnants_amount: number | null;
};

type StoreGrant = {
  id: string;
  product_id: string;
  grant_type: "portal_skin" | "cosmetic" | "music" | "feature";
  portal_skin_id: string | null;
  cosmetic_item_id: string | null;
  music_track_id: string | null;
  feature_key: "friend_list" | "private_chat" | null;
};

type Skin = {
  id: string;
  name: string;
};

type Cosmetic = {
  id: string;
  name: string;
  category: string;
};

type MusicTrack = {
  id: string;
  name: string;
};

const CATEGORY_LABELS: Record<StoreProduct["category"], string> = {
  skin: "Skins",
  cosmetic: "Cosmetics",
  music: "Music",
  friend_list: "Friend List",
  private_location: "Private Locations",
  bundle: "Bundles",
};

function moneyLabel(
  amountMinor: number | null,
  currency: string | null,
) {
  if (amountMinor === null || !currency) {
    return null;
  }

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export default async function StorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const [
    productsResult,
    pricesResult,
    grantsResult,
    skinsResult,
    cosmeticsResult,
    musicResult,
    skinEntitlementsResult,
    cosmeticEntitlementsResult,
    musicEntitlementsResult,
    featureEntitlementsResult,
  ] = await Promise.all([
    supabase
      .from("store_products")
      .select(
        "id, slug, name, description, image_url, product_type, category, is_featured, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("store_product_prices")
      .select(
        "id, product_id, currency, money_amount_minor, remnants_amount",
      )
      .eq("is_active", true),

    supabase
      .from("store_product_grants")
      .select(
        "id, product_id, grant_type, portal_skin_id, cosmetic_item_id, music_track_id, feature_key",
      ),

    supabase
      .from("portal_skins")
      .select("id, name"),

    supabase
      .from("cosmetic_items")
      .select("id, name, category"),

    supabase
      .from("music_tracks")
      .select("id, name")
      .eq("is_active", true)
      .eq("is_personal_selectable", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("user_portal_skin_entitlements")
      .select("skin_id")
      .eq("user_id", user.id)
      .eq("enabled", true),

    character
      ? supabase
          .from("character_cosmetic_entitlements")
          .select("cosmetic_item_id")
          .eq("character_id", character.id)
          .eq("enabled", true)
      : Promise.resolve({ data: [], error: null }),

    character
      ? supabase
          .from("character_music_entitlements")
          .select("music_track_id")
          .eq("character_id", character.id)
          .eq("enabled", true)
      : Promise.resolve({ data: [], error: null }),

    character
      ? supabase
          .from("character_feature_entitlements")
          .select("feature_key")
          .eq("character_id", character.id)
          .eq("enabled", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [
    productsResult,
    pricesResult,
    grantsResult,
    skinsResult,
    cosmeticsResult,
    musicResult,
    skinEntitlementsResult,
    cosmeticEntitlementsResult,
    musicEntitlementsResult,
    featureEntitlementsResult,
  ]) {
    if (result.error) {
      throw new Error(
        `Unable to load the Sepulchria Store: ${result.error.message}`,
      );
    }
  }

  const products =
    (productsResult.data ?? []) as StoreProduct[];

  const prices =
    (pricesResult.data ?? []) as StorePrice[];

  const grants =
    (grantsResult.data ?? []) as StoreGrant[];

  const skins =
    (skinsResult.data ?? []) as Skin[];

  const cosmetics =
    (cosmeticsResult.data ?? []) as Cosmetic[];

  const musicTracks =
    (musicResult.data ?? []) as MusicTrack[];

  const ownedSkinIds = new Set(
    (skinEntitlementsResult.data ?? []).map(
      (entry) => entry.skin_id,
    ),
  );

  const ownedCosmeticIds = new Set(
    (cosmeticEntitlementsResult.data ?? []).map(
      (entry) => entry.cosmetic_item_id,
    ),
  );

  const ownedMusicIds = new Set(
    (musicEntitlementsResult.data ?? []).map(
      (entry) => entry.music_track_id,
    ),
  );

  const ownedFeatures = new Set(
    (featureEntitlementsResult.data ?? []).map(
      (entry) => entry.feature_key,
    ),
  );

  const skinNames = new Map(
    skins.map((skin) => [skin.id, skin.name]),
  );

  const cosmeticNames = new Map(
    cosmetics.map((item) => [item.id, item.name]),
  );

  const musicNames = new Map(
    musicTracks.map((track) => [track.id, track.name]),
  );

  const productOwned = (productId: string) => {
    const productGrants = grants.filter(
      (grant) => grant.product_id === productId,
    );

    if (productGrants.length === 0) {
      return false;
    }

    return productGrants.every((grant) => {
      if (
        grant.grant_type === "portal_skin" &&
        grant.portal_skin_id
      ) {
        return ownedSkinIds.has(grant.portal_skin_id);
      }

      if (
        grant.grant_type === "cosmetic" &&
        grant.cosmetic_item_id
      ) {
        return ownedCosmeticIds.has(grant.cosmetic_item_id);
      }

      if (
        grant.grant_type === "music" &&
        grant.music_track_id
      ) {
        return ownedMusicIds.has(grant.music_track_id);
      }

      if (
        grant.grant_type === "feature" &&
        grant.feature_key
      ) {
        return ownedFeatures.has(grant.feature_key);
      }

      return false;
    });
  };

  const featured = products.filter(
    (product) => product.is_featured,
  );

  return (
    <main
      data-store-page
      className="flex h-full min-h-0 w-full flex-col p-4 sm:p-5"
    >
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[rgb(var(--sep-colour-58432d))]/45 bg-[rgb(var(--sep-colour-15100d))]/82 shadow-[0_10px_26px_rgba(var(--sep-rgb-0-0-0),0.2)]">
        <header className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-211a14))] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-8c704b))]">
                Premium
              </p>

              <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
                Sepulchria Store
              </h1>

              <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                Unlock skins, cosmetics, Friend List access, Private Locations
                and curated bundles using real money or Remnants.
              </p>
            </div>

            <div className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2">
              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Discount code
              </p>
              <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a99b89))]">
                Applied during checkout
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {featured.length > 0 ? (
            <section>
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">
                Featured
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {featured.map((product) => (
                  <StoreProductCard
                    key={`featured-${product.id}`}
                    product={product}
                    prices={prices.filter(
                      (price) =>
                        price.product_id === product.id,
                    )}
                    grants={grants.filter(
                      (grant) =>
                        grant.product_id === product.id,
                    )}
                    owned={productOwned(product.id)}
                    skinNames={skinNames}
                    cosmeticNames={cosmeticNames}
                    musicNames={musicNames}
                    featured
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className={featured.length ? "mt-6" : ""}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">
                  Catalogue
                </p>
                <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
                  Available in the Store
                </h2>
              </div>

              <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                {products.length} product{products.length === 1 ? "" : "s"}
              </span>
            </div>

            {products.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {products.map((product) => (
                  <StoreProductCard
                    key={product.id}
                    product={product}
                    prices={prices.filter(
                      (price) =>
                        price.product_id === product.id,
                    )}
                    grants={grants.filter(
                      (grant) =>
                        grant.product_id === product.id,
                    )}
                    owned={productOwned(product.id)}
                    skinNames={skinNames}
                    cosmeticNames={cosmeticNames}
                    musicNames={musicNames}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 border border-dashed border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-8 text-center">
                <p className="font-serif text-lg text-[rgb(var(--sep-colour-a9987e))]">
                  The Store has no active products yet.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function StoreProductCard({
  product,
  prices,
  grants,
  owned,
  skinNames,
  cosmeticNames,
  musicNames,
  featured = false,
}: {
  product: StoreProduct;
  prices: StorePrice[];
  grants: StoreGrant[];
  owned: boolean;
  skinNames: Map<string, string>;
  cosmeticNames: Map<string, string>;
  musicNames: Map<string, string>;
  featured?: boolean;
}) {
  const grantLabels = grants.map((grant) => {
    if (
      grant.grant_type === "portal_skin" &&
      grant.portal_skin_id
    ) {
      return (
        skinNames.get(grant.portal_skin_id) ??
        "Portal Skin"
      );
    }

    if (
      grant.grant_type === "cosmetic" &&
      grant.cosmetic_item_id
    ) {
      return (
        cosmeticNames.get(grant.cosmetic_item_id) ??
        "Cosmetic"
      );
    }

    if (
      grant.grant_type === "music" &&
      grant.music_track_id
    ) {
      return musicNames.get(grant.music_track_id) ?? "Music";
    }

    if (
      grant.grant_type === "feature"
    ) {
      return grant.feature_key === "private_chat"
        ? "Private Location"
        : "Friend List";
    }

    return "Premium unlock";
  });

  const moneyPrices = prices
    .map((price) => ({
      id: price.id,
      label: moneyLabel(
        price.money_amount_minor,
        price.currency,
      ),
    }))
    .filter(
      (price): price is { id: string; label: string } =>
        Boolean(price.label),
    );

  const remnantPrices = prices
    .filter(
      (price) => price.remnants_amount !== null,
    )
    .map((price) => ({
      id: price.id,
      amount: price.remnants_amount as number,
    }));

  return (
    <article
      className={[
        "group flex min-w-0 flex-col overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]",
        featured
          ? "border-[rgb(var(--sep-colour-987344))]/70"
          : "border-[rgb(var(--sep-colour-60482e))]/40",
      ].join(" ")}
    >
      <div className="relative aspect-[16/7] shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-0d0b0a))]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            className="h-full w-full object-cover opacity-75 transition group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-serif text-4xl text-[rgb(var(--sep-colour-4e402f))]">
              ◇
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--sep-colour-100c09))] via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="border border-[rgb(var(--sep-colour-80613b))]/60 bg-[rgb(var(--sep-colour-100c09))]/90 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c6a979))]">
            {CATEGORY_LABELS[product.category]}
          </span>

          {product.product_type === "bundle" ? (
            <span className="border border-[rgb(var(--sep-colour-80613b))]/60 bg-[rgb(var(--sep-colour-100c09))]/90 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c6a979))]">
              Bundle
            </span>
          ) : null}
        </div>

        {owned ? (
          <span className="absolute right-3 top-3 border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-332719))] px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd9aa))]">
            Owned
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-dec79d))]">
          {product.name}
        </h3>

        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          {product.description ||
            "A premium unlock from the Sepulchria Store."}
        </p>

        {grantLabels.length ? (
          <div className="mt-3 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-3">
            <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]">
              Includes
            </p>

            <p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-a99b89))]">
              {grantLabels.join(" · ")}
            </p>
          </div>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {moneyPrices.map((price) => (
              <span
                key={price.id}
                className="border border-[rgb(var(--sep-colour-80613b))]/50 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1.5 text-[9px] text-[rgb(var(--sep-colour-e2cda4))]"
              >
                {price.label}
              </span>
            ))}

            {remnantPrices.map((price) => (
              <span
                key={`remnants-${price.id}`}
                className="border border-[rgb(var(--sep-colour-80613b))]/50 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1.5 text-[9px] text-[rgb(var(--sep-colour-e2cda4))]"
              >
                🝈 {price.amount} Remnants
              </span>
            ))}

            {!moneyPrices.length &&
            !remnantPrices.length ? (
              <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                Price coming soon
              </span>
            ) : null}
          </div>

          <button
            type="button"
            disabled
            title={
              owned
                ? "Already owned"
                : "Checkout will be enabled in the next Store phase."
            }
            className={[
              "mt-3 w-full border px-3 py-2 text-[8px] uppercase tracking-[0.16em]",
              owned
                ? "cursor-default border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-756958))]"
                : "cursor-not-allowed border-[rgb(var(--sep-colour-80613b))]/45 bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-a99069))]",
            ].join(" ")}
          >
            {owned ? "Owned" : "Checkout coming next"}
          </button>
        </div>
      </div>
    </article>
  );
}
