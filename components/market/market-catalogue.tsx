"use client";

import { useMemo, useState } from "react";

export type MarketCatalogueEffect = {
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

export type MarketCatalogueListing = {
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
    effects: MarketCatalogueEffect[];
    category: string | null;
    subcategory: string | null;
  };
};

const qualityOrder = [
  "poor",
  "average",
  "fine",
  "superior",
  "flawless",
  "peerless",
];

const attributeFilters = [
  ["muscles", "Mus", "muscles_modifier"],
  ["reflexes", "Dex", "reflexes_modifier"],
  ["vigour", "Vig", "vigour_modifier"],
  ["shrewd", "Shr", "shrewd_modifier"],
  ["brains", "Bra", "brains_modifier"],
  ["presence", "Pre", "presence_modifier"],
  ["health", "HP", "health_delta"],
  ["max-health", "Max HP", "max_health_modifier"],
] as const;

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

function effectLines(effects: MarketCatalogueEffect[]) {
  const result: string[] = [];

  for (const effect of effects) {
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

function useLabel(item: MarketCatalogueListing["item"]) {
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

export function MarketCatalogue({
  listings,
  walletBalance,
}: {
  listings: MarketCatalogueListing[];
  walletBalance: number | null;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [quality, setQuality] = useState("");
  const [itemType, setItemType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [attributes, setAttributes] = useState<string[]>([]);

  const categories = useMemo(
    () =>
      [...new Set(
        listings
          .map((listing) => listing.item.category)
          .filter((value): value is string => Boolean(value)),
      )].sort((a, b) => a.localeCompare(b)),
    [listings],
  );

  const subcategories = useMemo(
    () =>
      [...new Set(
        listings
          .filter(
            (listing) =>
              !category || listing.item.category === category,
          )
          .map((listing) => listing.item.subcategory)
          .filter((value): value is string => Boolean(value)),
      )].sort((a, b) => a.localeCompare(b)),
    [listings, category],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    return listings.filter((listing) => {
      const item = listing.item;
      const outOfStock =
        listing.stock_mode === "finite" &&
        Number(listing.stock_quantity ?? 0) <= 0;

      if (
        query &&
        !`${item.name} ${item.description} ${item.category ?? ""} ${item.subcategory ?? ""}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (category && item.category !== category) return false;
      if (subcategory && item.subcategory !== subcategory) return false;
      if (quality && item.quality !== quality) return false;

      if (itemType === "usable" && !item.is_usable) return false;
      if (itemType === "equippable" && !item.is_equippable) return false;
      if (
        itemType === "both" &&
        (!item.is_usable || !item.is_equippable)
      ) {
        return false;
      }

      if (min !== null && Number.isFinite(min) && listing.buy_price < min) {
        return false;
      }

      if (max !== null && Number.isFinite(max) && listing.buy_price > max) {
        return false;
      }

      if (
        affordableOnly &&
        walletBalance !== null &&
        listing.buy_price > walletBalance
      ) {
        return false;
      }

      if (inStockOnly && outOfStock) return false;

      if (attributes.length) {
        const effects = item.effects ?? [];

        const matchesAll = attributes.every((attribute) => {
          const config = attributeFilters.find(([key]) => key === attribute);
          if (!config) return true;

          const field = config[2];

          return effects.some(
            (effect) => Number(effect[field]) !== 0,
          );
        });

        if (!matchesAll) return false;
      }

      return true;
    });
  }, [
    listings,
    search,
    category,
    subcategory,
    quality,
    itemType,
    minPrice,
    maxPrice,
    affordableOnly,
    walletBalance,
    inStockOnly,
    attributes,
  ]);

  function toggleAttribute(value: string) {
    setAttributes((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  }

  function resetFilters() {
    setSearch("");
    setCategory("");
    setSubcategory("");
    setQuality("");
    setItemType("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setAffordableOnly(false);
    setAttributes([]);
  }

  const compactInput =
    "h-8 border border-[#59432c]/45 bg-[#100c09] px-2.5 text-[9px] text-[#cdb897] outline-none placeholder:text-[#665b4d] focus:border-[#987344]";

  return (
    <>
      <section className="mt-5 border border-[#60482e]/40 bg-[#15100d] px-3 py-2.5">
        <div className="grid gap-1.5 lg:grid-cols-[minmax(170px,1.35fr)_130px_130px_110px_130px_90px_90px_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name / description..."
            className={compactInput}
          />

          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setSubcategory("");
            }}
            className={compactInput}
          >
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={subcategory}
            onChange={(event) => setSubcategory(event.target.value)}
            className={compactInput}
          >
            <option value="">All subcategories</option>
            {subcategories.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value)}
            className={compactInput}
          >
            <option value="">Any quality</option>
            {qualityOrder.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={itemType}
            onChange={(event) => setItemType(event.target.value)}
            className={compactInput}
          >
            <option value="">Any function</option>
            <option value="usable">Usable</option>
            <option value="equippable">Equippable</option>
            <option value="both">Usable + Equippable</option>
          </select>

          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="From R"
            className={compactInput}
          />

          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="To R"
            className={compactInput}
          />

          <button
            type="button"
            onClick={resetFilters}
            className="h-8 border border-[#6b5235] bg-[#21170f] px-3 text-[7px] uppercase tracking-[0.12em] text-[#b89a70] transition hover:border-[#927047]"
          >
            Reset
          </button>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#59432c]/25 pt-1.5">
          <span className="mr-0.5 text-[7px] uppercase tracking-[0.12em] text-[#6f6252]">
            Effects
          </span>

          {attributeFilters.map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-1 text-[8px] text-[#9a886f]"
            >
              <input
                type="checkbox"
                checked={attributes.includes(value)}
                onChange={() => toggleAttribute(value)}
                className="h-3 w-3 accent-[#8b673d]"
              />
              {label}
            </label>
          ))}

          <span className="mx-1 hidden h-3 w-px bg-[#59432c]/40 sm:block" />

          <label className="flex cursor-pointer items-center gap-1 text-[8px] text-[#9a886f]">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
              className="h-3 w-3 accent-[#8b673d]"
            />
            In stock
          </label>

          {walletBalance !== null ? (
            <label className="flex cursor-pointer items-center gap-1 text-[8px] text-[#9a886f]">
              <input
                type="checkbox"
                checked={affordableOnly}
                onChange={(event) => setAffordableOnly(event.target.checked)}
                className="h-3 w-3 accent-[#8b673d]"
              />
              Affordable ({walletBalance.toLocaleString("en-GB")} R)
            </label>
          ) : null}

          <span className="ml-auto text-[7px] uppercase tracking-[0.11em] text-[#6f6252]">
            {visible.length} / {listings.length}
          </span>
        </div>
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {visible.map((listing) => {
          const item = listing.item;
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
                      {[item.category, item.subcategory, item.quality]
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

      {!visible.length ? (
        <section className="mt-4 border border-[#60482e]/40 bg-[#15100d] p-6 text-center text-sm text-[#8f8271]">
          No Items match the selected filters.
        </section>
      ) : null}
    </>
  );
}
