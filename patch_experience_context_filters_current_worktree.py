from pathlib import Path

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}.")
    return text.replace(old, new, 1)

new_path = Path("components/admin/experience-context-panel.tsx")
if new_path.exists():
    raise SystemExit(
        "components/admin/experience-context-panel.tsx already exists."
    )

new_text = r'''"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { EXPERIENCE_RATINGS } from "@/lib/experience/experience-ratings";

type CharacterOption = {
  user_id: string;
  display_name: string | null;
  public_slug: string | null;
};

export function ExperienceContextPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const activeQuery = searchParams.get("query") ?? "";
  const activeRating = searchParams.get("rating") ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadCharacters() {
      setLoading(true);

      const supabase = createClient();
      const result = await supabase
        .from("characters")
        .select("user_id, display_name, public_slug")
        .eq("is_system", false)
        .order("display_name", { ascending: true });

      if (!cancelled) {
        setCharacters((result.data ?? []) as CharacterOption[]);
        setLoading(false);
      }
    }

    loadCharacters();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCharacters = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (!query) {
      return characters;
    }

    return characters.filter((character) =>
      [
        character.display_name ?? "",
        character.public_slug ?? "",
        character.user_id,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [characters, search]);

  function updateFilters(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    startTransition(() => {
      const next = params.toString();

      router.replace(
        next ? `${pathname}?${next}` : pathname,
        { scroll: false },
      );
    });
  }

  function filterByCharacter(character: CharacterOption) {
    updateFilters({
      query: character.display_name?.trim() || character.user_id,
    });
  }

  function filterByRating(rating: number) {
    const value = String(rating);

    updateFilters({
      rating: activeRating === value ? null : value,
    });
  }

  function clearCharacter() {
    updateFilters({ query: null });
  }

  return (
    <div
      data-sep-interaction-ignore="true"
      className="flex h-full min-h-0 flex-col [transform:none!important]"
    >
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-756957))]">
        Experience
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-c9b184))]">
        Find a player
      </h2>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search characters..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-a99b89))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-876a46))]"
      />

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-756957))]">
            Rating
          </p>

          {activeRating ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => updateFilters({ rating: null })}
              className="text-[9px] text-[rgb(var(--sep-colour-876a46))] transition-colors hover:text-[rgb(var(--sep-colour-b79c73))]"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {EXPERIENCE_RATINGS.map((rating) => {
            const active = activeRating === String(rating.value);

            return (
              <button
                key={rating.value}
                type="button"
                disabled={isPending}
                onClick={() => filterByRating(rating.value)}
                title={rating.label}
                aria-label={`Filter by ${rating.label}`}
                className={[
                  "flex aspect-square items-center justify-center border bg-[rgb(var(--sep-colour-100c09))] p-1 transition",
                  active
                    ? "border-[rgb(var(--sep-colour-a07945))] shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.12)]"
                    : "border-[rgb(var(--sep-colour-60482e))]/35 hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-876a46))]",
                ].join(" ")}
              >
                <img
                  src={rating.imageSrc}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-756957))]">
            Characters · {visibleCharacters.length}
          </p>

          {activeQuery ? (
            <button
              type="button"
              disabled={isPending}
              onClick={clearCharacter}
              className="text-[9px] text-[rgb(var(--sep-colour-876a46))] transition-colors hover:text-[rgb(var(--sep-colour-b79c73))]"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {loading ? (
            <p className="px-1 py-2 text-[10px] text-[rgb(var(--sep-colour-756957))]">
              Loading characters…
            </p>
          ) : visibleCharacters.length ? (
            visibleCharacters.map((character) => {
              const label =
                character.display_name?.trim() || "Unnamed character";

              const active =
                activeQuery.trim().toLocaleLowerCase() ===
                label.toLocaleLowerCase();

              return (
                <button
                  key={character.user_id}
                  type="button"
                  disabled={isPending}
                  onClick={() => filterByCharacter(character)}
                  className={[
                    "group flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition",
                    active
                      ? "border-[rgb(var(--sep-colour-876a46))] bg-[rgb(var(--sep-colour-21170f))]"
                      : "border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-765937))]/70 hover:bg-[rgb(var(--sep-colour-17110d))]",
                  ].join(" ")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-b79c73))] group-hover:text-[rgb(var(--sep-colour-c9b184))]">
                      {label}
                    </span>

                    {character.public_slug ? (
                      <span className="mt-0.5 block truncate text-[8px] text-[rgb(var(--sep-colour-665b4d))]">
                        {character.public_slug}
                      </span>
                    ) : null}
                  </span>

                  <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                    →
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-1 py-2 text-[10px] text-[rgb(var(--sep-colour-756957))]">
              No matching characters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
'''

files = {}

path = "app/(portal)/admin/experience/page.tsx"
text = read(path)
text = replace_once(
    text,
    '<div className="space-y-5">',
    '<div className="mx-auto w-full max-w-[1180px] space-y-5">',
    "Experience body width",
)
files[path] = text

path = "components/admin/experience-live-filters.tsx"
text = read(path)
text = replace_once(
    text,
    'className="grid gap-3 md:grid-cols-4 xl:grid-cols-6"',
    'className="grid gap-3 md:grid-cols-4 xl:grid-cols-5"',
    "Experience live filter grid",
)

old_status = '''        <div className="flex items-end">
          <div className="min-h-9 text-[10px] text-[rgb(var(--sep-colour-756957))]">
            {isPending
              ? "Updating…"
              : "Live"}
          </div>
        </div>
'''

if old_status not in text:
    raise SystemExit("Live filter status block not found.")

text = text.replace(old_status, "", 1)
files[path] = text

path = "components/portal/admin-context-panel.tsx"
text = read(path)

text = replace_once(
    text,
    'import { GatheringContextPanel } from "@/components/admin/gathering-context-panel";',
    'import { GatheringContextPanel } from "@/components/admin/gathering-context-panel";\nimport { ExperienceContextPanel } from "@/components/admin/experience-context-panel";',
    "Experience context import",
)

start_marker = '  if (mode === "experience") {'
end_marker = '  if (mode === "trophies") {'
start = text.find(start_marker)
end = text.find(end_marker, start)

if start == -1 or end == -1:
    raise SystemExit("Experience context block not found.")

replacement = '''  if (mode === "experience") {
    return (
      <ExperienceContextPanel />
    );
  }

'''

text = text[:start] + replacement + text[end:]
files[path] = text

new_path.parent.mkdir(parents=True, exist_ok=True)
new_path.write_text(new_text, encoding="utf-8")
print("✓", str(new_path))

for path, content in files.items():
    Path(path).write_text(content, encoding="utf-8")
    print("✓", path)

print("\nExperience context filters + narrower page installed.")
print("No SQL changes required.")
print("Run: npm run build")
