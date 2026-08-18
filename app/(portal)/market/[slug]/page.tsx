import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
};

type CategoryRelation = { name: string } | { name: string }[] | null;
type SubcategoryRelation = { name: string } | { name: string }[] | null;

type ItemEffect = {
  trigger_type: "owned" | "equipped" | "use";
  effect_mode: "instant" | "temporary" | "passive";
  duration_minutes: number | null;
  health_delta: number;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  max_health_modifier: number;
};

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
    is_equippable: boolean;
    equip_slot: string | null;
    equip_layer: string | null;
    hands_required: number;
    use_behaviour: "reusable" | "consumable" | "limited_charges" | null;
    target_mode: "self" | "other" | "either" | null;
    cooldown_minutes: number | null;
    max_charges: number | null;
    effects: ItemEffect[] | null;
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
    is_equippable: boolean;
    equip_slot: string | null;
    equip_layer: string | null;
    hands_required: number;
    use_behaviour: "reusable" | "consumable" | "limited_charges" | null;
    target_mode: "self" | "other" | "either" | null;
    cooldown_minutes: number | null;
    max_charges: number | null;
    effects: ItemEffect[] | null;
    category: CategoryRelation;
    subcategory: SubcategoryRelation;
  }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function slotLabel(slot: string | null) {
  if (!slot) return null;

  const labels: Record<string, string> = {
    head: "Head",
    neck: "Neck",
    shoulders: "Shoulders",
    torso: "Torso",
    back: "Back",
    arms: "Arms",
    hands: "Hands",
    waist: "Waist",
    legs: "Legs",
    feet: "Feet",
    main_hand: "Main Hand",
    off_hand: "Off Hand",
  };

  return labels[slot] ?? slot.replaceAll("_", " ");
}

function effectLines(effects: ItemEffect[] | null) {
  const result: string[] = [];

  for (const effect of effects ?? []) {
    const context =
      effect.trigger_type === "use"
        ? "On use"
        : effect.trigger_type === "equipped"
          ? "While equipped"
          : "While owned";

    const duration =
      effect.effect_mode === "temporary" && effect.duration_minutes
        ? ` for ${effect.duration_minutes} min`
        : "";

    const values: Array<[string, number]> = [
      ["Health", effect.health_delta],
      ["Muscles", effect.muscles_modifier],
      ["Reflexes", effect.reflexes_modifier],
      ["Vigour", effect.vigour_modifier],
      ["Shrewd", effect.shrewd_modifier],
      ["Brains", effect.brains_modifier],
      ["Presence", effect.presence_modifier],
      ["Max Health", effect.max_health_modifier],
    ];

    for (const [label, value] of values) {
      if (!value) continue;

      if (
        label === "Health" &&
        effect.trigger_type === "use" &&
        effect.effect_mode === "instant" &&
        value > 0
      ) {
        result.push(`${context}: heals ${value} Health`);
        continue;
      }

      result.push(
        `${context}${duration}: ${value > 0 ? "+" : ""}${value} ${label}`,
      );
    }
  }

  return result;
}

function useLabel(item: {
  is_usable: boolean;
  use_behaviour: "reusable" | "consumable" | "limited_charges" | null;
  target_mode: "self" | "other" | "either" | null;
  cooldown_minutes: number | null;
  max_charges: number | null;
}) {
  if (!item.is_usable) return null;

  const pieces = ["Usable"];

  if (item.use_behaviour === "consumable") {
    pieces.push("Consumable");
  } else if (item.use_behaviour === "reusable") {
    pieces.push("Reusable");
  } else if (item.use_behaviour === "limited_charges") {
    pieces.push(
      item.max_charges
        ? `${item.max_charges} charges`
        : "Limited charges",
    );
  }

  if (item.target_mode === "self") {
    pieces.push("Self");
  } else if (item.target_mode === "other") {
    pieces.push("Others");
  } else if (item.target_mode === "either") {
    pieces.push("Self / Others");
  }

  if (item.cooldown_minutes) {
    pieces.push(`${item.cooldown_minutes} min cooldown`);
  }

  return pieces.join(" · ");
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
        is_equippable,
        equip_slot,
        equip_layer,
        hands_required,
        use_behaviour,
        target_mode,
        cooldown_minutes,
        max_charges,
        effects:item_effects(
          trigger_type,
          effect_mode,
          duration_minutes,
          health_delta,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier,
          max_health_modifier
        ),
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

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.is_equippable ? (
                      <span className="border border-[#6c5739]/55 bg-[#1d160f] px-2 py-1 text-[7px] uppercase tracking-[0.11em] text-[#c3a778]">
                        Equippable · {slotLabel(item.equip_slot)}
                        {item.hands_required > 0
                          ? ` · ${item.hands_required === 1 ? "1 hand" : "2 hands"}`
                          : ""}
                      </span>
                    ) : null}

                    {useLabel(item) ? (
                      <span className="border border-[#6c5739]/55 bg-[#1d160f] px-2 py-1 text-[7px] uppercase tracking-[0.11em] text-[#c3a778]">
                        {useLabel(item)}
                      </span>
                    ) : null}

                    {item.is_quest_item ? (
                      <span className="border border-[#6c5739]/55 bg-[#1d160f] px-2 py-1 text-[7px] uppercase tracking-[0.11em] text-[#c3a778]">
                        Quest Item
                      </span>
                    ) : null}
                  </div>

                  {effectLines(item.effects).length ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {effectLines(item.effects).map((effect, index) => (
                        <span
                          key={`${listing.id}-effect-${index}`}
                          className="text-[8px] leading-4 text-[#b69a72]"
                        >
                          {effect}
                        </span>
                      ))}
                    </div>
                  ) : null}

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
