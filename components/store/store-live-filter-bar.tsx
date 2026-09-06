"use client";

import { useEffect, useState } from "react";

type StoreFilterDetail = { query: string; category: string };

function applyFilter(detail: StoreFilterDetail) {
  const query = detail.query.trim().toLowerCase();
  const category = detail.category;

  document.querySelectorAll<HTMLElement>("[data-store-filter-card]").forEach((element) => {
    const name = (element.dataset.storeName ?? "").toLowerCase();
    const productCategory = element.dataset.storeCategory ?? "";
    const matchesName = !query || name.includes(query);
    const matchesCategory = category === "all" || productCategory === category;
    element.hidden = !(matchesName && matchesCategory);
  });

  window.dispatchEvent(new CustomEvent("sepulchria:store-filter-state", { detail }));
}

export function StoreLiveFilterBar({
  placeholder = "Search Store products...",
}: {
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onExternal = (event: Event) => {
      const detail = (event as CustomEvent<StoreFilterDetail>).detail;
      if (detail && typeof detail.query === "string") setQuery(detail.query);
    };
    window.addEventListener("sepulchria:store-filter-request", onExternal);
    return () => window.removeEventListener("sepulchria:store-filter-request", onExternal);
  }, []);

  return (
    <input
      type="search"
      value={query}
      onChange={(event) => {
        const detail = { query: event.target.value, category: "all" };
        setQuery(detail.query);
        applyFilter(detail);
        window.dispatchEvent(new CustomEvent("sepulchria:store-filter-request", { detail }));
      }}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-756958))] focus:border-[rgb(var(--sep-colour-987344))]"
    />
  );
}
