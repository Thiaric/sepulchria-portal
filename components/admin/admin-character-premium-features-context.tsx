"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type FeatureEntry = {
  id: string;
  name: string;
  type: string;
};

export function AdminCharacterPremiumFeaturesContext() {
  const [entries, setEntries] =
    useState<FeatureEntry[]>([]);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    const readEntries = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-admin-premium-feature="true"]',
        ),
      );

      setEntries(
        nodes.map((node, index) => {
          const id =
            node.id.trim() ||
            `admin-premium-feature-${index}`;

          if (!node.id) {
            node.id = id;
          }

          return {
            id,
            name:
              node.dataset.adminFeatureName ??
              "Unnamed feature",
            type:
              node.dataset.adminFeatureType ??
              "Feature",
          };
        }),
      );
    };

    readEntries();
    const frame =
      window.requestAnimationFrame(
        readEntries,
      );

    window.addEventListener(
      "sepulchria:admin-data-changed",
      readEntries,
    );

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        readEntries,
      );
    };
  }, []);

  const visible = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) return entries;

    return entries.filter((entry) =>
      `${entry.name} ${entry.type}`
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  function jumpTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <div className="flex h-full min-h-0 flex-col components_admin_admin_character_premium_features_context_div_feature_navigator">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_premium_features_context_p_feature_navigator">
        Premium Features
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_admin_admin_character_premium_features_context_h2_feature_navigator">
        Feature Navigator
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_premium_features_context_p_feature_navigator_2">
        Search by feature name or type, then jump directly to it.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search features..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-987344))] components_admin_admin_character_premium_features_context_input_search_features"
      />

      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto components_admin_admin_character_premium_features_context_div_feature_navigator_2">
        {visible.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() =>
              jumpTo(entry.id)
            }
            className="w-full border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-80613b))] hover:bg-[rgb(var(--sep-colour-17110d))] components_admin_admin_character_premium_features_context_button_action"
          >
            <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] components_admin_admin_character_premium_features_context_span_text">
              {entry.name}
            </span>
            <span className="mt-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-6f6252))] components_admin_admin_character_premium_features_context_span_text_2">
              {entry.type}
            </span>
          </button>
        ))}

        {visible.length === 0 ? (
          <p className="px-2 py-5 text-center text-[10px] text-[rgb(var(--sep-colour-706452))] components_admin_admin_character_premium_features_context_p_text">
            No matching features.
          </p>
        ) : null}
      </div>
    </div>
  );
}
