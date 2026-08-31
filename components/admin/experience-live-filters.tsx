"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  EXPERIENCE_RATINGS,
} from "@/lib/experience/experience-ratings";

type Props = {
  initialQuery: string;
  initialRating: string;
  initialFrom: string;
  initialTo: string;
};

export function ExperienceLiveFilters({
  initialQuery,
  initialRating,
  initialFrom,
  initialTo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] =
    useState(initialQuery);
  const [rating, setRating] =
    useState(initialRating);
  const [from, setFrom] =
    useState(initialFrom);
  const [to, setTo] =
    useState(initialTo);

  const [isPending, startTransition] =
    useTransition();

  const hydratedRef = useRef(false);

  function updateUrl(values: {
    query: string;
    rating: string;
    from: string;
    to: string;
  }) {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    for (const [key, value] of Object.entries(values)) {
      if (value.trim()) {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }
    }

    const next = params.toString();

    startTransition(() => {
      router.replace(
        next
          ? `${pathname}?${next}`
          : pathname,
        {
          scroll: false,
        },
      );
    });
  }

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      updateUrl({
        query,
        rating,
        from,
        to,
      });
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    updateUrl({
      query,
      rating,
      from,
      to,
    });
  }, [rating, from, to]);

  function reset() {
    setQuery("");
    setRating("");
    setFrom("");
    setTo("");

    startTransition(() => {
      router.replace(
        "/admin/experience",
        {
          scroll: false,
        },
      );
    });
  }

  const inputClass =
    "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-a99b89))] outline-none transition-colors focus:border-[rgb(var(--sep-colour-987344))] disabled:opacity-60";

  return (
    <section
      data-sep-interaction-ignore="true"
      className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-876a46))]">
            Filter responses
          </p>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            Results update automatically as you change the filters.
          </p>
        </div>

        <button
          type="button"
          onClick={reset}
          disabled={isPending}
          className="border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1.5 text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-a99b89))] transition hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-a07945))] hover:bg-[rgb(var(--sep-colour-2b1d12))] hover:text-[rgb(var(--sep-colour-c9b184))] disabled:cursor-wait disabled:opacity-55"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
        <label className="md:col-span-2 xl:col-span-2">
          <span className="mb-1.5 block text-[9px] text-[rgb(var(--sep-colour-806b50))]">
            Search user or comment
          </span>
          <input
            type="search"
            value={query}
            disabled={isPending}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Character, slug, user ID, comment..."
            className={inputClass}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-[9px] text-[rgb(var(--sep-colour-806b50))]">
            Rating
          </span>
          <select
            value={rating}
            disabled={isPending}
            onChange={(event) =>
              setRating(event.target.value)
            }
            className={inputClass}
          >
            <option value="">All ratings</option>
            {EXPERIENCE_RATINGS.map((entry) => (
              <option
                key={entry.value}
                value={entry.value}
              >
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-[9px] text-[rgb(var(--sep-colour-806b50))]">
            From
          </span>
          <input
            type="date"
            value={from}
            disabled={isPending}
            onChange={(event) =>
              setFrom(event.target.value)
            }
            className={inputClass}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-[9px] text-[rgb(var(--sep-colour-806b50))]">
            To
          </span>
          <input
            type="date"
            value={to}
            disabled={isPending}
            onChange={(event) =>
              setTo(event.target.value)
            }
            className={inputClass}
          />
        </label>

      </div>
    </section>
  );
}
