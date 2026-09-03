"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CatalogueEntry = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
};

const CATALOGUE_STORAGE_KEY =
  "sepulchria:owned-cosmetics-catalogue";

const CATALOGUE_EVENT =
  "sepulchria:owned-cosmetics-catalogue";

function parseEntries(
  value: unknown,
): CatalogueEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (
        !entry ||
        typeof entry !==
          "object"
      ) {
        return null;
      }

      const record =
        entry as Record<
          string,
          unknown
        >;

      const id =
        String(
          record.id ?? "",
        ).trim();

      const name =
        String(
          record.name ?? "",
        ).trim();

      const category =
        String(
          record.category ??
            "",
        ).trim();

      const categoryLabel =
        String(
          record.categoryLabel ??
            "",
        ).trim();

      if (
        !id ||
        !name ||
        !category
      ) {
        return null;
      }

      return {
        id,
        name,
        category,
        categoryLabel:
          categoryLabel ||
          category,
      };
    })
    .filter(
      (
        entry,
      ): entry is CatalogueEntry =>
        entry !== null,
    );
}

function findTarget(
  id: string,
) {
  const own =
    document.getElementById(id);

  if (own) {
    return own;
  }

  for (
    const iframe of
    Array.from(
      document.querySelectorAll(
        "iframe",
      ),
    )
  ) {
    try {
      const target =
        iframe.contentDocument
          ?.getElementById(
            id,
          );

      if (target) {
        return target;
      }
    } catch {
      // Ignore non-same-origin frames.
    }
  }

  return null;
}

function jumpAndHighlight(
  id: string,
) {
  const target =
    findTarget(id);

  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  const element =
    target as HTMLElement;

  const previousOutline =
    element.style.outline;

  const previousOffset =
    element.style.outlineOffset;

  element.style.outline =
    "1px solid rgb(var(--sep-colour-9b7545))";

  element.style.outlineOffset =
    "3px";

  window.setTimeout(
    () => {
      element.style.outline =
        previousOutline;

      element.style.outlineOffset =
        previousOffset;
    },
    1400,
  );
}

export function PlayerCosmeticsContextPanel() {
  const [entries, setEntries] =
    useState<CatalogueEntry[]>(
      [],
    );

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("all");

  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem(
          CATALOGUE_STORAGE_KEY,
        );

      if (stored) {
        setEntries(
          parseEntries(
            JSON.parse(stored),
          ),
        );
      }
    } catch {
      // Live message/event can still populate the navigator.
    }

    function handleCatalogue(
      event: Event,
    ) {
      const custom =
        event as CustomEvent<{
          entries?: unknown;
        }>;

      setEntries(
        parseEntries(
          custom.detail
            ?.entries,
        ),
      );
    }

    function handleMessage(
      event: MessageEvent,
    ) {
      if (
        event.origin !==
        window.location.origin
      ) {
        return;
      }

      const data =
        event.data as
          | {
              type?: string;
              entries?: unknown;
            }
          | null;

      if (
        data?.type !==
        CATALOGUE_EVENT
      ) {
        return;
      }

      setEntries(
        parseEntries(
          data.entries,
        ),
      );
    }

    window.addEventListener(
      CATALOGUE_EVENT,
      handleCatalogue,
    );

    window.addEventListener(
      "message",
      handleMessage,
    );

    return () => {
      window.removeEventListener(
        CATALOGUE_EVENT,
        handleCatalogue,
      );

      window.removeEventListener(
        "message",
        handleMessage,
      );
    };
  }, []);

  const categories =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      for (
        const entry of entries
      ) {
        map.set(
          entry.category,
          entry.categoryLabel,
        );
      }

      return Array.from(
        map.entries(),
      ).sort((a, b) =>
        a[1].localeCompare(
          b[1],
        ),
      );
    }, [entries]);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const filtered =
    entries.filter(
      (entry) => {
        if (
          category !==
            "all" &&
          entry.category !==
            category
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        return (
          entry.name
            .toLocaleLowerCase()
            .includes(query) ||
          entry.categoryLabel
            .toLocaleLowerCase()
            .includes(query)
        );
      },
    );

  const visibleCategories =
    categories.filter(
      ([key, label]) => {
        if (
          category !==
            "all" &&
          key !== category
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        return (
          label
            .toLocaleLowerCase()
            .includes(query) ||
          entries.some(
            (entry) =>
              entry.category ===
                key &&
              entry.name
                .toLocaleLowerCase()
                .includes(
                  query,
                ),
          )
        );
      },
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">
          Premium
        </p>

        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d6bd91))]">
          Cosmetics
        </h2>
      </div>

      <p className="mt-3 text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Search your collection by type or cosmetic name and jump directly to it.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search cosmetics..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))]"
      />

      <select
        value={category}
        onChange={(event) =>
          setCategory(
            event.target.value,
          )
        }
        className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-8a673f))]"
      >
        <option value="all">
          All cosmetic types
        </option>

        {categories.map(
          ([key, label]) => (
            <option
              key={key}
              value={key}
            >
              {label}
            </option>
          ),
        )}
      </select>

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <div
        data-portal-scroll
        className="min-h-0 flex-1 overflow-y-auto pr-1"
      >
        {visibleCategories.length >
        0 ? (
          <div className="mb-4">
            <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Types
            </p>

            <div className="space-y-1.5">
              {visibleCategories.map(
                ([
                  key,
                  label,
                ]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      jumpAndHighlight(
                        `cosmetic-type-${key}`,
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))]"
                  >
                    <span className="truncate text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a98b61))]">
                      {label}
                    </span>

                    <span className="text-[rgb(var(--sep-colour-725a3d))]">
                      ↓
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        ) : null}

        <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Cosmetics · {
            filtered.length
          }
        </p>

        <div className="space-y-1.5">
          {filtered.map(
            (entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpAndHighlight(
                    `cosmetic-${entry.id}`,
                  )
                }
                className="flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
                    {entry.name}
                  </span>

                  <span className="mt-0.5 block truncate text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756550))]">
                    {
                      entry.categoryLabel
                    }
                  </span>
                </span>

                <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                  →
                </span>
              </button>
            ),
          )}

          {filtered.length ===
          0 ? (
            <p className="px-2 py-3 text-xs text-[rgb(var(--sep-colour-8f826f))]">
              No matching owned cosmetics.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
