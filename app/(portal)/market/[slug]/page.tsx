import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatRemnants } from "@/lib/economy/currency";
import {
  MarketCatalogue,
  type MarketCatalogueListing,
} from "@/components/market/market-catalogue";

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

  const { data: character } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: wallet } = character
    ? await supabase
        .from("character_wallets")
        .select("balance")
        .eq("character_id", character.id)
        .maybeSingle()
    : { data: null };

  const { data: inventoryRows } = character
    ? await supabase.rpc(
        "get_public_character_inventory",
        {
          p_character_id: character.id,
        },
      )
    : { data: [] };

  const sellableByItem = new Map<string, number>();

  for (
    const row of
      (inventoryRows ?? []) as Array<{
        record_kind: string;
        item_id: string;
        quantity: number;
        parent_container_id: string | null;
        is_equipped: boolean;
        transfer_policy: string;
        is_quest_item: boolean;
        container_capacity: number | null;
        record_id: string;
      }>
  ) {
    const normalStandard =
      row.record_kind === "standard";

    const ordinaryContainer =
      row.record_kind === "unique" &&
      row.container_capacity !== null;

    if (
      (!normalStandard && !ordinaryContainer) ||
      row.parent_container_id ||
      row.is_equipped ||
      row.transfer_policy !== "free" ||
      row.is_quest_item
    ) {
      continue;
    }

    if (ordinaryContainer) {
      const [{ count: standardChildren }, { count: instanceChildren }] =
        await Promise.all([
          supabase
            .from("character_items")
            .select("id", { count: "exact", head: true })
            .eq("container_instance_id", row.record_id),
          supabase
            .from("character_item_instances")
            .select("id", { count: "exact", head: true })
            .eq("container_instance_id", row.record_id),
        ]);

      if (
        (standardChildren ?? 0) > 0 ||
        (instanceChildren ?? 0) > 0
      ) {
        continue;
      }
    }

    sellableByItem.set(
      row.item_id,
      (sellableByItem.get(row.item_id) ?? 0) +
        (ordinaryContainer ? 1 : Number(row.quantity ?? 0)),
    );
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

  const catalogueListings: MarketCatalogueListing[] =
    listings.flatMap((listing) => {
      const item = one(listing.item);

      if (!item) return [];

      return [{
        id: listing.id,
        buy_price: Number(listing.buy_price),
        sell_price: listing.sell_price === null ? null : Number(listing.sell_price),
        stock_mode: listing.stock_mode,
        stock_quantity: listing.stock_quantity === null ? null : Number(listing.stock_quantity),
        owned_sellable_quantity: sellableByItem.get(item.id) ?? 0,
        item: {
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          image_url: item.image_url,
          quality: item.quality,
          is_quest_item: item.is_quest_item,
          is_usable: item.is_usable,
          is_equippable: item.is_equippable,
          equip_slot: item.equip_slot,
          equip_layer: item.equip_layer,
          hands_required: Number(item.hands_required ?? 0),
          use_behaviour: item.use_behaviour,
          target_mode: item.target_mode,
          cooldown_minutes: item.cooldown_minutes,
          max_charges: item.max_charges,
          effects: item.effects ?? [],
          category: one(item.category)?.name ?? null,
          subcategory: one(item.subcategory)?.name ?? null,
        },
      }];
    });

  const walletBalance =
    wallet?.balance === undefined ||
    wallet?.balance === null
      ? null
      : Number(wallet.balance);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/market"
          className="inline-flex items-center gap-2 border border-[#60482e]/55 bg-[#15100d] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c6ab80] transition hover:border-[#987344] hover:bg-[#261b12] hover:text-[#ead2a5]"
        >
          <span aria-hidden="true">←</span>
          Back to Market
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
            <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
              <p className="max-w-4xl text-sm leading-7 text-[#a99b89]">
                {shop.description}
              </p>

              <div className="ml-auto shrink-0 text-right">
                <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                  Available Remnants
                </p>
                <p className="mt-1 font-serif text-2xl text-[#e3c17e]">
                  {walletBalance === null
                    ? "—"
                    : formatRemnants(walletBalance)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <MarketCatalogue
          listings={catalogueListings}
          walletBalance={walletBalance}
        />
      </div>
    </main>
  );
}
