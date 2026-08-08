"use client";

import {
  useMemo,
  useState,
} from "react";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import type {
  PublicRulesData,
  PublicRuleEntry,
} from "@/lib/rules/get-public-rules";

type PublicRulesProps = {
  data: PublicRulesData;
};

function stripHtml(value: string) {
  if (typeof document === "undefined") {
    return value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const container =
    document.createElement("div");

  container.innerHTML = value;

  return (
    container.textContent ??
    container.innerText ??
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function PublicRules({
  data,
}: PublicRulesProps) {
  const firstRule =
    data.rules[0] ?? null;

  const [
    selectedRuleId,
    setSelectedRuleId,
  ] = useState<string | null>(
    firstRule?.id ?? null,
  );

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<string>("all");

  const [query, setQuery] =
    useState("");

  const [
    glossaryOpen,
    setGlossaryOpen,
  ] = useState(false);

  const selectedRule =
    data.rules.find(
      (rule) =>
        rule.id === selectedRuleId,
    ) ??
    data.rules[0] ??
    null;

  const normalizedQuery =
    query.trim().toLowerCase();

  const visibleRules = useMemo(() => {
    return data.rules.filter((rule) => {
      if (
        selectedCategoryId !== "all" &&
        rule.category_id !==
          selectedCategoryId
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        rule.title,
        rule.summary ?? "",
        stripHtml(rule.body),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(
        normalizedQuery,
      );
    });
  }, [
    data.rules,
    normalizedQuery,
    selectedCategoryId,
  ]);

  const relatedRules = useMemo(() => {
    if (!selectedRule) {
      return [];
    }

    const relatedIds = data.links
      .filter(
        (link) =>
          link.source_rule_id ===
          selectedRule.id,
      )
      .map((link) => ({
        ...link,
        rule: data.rules.find(
          (candidate) =>
            candidate.id ===
            link.target_rule_id,
        ),
      }))
      .filter(
        (
          item,
        ): item is typeof item & {
          rule: PublicRuleEntry;
        } => Boolean(item.rule),
      );

    return relatedIds;
  }, [
    data.links,
    data.rules,
    selectedRule,
  ]);

  function selectRule(rule: PublicRuleEntry) {
    setSelectedRuleId(rule.id);
    setGlossaryOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#090705] text-[#d7c5a7]">
      <header className="border-b border-[#60482e]/40 bg-[#0f0b09]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:gap-5">
          <div>
            <p className="text-[7px] uppercase tracking-[0.28em] text-[#8f714a]">
              Sepulchria · Offgame
            </p>

            <h1 className="mt-1 font-serif text-3xl leading-none text-[#ead5ac]">
              Rules
            </h1>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-3xl lg:flex-row">
            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search rules..."
              className="h-9 min-w-0 flex-1 border border-[#60482e]/45 bg-[#15100d] px-3 text-xs text-[#d6c3a3] outline-none placeholder:text-[#655c50] focus:border-[#9a7445]"
            />

            <button
              type="button"
              onClick={() => {
                setGlossaryOpen(true);
                setSelectedRuleId(null);
              }}
              className={`h-9 shrink-0 border px-4 text-[8px] uppercase tracking-[0.18em] transition ${
                glossaryOpen
                  ? "border-[#9a7445] bg-[#302115] text-[#e7c996]"
                  : "border-[#60482e]/45 bg-[#15100d] text-[#9f8d71] hover:border-[#8c693e] hover:text-[#d6b782]"
              }`}
            >
              Glossary
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-[#60482e]/35 bg-[#100c09]">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-2 sm:px-6">
          <CategoryButton
            active={
              selectedCategoryId === "all"
            }
            label="All"
            onClick={() =>
              setSelectedCategoryId(
                "all",
              )
            }
          />

          {data.categories.map(
            (category) => (
              <CategoryButton
                key={category.id}
                active={
                  selectedCategoryId ===
                  category.id
                }
                label={category.name}
                onClick={() =>
                  setSelectedCategoryId(
                    category.id,
                  )
                }
              />
            ),
          )}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 border border-[#60482e]/40 bg-[#120e0b]">
          <div className="flex h-9 items-center justify-between border-b border-[#60482e]/35 px-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[#816a4d]">
              Rule index
            </p>

            <span className="text-[9px] text-[#756958]">
              {visibleRules.length}
            </span>
          </div>

          <div className="max-h-[calc(100vh-190px)] overflow-y-auto p-2">
            {visibleRules.length === 0 ? (
              <p className="p-3 text-xs leading-5 text-[#766b5d]">
                No matching published
                rules.
              </p>
            ) : (
              <div className="space-y-1">
                {visibleRules.map(
                  (rule) => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() =>
                        selectRule(rule)
                      }
                      className={`w-full border px-3 py-2.5 text-left transition ${
                        selectedRule?.id ===
                          rule.id &&
                        !glossaryOpen
                          ? "border-[#8d693e] bg-[#2a1d12]"
                          : "border-transparent bg-[#100c09]/55 hover:border-[#59432c]/55 hover:bg-[#19120d]"
                      }`}
                    >
                      <span className="block font-serif text-sm text-[#d0b78e]">
                        {rule.title}
                      </span>

                      {rule.summary ? (
                        <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-[#817565]">
                          {stripHtml(
                            rule.summary,
                          )}
                        </span>
                      ) : null}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 border border-[#60482e]/40 bg-[#120e0b]">
          {glossaryOpen ? (
            <GlossaryPanel
              data={data}
              query={query}
              onSelectRule={
                selectRule
              }
            />
          ) : selectedRule ? (
            <RulePanel
              rule={selectedRule}
              relatedRules={
                relatedRules
              }
              onSelectRule={
                selectRule
              }
            />
          ) : (
            <div className="p-8 text-center text-sm text-[#7d7161]">
              Select a rule from the
              index.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CategoryButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2.5 py-1.5 text-[8px] uppercase tracking-[0.13em] transition ${
        active
          ? "border-[#8c693e] bg-[#2a1d12] text-[#dfc28f]"
          : "border-[#4f3b28]/45 bg-[#15100d] text-[#776a58] hover:border-[#765937] hover:text-[#bca47e]"
      }`}
    >
      {label}
    </button>
  );
}

function RulePanel({
  rule,
  relatedRules,
  onSelectRule,
}: {
  rule: PublicRuleEntry;
  relatedRules: Array<{
    label: string | null;
    rule: PublicRuleEntry;
  }>;
  onSelectRule: (
    rule: PublicRuleEntry,
  ) => void;
}) {
  return (
    <>
      <header className="border-b border-[#60482e]/35 px-5 py-4 sm:px-7">
        <p className="text-[7px] uppercase tracking-[0.24em] text-[#8d6f48]">
          Official rule
        </p>

        <h2 className="mt-1 font-serif text-2xl text-[#e2c99c]">
          {rule.title}
        </h2>

        {rule.summary ? (
          <RichTextContentClient
            body={rule.summary}
            className="mt-2 text-xs leading-6 text-[#9e8e78] [&_p]:m-0"
          />
        ) : null}
      </header>

      <div className="px-5 py-5 sm:px-7">
        <RichTextContentClient
          body={rule.body}
          className="mx-auto max-w-5xl text-sm leading-7 text-[#b9a991] [&_h1]:mt-7 [&_h1]:text-3xl [&_h2]:mt-6 [&_h2]:text-2xl [&_h3]:mt-5 [&_h3]:text-xl [&_p]:mb-4"
        />

        {relatedRules.length > 0 ? (
          <div className="mt-6 border-t border-[#60482e]/30 pt-4">
            <p className="mb-2 text-[8px] uppercase tracking-[0.19em] text-[#79664c]">
              Related rules
            </p>

            <div className="flex flex-wrap gap-2">
              {relatedRules.map(
                ({ label, rule }) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() =>
                      onSelectRule(rule)
                    }
                    className="border border-[#59432c]/50 bg-[#17110d] px-3 py-2 text-xs text-[#b59e78] transition hover:border-[#8c693e] hover:text-[#e2c58f]"
                  >
                    {label ??
                      rule.title}
                  </button>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function GlossaryPanel({
  data,
  query,
  onSelectRule,
}: {
  data: PublicRulesData;
  query: string;
  onSelectRule: (
    rule: PublicRuleEntry,
  ) => void;
}) {
  const normalized =
    query.trim().toLowerCase();

  const entries = data.glossary.filter(
    (entry) => {
      if (!normalized) {
        return true;
      }

      return (
        entry.term
          .toLowerCase()
          .includes(normalized) ||
        stripHtml(entry.definition)
          .toLowerCase()
          .includes(normalized)
      );
    },
  );

  return (
    <>
      <header className="border-b border-[#60482e]/35 px-5 py-4 sm:px-7">
        <p className="text-[7px] uppercase tracking-[0.24em] text-[#8d6f48]">
          Reference
        </p>
        <h2 className="mt-1 font-serif text-2xl text-[#e2c99c]">
          Glossary
        </h2>
      </header>

      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-5">
        {entries.length === 0 ? (
          <p className="p-3 text-xs text-[#766b5d]">
            No matching glossary
            entries.
          </p>
        ) : (
          entries.map((entry) => {
            const relatedRule =
              entry.related_rule_id
                ? data.rules.find(
                    (rule) =>
                      rule.id ===
                      entry.related_rule_id,
                  )
                : null;

            return (
              <article
                key={entry.id}
                className="border border-[#59432c]/40 bg-[#100c09]/70 p-4"
              >
                <h3 className="font-serif text-lg text-[#d2b98e]">
                  {entry.term}
                </h3>

                <RichTextContentClient
                  body={
                    entry.definition
                  }
                  className="mt-2 text-xs leading-6 text-[#948674] [&_p]:m-0"
                />

                {relatedRule ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectRule(
                        relatedRule,
                      )
                    }
                    className="mt-3 text-[8px] uppercase tracking-[0.15em] text-[#9a7547] hover:text-[#dfbd84]"
                  >
                    Related rule →
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
