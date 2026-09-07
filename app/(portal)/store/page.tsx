import { redirect } from "next/navigation";

import { StoreLiveFilterBar } from "@/components/store/store-live-filter-bar";
import { StorePaddlePurchaseButton } from "@/components/store/store-paddle-purchase-button";
import { StoreRemnantPurchaseButton } from "@/components/store/store-remnant-purchase-button";
import { StoreMusicPreview } from "@/components/store/store-music-preview";
import { StoreAccountPanels } from "@/components/store/store-account-panels";
import { createAdminClient } from "@/lib/supabase/admin";
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
  paddle_price_id: string | null;
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
  slug: string;
  name: string;
  description: string;
};

type Cosmetic = {
  id: string;
  name: string;
  category: string;
};

type MusicTrack = {
  id: string;
  name: string;
  storage_path: string;
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

  const admin = createAdminClient();

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
        "id, product_id, currency, money_amount_minor, remnants_amount, paddle_price_id",
      )
      .eq("is_active", true),

    supabase
      .from("store_product_grants")
      .select(
        "id, product_id, grant_type, portal_skin_id, cosmetic_item_id, music_track_id, feature_key",
      ),

    supabase
      .from("portal_skins")
      .select("id, slug, name, description"),

    supabase
      .from("cosmetic_items")
      .select("id, name, category"),

    admin
      .from("music_tracks")
      .select("id, name, storage_path")
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

  const musicPreviewUrls = new Map<string, string>();
  await Promise.all(
    musicTracks.map(async (track) => {
      if (!track.storage_path) return;

      const { data, error } = await admin.storage
        .from("music")
        .createSignedUrl(track.storage_path, 15 * 60);

      if (!error && data?.signedUrl) {
        musicPreviewUrls.set(track.id, data.signedUrl);
      }
    }),
  );

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

  const skinDetails = new Map(
    skins.map((skin) => [skin.id, skin]),
  );

  const cosmeticNames = new Map(
    cosmetics.map((item) => [item.id, item.name]),
  );

  const musicNames = new Map(
    musicTracks.map((track) => [track.id, track.name]),
  );

  const grantOwned = (grant: StoreGrant) => {
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
  };

  const productOwned = (productId: string) => {
    const productGrants = grants.filter(
      (grant) => grant.product_id === productId,
    );

    return (
      productGrants.length > 0 &&
      productGrants.every(grantOwned)
    );
  };

  const ownedGrantCountForProduct = (productId: string) =>
    grants.filter(
      (grant) =>
        grant.product_id === productId &&
        grantOwned(grant),
    ).length;

  const grantCountForProduct = (productId: string) =>
    grants.filter(
      (grant) => grant.product_id === productId,
    ).length;

  const featured = products.filter(
    (product) => product.is_featured,
  );

  return (
    <main
      data-store-page
      className="flex h-full min-h-0 w-full flex-col p-2 sm:p-5"
    >
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[rgb(var(--sep-colour-58432d))]/45 bg-[rgb(var(--sep-colour-15100d))]/82 shadow-[0_10px_26px_rgba(var(--sep-rgb-0-0-0),0.2)]">
        <header className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-211a14))] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <div className="mt-1 flex items-center justify-between gap-3">
                <h1 className="font-serif text-2xl text-[rgb(var(--sep-skin-c2))] sm:text-3xl">
                  Sepulchria's Store
                </h1>

                <details className="relative sm:hidden">
                  <summary className="cursor-pointer list-none whitespace-nowrap text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c69b5c))] [&::-webkit-details-marker]:hidden">
                    More ▼
                  </summary>

                  <div className="absolute right-0 top-full z-30 mt-2 w-[280px] max-w-[80vw] border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3 shadow-xl">
                    <p className="text-[10px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                      Unlock Portal Skins, Cosmetic frames and backgrounds, Locations&apos; Musics, Friend List access, Private Locations
                      and curated bundles using real money or Remnants. Refunds are available on request within 14 days of purchase only for real currency purchases (Support - New Ticket - Premium / Support - quote Order Number found on Receipt in Store). Refunds are not available for Remnant purchases.
                    </p>
                  </div>
                </details>
              </div>

              <p className="mt-2 hidden max-w-none text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))] sm:block">
                Unlock Portal Skins, Cosmetic frames and backgrounds, Locations&apos; Musics, Friend List access, Private Locations
                and curated bundles using real money or Remnants. Refunds are available on request within 14 days of purchase only for real currency purchases (Support - New Ticket - Premium / Support - quote Order Number found on Receipt in Store). Refunds are not available for Remnant purchases.
              </p>
            </div>

            <div className="hidden border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 sm:block sm:w-auto sm:shrink-0">
              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Discount codes
              </p>

              <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a99b89))]">
                are applied during checkout
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[0.85fr_1.35fr] gap-2 sm:hidden">
            <div className="flex min-w-0 flex-col justify-center border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2">
              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Discount codes
              </p>

              <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-a99b89))]">
                Applied at checkout
              </p>
            </div>

            <div className="min-w-0">
              <StoreLiveFilterBar />
            </div>
          </div>

          <div className="mt-4 hidden sm:block">
            <StoreLiveFilterBar />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-5">
          <StoreAccountPanels userId={user.id} />

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
                    ownedGrantCount={ownedGrantCountForProduct(product.id)}
                    totalGrantCount={grantCountForProduct(product.id)}
                    skinNames={skinNames}
                    skinDetails={skinDetails}
                    cosmeticNames={cosmeticNames}
                    musicNames={musicNames}
                    musicPreviewUrls={musicPreviewUrls}
                    featured
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className={featured.length ? "mt-6" : ""}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                
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
                    ownedGrantCount={ownedGrantCountForProduct(product.id)}
                    totalGrantCount={grantCountForProduct(product.id)}
                    skinNames={skinNames}
                    skinDetails={skinDetails}
                    cosmeticNames={cosmeticNames}
                    musicNames={musicNames}
                    musicPreviewUrls={musicPreviewUrls}
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
  ownedGrantCount,
  totalGrantCount,
  skinNames,
  skinDetails,
  cosmeticNames,
  musicNames,
  musicPreviewUrls,
  featured = false,
}: {
  product: StoreProduct;
  prices: StorePrice[];
  grants: StoreGrant[];
  owned: boolean;
  ownedGrantCount: number;
  totalGrantCount: number;
  skinNames: Map<string, string>;
  skinDetails: Map<string, Skin>;
  cosmeticNames: Map<string, string>;
  musicNames: Map<string, string>;
  musicPreviewUrls: Map<string, string>;
  featured?: boolean;
}) {
  const skinGrant = grants.find(
    (grant) =>
      grant.grant_type === "portal_skin" &&
      grant.portal_skin_id,
  );

  const skin =
    skinGrant?.portal_skin_id
      ? skinDetails.get(skinGrant.portal_skin_id)
      : null;

  const musicGrant = grants.find(
    (grant) =>
      grant.grant_type === "music" &&
      grant.music_track_id,
  );

  const musicPreviewUrl =
    musicGrant?.music_track_id
      ? musicPreviewUrls.get(musicGrant.music_track_id) ?? null
      : null;

  const musicPreviewName =
    musicGrant?.music_track_id
      ? musicNames.get(musicGrant.music_track_id) ?? product.name
      : product.name;

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

  const isPartiallyOwnedBundle =
    product.product_type === "bundle" &&
    totalGrantCount > 0 &&
    ownedGrantCount > 0 &&
    ownedGrantCount < totalGrantCount;

  const bundleOwnershipDiscountPercent =
    isPartiallyOwnedBundle
      ? (ownedGrantCount / totalGrantCount) * 100
      : 0;

  const bundleOwnershipDiscountLabel =
    Number.isInteger(bundleOwnershipDiscountPercent)
      ? bundleOwnershipDiscountPercent.toFixed(0)
      : bundleOwnershipDiscountPercent.toFixed(1);

  const moneyPrices = prices.flatMap((price) => {
    if (
      price.money_amount_minor === null ||
      !price.currency
    ) {
      return [];
    }

    const originalAmountMinor = price.money_amount_minor;
    const adjustedAmountMinor = isPartiallyOwnedBundle
      ? Math.max(
          0,
          originalAmountMinor -
            Math.round(
              (originalAmountMinor * ownedGrantCount) /
                totalGrantCount,
            ),
        )
      : originalAmountMinor;

    const label = moneyLabel(
      adjustedAmountMinor,
      price.currency,
    );
    const originalLabel = moneyLabel(
      originalAmountMinor,
      price.currency,
    );

    if (!label || !originalLabel) {
      return [];
    }

    return [
      {
        id: price.id,
        label,
        originalLabel,
      },
    ];
  });

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
      id={featured ? undefined : `store-product-${product.id}`}
      data-store-product={featured ? undefined : "true"}
      data-store-filter-card
      data-store-name={product.name}
      data-store-category={product.category}
      className={[
        "group flex h-full min-h-[290px] min-w-0 flex-col overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]",
        featured
          ? "border-[rgb(var(--sep-colour-987344))]/70"
          : "border-[rgb(var(--sep-colour-60482e))]/40",
      ].join(" ")}
    >
      <div className="relative h-36 shrink-0 overflow-hidden border-b border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-0d0b0a))]">
  {skin ? (
    <StoreSkinMiniPreview skin={skin} />
  ) : product.category === "music" && musicPreviewUrl ? (
    <div className="flex h-full w-full items-center justify-center p-3">
      <StoreMusicPreview
        src={musicPreviewUrl}
        title={musicPreviewName}
      />
    </div>
  ) : product.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image_url}
      alt=""
      className="h-full w-full object-contain p-3 opacity-80 transition group-hover:opacity-100"
    />
  ) : (
    <div className="flex h-full items-center justify-center">
      <span className="font-serif text-4xl text-[rgb(var(--sep-colour-4e402f))]">
        ◇
      </span>
    </div>
  )}

  {product.category !== "music" ? (
    <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--sep-colour-100c09))] via-transparent to-transparent" />
  ) : null}

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

          {isPartiallyOwnedBundle && moneyPrices[0] ? (

            <div className="mb-2 border border-[rgb(var(--sep-colour-80613b))]/45 bg-[rgb(var(--sep-colour-17120f))] px-3 py-2">

              <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c6a979))]">

                Bundle ownership discount · {ownedGrantCount}/{totalGrantCount} already owned · {bundleOwnershipDiscountLabel}% off

              </p>

              <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))]">

                <span className="mr-2 text-[rgb(var(--sep-colour-756958))] line-through">

                  {moneyPrices[0].originalLabel}

                </span>

                <span className="font-semibold text-[rgb(var(--sep-colour-efd9aa))]">

                  {moneyPrices[0].label}

                </span>

              </p>

            </div>

          ) : null}


          {owned ? (
            <button
  type="button"
  disabled
  className="mt-0 w-full cursor-default border border-emerald-600/70 bg-emerald-950/60 px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-emerald-300"
>
  Owned
</button>
          ) : (
            <>
              {remnantPrices.length ? (
                <StoreRemnantPurchaseButton
                  productId={product.id}
                  amount={remnantPrices[0].amount}
                />
              ) : null}

              {moneyPrices.length
                ? moneyPrices.map((moneyPrice) => (
                    <StorePaddlePurchaseButton
                      key={moneyPrice.id}
                      productId={product.id}
                      priceId={moneyPrice.id}
                      label={moneyPrice.label}
                    />
                  ))
                : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}


function StoreSkinMiniPreview({ skin }: { skin: Skin }) {
  return (
    <div
      data-portal-skin={skin.slug}
      className="portal-skin-scope flex h-full w-full items-center justify-center p-3"
    >
      <div
        className="flex h-full w-full flex-col border p-3"
        style={{
          background: "rgb(var(--sep-colour-120f0d))",
          borderColor: "rgb(var(--sep-skin-c1) / .48)",
          color: "rgb(var(--sep-skin-c2))",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-serif text-base" style={{ color: "rgb(var(--sep-skin-c1))" }}>
            {skin.name}
          </p>
          <div
            className="h-7 w-7 shrink-0 rounded-full"
            style={{
              background: "conic-gradient(from -90deg, rgb(var(--sep-colour-120f0d)) 0deg 120deg, rgb(var(--sep-skin-c1)) 120deg 240deg, rgb(var(--sep-skin-c2)) 240deg 360deg)",
              border: "1px solid rgb(var(--sep-skin-c1) / .60)",
            }}
          />
        </div>
        <p className="mt-2 line-clamp-2 text-[9px] leading-4">{skin.description}</p>
        <div
          className="mt-auto pt-2 text-[7px] uppercase tracking-[0.14em]"
          style={{
            borderTop: "1px solid rgb(var(--sep-skin-c1) / .28)",
            color: "rgb(var(--sep-skin-c1))",
          }}
        >
          Portal skin preview
        </div>
      </div>
    </div>
  );
}