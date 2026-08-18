"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Shop = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export function AdminMarketContext() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("market_shops")
        .select("id, name, slug, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("name");

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setShops((data ?? []).map((shop) => ({
        id: String(shop.id),
        name: String(shop.name),
        slug: String(shop.slug),
        is_active: shop.is_active === true,
      })));

      setError(null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return shops;
    return shops.filter((shop) =>
      `${shop.name} ${shop.slug}`.toLowerCase().includes(query),
    );
  }, [shops, search]);

  function jump(id: string) {
    document.getElementById(`market-shop-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[#d8bf91]">
        Jump to Shops
      </h2>

      <button
        type="button"
        onClick={() =>
          document.getElementById("market-shop-new")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
        className="mt-3 flex w-full items-center justify-between border border-[#765937]/55 bg-[#271c12] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[#d6b37d]"
      >
        <span>Create new</span>
        <span>+</span>
      </button>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search shops..."
        className="mt-3 w-full border border-[#59432c]/45 bg-[#100c09] px-3 py-2.5 text-xs text-[#d4bea0] outline-none placeholder:text-[#665b4d] focus:border-[#987344]"
      />

      <p className="mt-1.5 text-right text-[7px] uppercase tracking-[0.1em] text-[#6f6353]">
        {visible.length}{search.trim() ? ` / ${shops.length}` : ""} Shops
      </p>

      {error ? (
        <p className="mt-3 text-[10px] text-red-400">{error}</p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-[10px] text-[#756958]">Loading shops...</p>
        ) : (
          <div className="space-y-1.5">
            {visible.map((shop) => (
              <button
                key={shop.id}
                type="button"
                onClick={() => jump(shop.id)}
                className="flex w-full items-center justify-between gap-2 border border-[#59432c]/40 bg-[#100c09] px-3 py-2 text-left hover:border-[#8d693e]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[13px] text-[#cbb28a]">
                    {shop.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[8px] text-[#6f6252]">
                    {shop.slug}
                  </span>
                </span>

                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    shop.is_active ? "bg-emerald-600" : "bg-[#66594b]"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
