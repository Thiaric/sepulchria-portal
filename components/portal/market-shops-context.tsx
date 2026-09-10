"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Shop = { id: string; name: string; slug: string };

export function MarketShopsContext() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("market_shops")
        .select("id, name, slug, sort_order").eq("is_active", true)
        .order("sort_order", { ascending: true }).order("name");
      if (cancelled) return;
      if (error) setError(error.message);
      else {
        setShops((data ?? []).map((s) => ({ id: String(s.id), name: String(s.name), slug: String(s.slug) })));
        setError(null);
      }
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? shops.filter((s) => `${s.name} ${s.slug}`.toLowerCase().includes(q)) : shops;
  }, [shops, search]);

  return <div className="flex h-full min-h-0 flex-col components_portal_market_shops_context_div_shops">
    <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] components_portal_market_shops_context_p_shops">Market</p>
    <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_portal_market_shops_context_h2_shops">Shops</h2>
    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shops..."
      className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))] components_portal_market_shops_context_input_search_shops" />
    {error ? <p className="mt-3 text-[10px] text-red-400 components_portal_market_shops_context_p_shops_2">{error}</p> : null}
    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 components_portal_market_shops_context_div_shops_2">
      {loading ? <p className="text-[10px] text-[rgb(var(--sep-colour-756958))] components_portal_market_shops_context_p_shops_3">Loading shops...</p> :
        <div className="space-y-1.5 components_portal_market_shops_context_div_shops_3">{visible.map((shop) =>
          <button key={shop.id} type="button" onClick={() => router.push(`/market/${shop.slug}`)}
            className="flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1a130e))] components_portal_market_shops_context_button_action">
            <span className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] components_portal_market_shops_context_span_text">{shop.name}</span><span className="text-[rgb(var(--sep-colour-806b50))] components_portal_market_shops_context_span_text_2">→</span>
          </button>)}</div>}
    </div>
  </div>;
}
