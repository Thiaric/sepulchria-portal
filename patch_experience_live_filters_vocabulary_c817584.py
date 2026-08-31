from pathlib import Path

BASE = "c817584"


def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root. Expected {BASE}.")
    return p.read_text(encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected 1 match, found {count}. Expected working tree from {BASE}."
        )
    return text.replace(old, new, 1)


new_path = Path("components/admin/experience-live-filters.tsx")
if new_path.exists():
    raise SystemExit(
        f"{new_path} already exists. Expected clean working tree from {BASE}."
    )

new_text = r'''"use client";

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
    "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none transition-colors focus:border-[rgb(var(--sep-colour-987344))] disabled:opacity-60";

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
          className="border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-cdb58e))] transition hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-a07945))] hover:bg-[rgb(var(--sep-colour-2b1d12))] hover:text-[rgb(var(--sep-colour-efd6a3))] disabled:cursor-wait disabled:opacity-55"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
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

        <div className="flex items-end">
          <div className="min-h-9 text-[10px] text-[rgb(var(--sep-colour-756957))]">
            {isPending ? "Updating…" : "Live"}
          </div>
        </div>
      </div>
    </section>
  );
}
'''

files = {}

path = "app/(portal)/admin/experience/page.tsx"
text = read(path)

text = replace_once(
    text,
    'import Link from "next/link";\n',
    'import Link from "next/link";\n\nimport { ExperienceLiveFilters } from "@/components/admin/experience-live-filters";\n',
    "Experience filters import",
)

old_form_start = '      <form className="grid gap-3 border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4 md:grid-cols-4 xl:grid-cols-6">'
old_form_end = '      </form>'
start = text.find(old_form_start)
if start == -1:
    raise SystemExit(f"Experience filter form start not found. Expected {BASE}.")
end = text.find(old_form_end, start)
if end == -1:
    raise SystemExit(f"Experience filter form end not found. Expected {BASE}.")
end += len(old_form_end)

replacement = '''      <ExperienceLiveFilters
        initialQuery={asSingle(params.query)}
        initialRating={String(ratingFilter || "")}
        initialFrom={from}
        initialTo={to}
      />'''
text = text[:start] + replacement + text[end:]

text = replace_once(
    text,
    '<div className="space-y-6">',
    '<div className="space-y-5">',
    "Experience page spacing",
)
text = replace_once(
    text,
    '<header className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-5">',
    '<header data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 [transform:none!important]">',
    "Experience header vocabulary",
)
text = replace_once(
    text,
    '''<p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8d775b))]">
              Admin · Experience
            </p>''',
    '''<p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-876a46))]">
              Player experience
            </p>''',
    "Experience header eyebrow",
)
text = replace_once(
    text,
    '              How Was Your Experience?',
    '              Satisfaction overview',
    "Experience page title",
)
text = replace_once(
    text,
    '              Satisfaction prompts shown to players when they leave Sepulchria, at most once every 7 days. Staff accounts are excluded.',
    '              Review how players are feeling over time, identify changes in satisfaction and read optional comments when more context is needed.',
    "Experience intro copy",
)
text = replace_once(
    text,
    'className="border border-[rgb(var(--sep-colour-5c4b35))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"',
    'className="border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-cdb58e))] transition hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-a07945))] hover:bg-[rgb(var(--sep-colour-2b1d12))] hover:text-[rgb(var(--sep-colour-efd6a3))]"',
    "Back to Admin vocabulary",
)

old_summary_class = 'className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4"'
summary_count = text.count(old_summary_class)
if summary_count < 6:
    raise SystemExit(
        f"Experience static boxes: expected at least 6 matches, found {summary_count}. Expected {BASE}."
    )
text = text.replace(
    old_summary_class,
    'data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]"',
)

text = text.replace(
    'text-[10px] uppercase tracking-[0.22em]',
    'text-[9px] tracking-[0.08em]',
)
text = text.replace(
    'text-[8px] uppercase tracking-[0.18em]',
    'text-[9px]',
)
text = text.replace(
    '<section className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">',
    '<section data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]">',
)
files[path] = text

path = "components/portal/admin-context-panel.tsx"
text = read(path)
old = '''  if (mode === "experience") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-806b50))]">
          Player experience
        </p>

        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
          Satisfaction overview
        </h2>

        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Review response rate, satisfaction distribution, individual player history and optional comments.
        </p>

        <div className="mt-4 space-y-2 text-[11px] text-[rgb(var(--sep-colour-b8aa96))]">
          <p>Use the filters to isolate a date range or rating.</p>
          <p>Staff accounts are excluded from voting and reporting.</p>
          <p>Skipped prompts still count toward prompt tracking.</p>
        </div>
      </div>
    );
  }'''
new = '''  if (mode === "experience") {
    return (
      <div
        data-sep-interaction-ignore="true"
        className="flex h-full min-h-0 flex-col [transform:none!important]"
      >
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Experience administration
        </p>

        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
          Read the signals
        </h2>

        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Watch satisfaction over time and use individual responses when you need more context.
        </p>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3 [transform:none!important]">
            <p className="text-[9px] text-[rgb(var(--sep-colour-a88658))]">
              Live filters
            </p>
            <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
              Search, rating and date filters update the page automatically.
            </p>
          </section>

          <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3 [transform:none!important]">
            <p className="text-[9px] text-[rgb(var(--sep-colour-a88658))]">
              Reading percentages
            </p>
            <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
              Face percentages use answered prompts only. Skips remain visible in response-rate tracking.
            </p>
          </section>

          <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3 [transform:none!important]">
            <p className="text-[9px] text-[rgb(var(--sep-colour-a88658))]">
              Player-only signal
            </p>
            <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
              Staff accounts are excluded from both voting and reporting.
            </p>
          </section>
        </div>
      </div>
    );
  }'''
text = replace_once(
    text,
    old,
    new,
    "Experience right sidebar vocabulary",
)
files[path] = text

# Write only after every matcher succeeds.
new_path.parent.mkdir(parents=True, exist_ok=True)
new_path.write_text(new_text, encoding="utf-8")
print("✓", str(new_path))

for path, text in files.items():
    Path(path).write_text(text, encoding="utf-8")
    print("✓", path)

print("\nc817584 Experience vocabulary + live filters installed.")
print("No SQL changes required.")
print("Run: npm run build")
