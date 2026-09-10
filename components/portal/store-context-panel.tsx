"use client";

import { useEffect, useMemo, useState } from "react";

type ProductRef = { id: string; name: string; category: string };

const LABELS: Record<string, string> = {
  skin: "Skins",
  cosmetic: "Cosmetics",
  music: "Music",
  friend_list: "Friend List",
  private_location: "Private Locations",
  bundle: "Bundles",
};

export function StoreContextPanel({ admin = false }: { admin?: boolean }) {
  const [products, setProducts] = useState<ProductRef[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const collect = () => {
      setProducts(
        Array.from(document.querySelectorAll<HTMLElement>("[data-store-product]"))
          .map((element) => ({
            id: element.id,
            name: element.dataset.storeName ?? "Product",
            category: element.dataset.storeCategory ?? "other",
          }))
          .filter((entry) => Boolean(entry.id)),
      );
    };

    collect();
    const observer = new MutationObserver(collect);
    observer.observe(document.body, { childList: true, subtree: true });

    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string; category?: string }>).detail;
      if (typeof detail?.query === "string") setQuery(detail.query);
      if (typeof detail?.category === "string") setCategory(detail.category);
    };
    window.addEventListener("sepulchria:store-filter-state", onState);

    return () => {
      observer.disconnect();
      window.removeEventListener("sepulchria:store-filter-state", onState);
    };
  }, []);

  function apply(nextQuery: string, nextCategory: string) {
    setQuery(nextQuery);
    setCategory(nextCategory);
    const detail = { query: nextQuery, category: nextCategory };
    window.dispatchEvent(new CustomEvent("sepulchria:store-filter-request", { detail }));

    document.querySelectorAll<HTMLElement>("[data-store-filter-card]").forEach((element) => {
      const name = (element.dataset.storeName ?? "").toLowerCase();
      const productCategory = element.dataset.storeCategory ?? "";
      const matchesName = !nextQuery.trim() || name.includes(nextQuery.trim().toLowerCase());
      const matchesCategory = nextCategory === "all" || productCategory === nextCategory;
      element.hidden = !(matchesName && matchesCategory);
    });
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );

  const filtered = products.filter((product) => {
    const matchesName = !query.trim() || product.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesName && (category === "all" || product.category === category);
  });

  return (
    <div className="flex min-h-0 flex-col components_portal_store_context_panel_div_container">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] components_portal_store_context_panel_p_text">
        {admin ? "Store Administration" : "Sepulchria Store"}
      </p>
      <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_portal_store_context_panel_h3_heading">Find a product</h3>

      <input
        type="search"
        value={query}
        onChange={(event) => apply(event.target.value, category)}
        placeholder="Live search..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_portal_store_context_panel_input_live_search"
      />

      <div className="mt-3 flex flex-wrap gap-1.5 components_portal_store_context_panel_div_container_2">
        <button type="button" onClick={() => apply(query, "all")} className="border border-[rgb(var(--sep-colour-60482e))]/45 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a99b89))] components_portal_store_context_panel_button_all">All</button>
        {categories.map((key) => (
          <button key={key} type="button" onClick={() => apply(query, key)} className="border border-[rgb(var(--sep-colour-60482e))]/45 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a99b89))] components_portal_store_context_panel_button_action">
            {LABELS[key] ?? key}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto components_portal_store_context_panel_div_container_3">
        {categories.map((group) => {
          const groupProducts = filtered.filter((product) => product.category === group);
          if (!groupProducts.length) return null;
          return (
            <section className="components_portal_store_context_panel_section_section" key={group}>
              <p className="mb-2 text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_portal_store_context_panel_p_text_2">{LABELS[group] ?? group}</p>
              <div className="space-y-1.5 components_portal_store_context_panel_div_container_4">
                {groupProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => document.getElementById(product.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 text-left text-[9px] text-[rgb(var(--sep-colour-b9a98f))] transition hover:border-[rgb(var(--sep-colour-987344))]/70 hover:text-[rgb(var(--sep-colour-efd9aa))] components_portal_store_context_panel_button_action_2"
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {!filtered.length ? <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-756958))] components_portal_store_context_panel_p_text_3">No products match this filter.</p> : null}
      </div>
    </div>
  );
}
