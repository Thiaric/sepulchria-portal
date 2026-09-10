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

  return <div className="flex h-full min-h-0 flex-col components_portal_market_items_context_div_shop_items">
    <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] components_portal_market_items_context_p_shop_items">{shopName}</p>
    <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_portal_market_items_context_h2_shop_items">Shop Items</h2>
    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Items..."
      className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))] components_portal_market_items_context_input_search_items" />
    <p className="mt-1.5 text-right text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))] components_portal_market_items_context_p_shop_items_2">{visible.length}{search.trim() ? ` / ${items.length}` : ""} Items</p>
    {error ? <p className="mt-3 text-[10px] text-red-400 components_portal_market_items_context_p_shop_items_3">{error}</p> : null}
    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 components_portal_market_items_context_div_shop_items_2">
      {loading ? <p className="text-[10px] text-[rgb(var(--sep-colour-756958))] components_portal_market_items_context_p_shop_items_4">Loading Items...</p> :
        <div className="space-y-1.5 components_portal_market_items_context_div_shop_items_3">{visible.map((item) =>
          <button key={item.id} type="button" onClick={() => jump(item.id)}
            className="flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1a130e))] components_portal_market_items_context_button_action">
            <span className="min-w-0 components_portal_market_items_context_span_text"><span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] components_portal_market_items_context_span_text_2">{item.name}</span>
              {item.category ? <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6252))] components_portal_market_items_context_span_text_3">{item.category}</span> : null}</span>
            <span className="text-[rgb(var(--sep-colour-806b50))] components_portal_market_items_context_span_text_4">↓</span>
          </button>)}</div>}
    </div>
  </div>;
}
