"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ShopItem = { id: string; name: string; category: string | null };

export function MarketItemsContext({ shopSlug }: { shopSlug: string }) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [shopName, setShopName] = useState("Shop");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: shop, error: shopError } = await supabase.from("market_shops").select("id, name")
        .eq("slug", shopSlug).eq("is_active", true).maybeSingle();
      if (cancelled) return;
      if (shopError || !shop) { setError(shopError?.message ?? "Shop not found."); setLoading(false); return; }
      setShopName(String(shop.name));
      const { data, error } = await supabase.from("market_listings").select(`
        id, sort_order,
        item:items(id, name, is_active, category:item_categories(name))
      `).eq("shop_id", shop.id).eq("is_active", true).order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) { setError(error.message); setLoading(false); return; }
      const rows: ShopItem[] = [];
      for (const listing of data ?? []) {
        const raw = Array.isArray(listing.item) ? listing.item[0] ?? null : listing.item;
        if (!raw || raw.is_active !== true) continue;
        const cat = Array.isArray(raw.category) ? raw.category[0] ?? null : raw.category;
        rows.push({ id: String(raw.id), name: String(raw.name), category: cat?.name ? String(cat.name) : null });
      }
      setItems(rows); setError(null); setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [shopSlug]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => `${i.name} ${i.category ?? ""}`.toLowerCase().includes(q)) : items;
  }, [items, search]);

  function jump(id: string) {
    document.getElementById(`market-item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return <div className="flex h-full min-h-0 flex-col">
    <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">{shopName}</p>
    <h2 className="mt-1 font-serif text-xl text-[#d8bf91]">Shop Items</h2>
    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Items..."
      className="mt-3 w-full border border-[#59432c]/45 bg-[#100c09] px-3 py-2.5 text-xs text-[#d4bea0] outline-none placeholder:text-[#665b4d] focus:border-[#987344]" />
    <p className="mt-1.5 text-right text-[7px] uppercase tracking-[0.1em] text-[#6f6353]">{visible.length}{search.trim() ? ` / ${items.length}` : ""} Items</p>
    {error ? <p className="mt-3 text-[10px] text-red-400">{error}</p> : null}
    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
      {loading ? <p className="text-[10px] text-[#756958]">Loading Items...</p> :
        <div className="space-y-1.5">{visible.map((item) =>
          <button key={item.id} type="button" onClick={() => jump(item.id)}
            className="flex w-full items-center justify-between gap-2 border border-[#59432c]/40 bg-[#100c09] px-3 py-2 text-left transition hover:border-[#8d693e] hover:bg-[#1a130e]">
            <span className="min-w-0"><span className="block truncate font-serif text-[13px] text-[#cbb28a]">{item.name}</span>
              {item.category ? <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.1em] text-[#6f6252]">{item.category}</span> : null}</span>
            <span className="text-[#806b50]">↓</span>
          </button>)}</div>}
    </div>
  </div>;
}
