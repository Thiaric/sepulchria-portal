"use client";

import { useState } from "react";

export function StoreLiveFilterBar({
  placeholder = "Search Store products...",
}: {
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  function filterProducts(value: string) {
    const search = value.trim().toLowerCase();

    const storePage = document.querySelector<HTMLElement>(
      "[data-store-page]",
    );

    if (!storePage) return;

    const cards =
      storePage.querySelectorAll<HTMLElement>(
        "[data-store-filter-card]",
      );

    cards.forEach((card) => {
      const productName = (
        card.dataset.storeName ?? ""
      ).toLowerCase();

      const matches =
        search === "" || productName.includes(search);

      card.style.display = matches ? "" : "none";
    });
  }

  return (
    <input
      type="search"
      value={query}
      onChange={(event) => {
        const value = event.target.value;

        setQuery(value);
        filterProducts(value);
      }}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-756958))] focus:border-[rgb(var(--sep-colour-987344))]"
    />
  );
}