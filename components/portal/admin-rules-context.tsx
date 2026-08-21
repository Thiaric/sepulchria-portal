"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type RuleEntry = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
};

type GlossaryEntry = {
  id: string;
  term: string;
  slug: string;
  status: "draft" | "published";
};

export function AdminRulesContext() {
  const [rules, setRules] =
    useState<RuleEntry[]>([]);
  const [glossary, setGlossary] =
    useState<GlossaryEntry[]>([]);
  const [ruleSearch, setRuleSearch] =
    useState("");
  const [glossarySearch, setGlossarySearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      const supabase = createClient();

      const [rulesResult, glossaryResult] =
        await Promise.all([
          supabase
            .from("rule_entries")
            .select("id, title, slug, status, sort_order")
            .order("sort_order", { ascending: true })
            .order("title", { ascending: true }),
          supabase
            .from("rule_glossary")
            .select("id, term, slug, status, sort_order")
            .order("sort_order", { ascending: true })
            .order("term", { ascending: true }),
        ]);

      if (cancelled) {
        return;
      }

      const loadError =
        rulesResult.error ??
        glossaryResult.error;

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      setRules(
        (rulesResult.data ?? []).map((entry) => ({
          id: String(entry.id),
          title: String(entry.title),
          slug: String(entry.slug),
          status:
            entry.status === "published"
              ? "published"
              : "draft",
        })),
      );

      setGlossary(
        (glossaryResult.data ?? []).map((entry) => ({
          id: String(entry.id),
          term: String(entry.term),
          slug: String(entry.slug),
          status:
            entry.status === "published"
              ? "published"
              : "draft",
        })),
      );

      setError(null);
      setLoading(false);
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRules = useMemo(() => {
    const query =
      ruleSearch.trim().toLocaleLowerCase();

    if (!query) {
      return rules;
    }

    return rules.filter((entry) =>
      `${entry.title} ${entry.status}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [ruleSearch, rules]);

  const filteredGlossary = useMemo(() => {
    const query =
      glossarySearch.trim().toLocaleLowerCase();

    if (!query) {
      return glossary;
    }

    return glossary.filter((entry) =>
      `${entry.term} ${entry.status}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [glossary, glossarySearch]);

  function jumpTo(anchor: string) {
    const element =
      document.getElementById(anchor);

    if (!element) {
      return;
    }

    if (element instanceof HTMLDetailsElement) {
      element.open = true;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#${anchor}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-4">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4b))]">
          Rules management
        </p>

        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d9c29a))]">
          Rules & Glossary
        </h2>

        <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Search the existing entries and jump directly to the editor.
        </p>
      </div>

      {error ? (
        <p className="mt-4 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The Rules navigator could not be loaded.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <NavigatorSection
          title="Rules"
          count={rules.length}
          search={ruleSearch}
          onSearch={setRuleSearch}
          placeholder="Search rules…"
          loading={loading}
        >
          {!loading && filteredRules.length === 0 ? (
            <EmptyResult>
              No rules match your search.
            </EmptyResult>
          ) : null}

          {filteredRules.map((rule) => (
            <JumpButton
              key={rule.id}
              label={rule.title}
              status={rule.status}
              onClick={() =>
                jumpTo(`rule-${rule.slug}`)
              }
            />
          ))}
        </NavigatorSection>

        <NavigatorSection
          title="Glossary"
          count={glossary.length}
          search={glossarySearch}
          onSearch={setGlossarySearch}
          placeholder="Search glossary…"
          loading={loading}
        >
          {!loading && filteredGlossary.length === 0 ? (
            <EmptyResult>
              No glossary entries match your search.
            </EmptyResult>
          ) : null}

          {filteredGlossary.map((entry) => (
            <JumpButton
              key={entry.id}
              label={entry.term}
              status={entry.status}
              onClick={() =>
                jumpTo(`glossary-${entry.slug}`)
              }
            />
          ))}
        </NavigatorSection>
      </div>
    </div>
  );
}

function NavigatorSection({
  title,
  count,
  search,
  onSearch,
  placeholder,
  loading,
  children,
}: {
  title: string;
  count: number;
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[rgb(var(--sep-colour-60482e))]/30 py-4 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-serif text-sm text-[rgb(var(--sep-colour-ccb58e))]">
          {title}
        </h3>

        <span className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2 py-0.5 text-[8px] text-[rgb(var(--sep-colour-8d795e))]">
          {count}
        </span>
      </div>

      <label className="relative block">
        <span className="sr-only">
          {placeholder}
        </span>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[rgb(var(--sep-colour-75644e))]"
        >
          ⌕
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            onSearch(event.target.value)
          }
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] py-2 pl-7 pr-7 text-[10px] text-[rgb(var(--sep-colour-d1b991))] outline-none placeholder:text-[rgb(var(--sep-colour-62584b))] focus:border-[rgb(var(--sep-colour-8d693e))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />

        {search ? (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[10px] text-[rgb(var(--sep-colour-75644e))] hover:text-[rgb(var(--sep-colour-d4ba8e))]"
          >
            ×
          </button>
        ) : null}
      </label>

      <div className="mt-2 space-y-1.5">
        {loading ? (
          <>
            <LoadingRow />
            <LoadingRow />
            <LoadingRow />
          </>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function JumpButton({
  label,
  status,
  onClick,
}: {
  label: string;
  status: "draft" | "published";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
    >
      <span className="min-w-0 truncate text-[10px] text-[rgb(var(--sep-colour-bca783))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
        {label}
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className={`text-[6px] uppercase tracking-[0.12em] ${
            status === "published"
              ? "text-[rgb(var(--sep-colour-7f9a68))]"
              : "text-[rgb(var(--sep-colour-927a59))]"
          }`}
        >
          {status}
        </span>

        <span
          aria-hidden="true"
          className="text-[9px] text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-y-0.5 group-hover:text-[rgb(var(--sep-colour-b88a52))]"
        >
          ↓
        </span>
      </span>
    </button>
  );
}

function LoadingRow() {
  return (
    <div className="h-9 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/25 bg-[rgb(var(--sep-colour-17110d))]" />
  );
}

function EmptyResult({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="border border-[rgb(var(--sep-colour-59432c))]/25 bg-[rgb(var(--sep-colour-100c09))]/60 p-2.5 text-[10px] leading-4 text-[rgb(var(--sep-colour-776b5b))]">
      {children}
    </p>
  );
}
