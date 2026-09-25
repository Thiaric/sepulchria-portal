"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type FilterOption = {
  id: string;
  name: string;
};

type FriendListLiveFiltersProps = {
  ancestries: FilterOption[];
  associations: FilterOption[];
  orders: FilterOption[];
  totalCount: number;
  filteredCount: number;
  initialSearch: string;
  initialAncestry: string;
  initialAssociation: string;
  initialOrder: string;
  initialRelationship: string;
  initialScope: string;
  embedded: boolean;
};

const SEARCH_DEBOUNCE_MS = 250;

export function FriendListLiveFilters({
  ancestries,
  associations,
  orders,
  totalCount,
  filteredCount,
  initialSearch,
  initialAncestry,
  initialAssociation,
  initialOrder,
  initialRelationship,
  initialScope,
  embedded,
}: FriendListLiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  const [search, setSearch] =
    useState(initialSearch);

  const ancestry =
    searchParams.get(
      "friendAncestry",
    ) ?? initialAncestry;

  const association =
    searchParams.get(
      "friendAssociation",
    ) ?? initialAssociation;

  const order =
    searchParams.get(
      "friendOrder",
    ) ?? initialOrder;

  const relationship =
    searchParams.get(
      "friendRelationship",
    ) ?? initialRelationship;

  const scope =
    searchParams.get(
      "friendScope",
    ) ?? initialScope;

  const currentSearch =
    searchParams.get(
      "friendSearch",
    ) ?? initialSearch;

  const hasActiveFilters =
    Boolean(
      currentSearch.trim() ||
      ancestry ||
      association ||
      order ||
      relationship ||
      scope,
    );

  const baseParams =
    useMemo(
      () =>
        new URLSearchParams(
          searchParams.toString(),
        ),
      [searchParams],
    );

  function replaceFilter(
    key: string,
    value: string,
  ) {
    const params =
      new URLSearchParams(
        baseParams.toString(),
      );

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (embedded) {
      params.set(
        "embedded",
        "1",
      );
    }

    const query =
      params.toString();

    router.replace(
      query
        ? `${pathname}?${query}`
        : pathname,
      {
        scroll: false,
      },
    );
  }

  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const trimmed =
      search.trim();

    if (
      trimmed ===
      currentSearch.trim()
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          replaceFilter(
            "friendSearch",
            trimmed,
          );
        },
        SEARCH_DEBOUNCE_MS,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    search,
    currentSearch,
  ]);

  function clearFilters() {
    const params =
      new URLSearchParams(
        baseParams.toString(),
      );

    params.delete(
      "friendSearch",
    );
    params.delete(
      "friendAncestry",
    );
    params.delete(
      "friendAssociation",
    );
    params.delete(
      "friendOrder",
    );
    params.delete(
      "friendRelationship",
    );
    params.delete(
      "friendScope",
    );

    if (embedded) {
      params.set(
        "embedded",
        "1",
      );
    }

    setSearch("");

    const query =
      params.toString();

    router.replace(
      query
        ? `${pathname}?${query}`
        : pathname,
      {
        scroll: false,
      },
    );
  }

  return (
    <section
      data-friend-list-filters="true"
      className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-4 sm:px-5"
    >
      <div
        className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_repeat(5,minmax(105px,125px))_90px] xl:items-end"
      >
        <label>
          <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8c704b))]">
            Search
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search friends..."
            autoComplete="off"
            className="mt-1.5 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none placeholder:text-[rgb(var(--sep-colour-665a4c))] focus:border-[rgb(var(--sep-colour-9a7543))]"
          />
        </label>

        <LiveFilterSelect
          label="Ancestry"
          value={ancestry}
          onChange={(value) =>
            replaceFilter(
              "friendAncestry",
              value,
            )
          }
        >
          <option value="">
            All Ancestries
          </option>

          {ancestries.map(
            (option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.name}
              </option>
            ),
          )}
        </LiveFilterSelect>

        <LiveFilterSelect
          label="Association"
          value={association}
          onChange={(value) =>
            replaceFilter(
              "friendAssociation",
              value,
            )
          }
        >
          <option value="">
            All Associations
          </option>

          {associations.map(
            (option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.name}
              </option>
            ),
          )}
        </LiveFilterSelect>

        <LiveFilterSelect
          label="Order"
          value={order}
          onChange={(value) =>
            replaceFilter(
              "friendOrder",
              value,
            )
          }
        >
          <option value="">
            All Orders
          </option>

          {orders.map(
            (option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.name}
              </option>
            ),
          )}
        </LiveFilterSelect>

        <LiveFilterSelect
          label="Relationship"
          value={relationship}
          onChange={(value) =>
            replaceFilter(
              "friendRelationship",
              value,
            )
          }
        >
          <option value="">
            All Relationships
          </option>
          <option value="friend">
            Friend
          </option>
          <option value="close_friend">
            Close Friend
          </option>
          <option value="family">
            Family
          </option>
          <option value="romance">
            Romance
          </option>
          <option value="lover">
            Lover
          </option>
          <option value="partner">
            Partner
          </option>
          <option value="spouse">
            Spouse
          </option>
        </LiveFilterSelect>

        <LiveFilterSelect
          label="Section"
          value={scope}
          onChange={(value) =>
            replaceFilter(
              "friendScope",
              value,
            )
          }
        >
          <option value="">
            In-Game & Off-Game
          </option>
          <option value="ingame">
            In-Game
          </option>
          <option value="offgame">
            Off-Game
          </option>
        </LiveFilterSelect>

        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="h-[38px] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:border-[rgb(var(--sep-colour-765937))] hover:text-[rgb(var(--sep-colour-d8bf91))] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <p className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-746450))]">
        Showing {filteredCount} of {totalCount} Friend List entr{totalCount === 1 ? "y" : "ies"}
      </p>
    </section>
  );
}

function LiveFilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8c704b))]">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-1.5 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none focus:border-[rgb(var(--sep-colour-9a7543))]"
      >
        {children}
      </select>
    </label>
  );
}
