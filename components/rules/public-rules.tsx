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
  initialView?: "rules" | "glossary";
  embedded?: boolean;
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
  initialView = "rules",
  embedded = false,
}: PublicRulesProps) {
  const firstRule =
    data.rules[0] ?? null;

  const startInGlossary =
    initialView === "glossary";

  const [
    selectedRuleId,
    setSelectedRuleId,
  ] = useState<string | null>(
    startInGlossary
      ? null
      : (firstRule?.id ?? null),
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
  ] = useState(startInGlossary);

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

  function selectRule(
    rule: PublicRuleEntry,
  ) {
    setSelectedRuleId(rule.id);
    setGlossaryOpen(false);
  }

  return (
    <main
      className={[(([
        "bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d7c5a7))]",
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "min-h-screen",
      ].join(" "))), "components_rules_public_rules_main_main"].filter(Boolean).join(" ")}
    >
      <header className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0f0b09))] components_rules_public_rules_header_header">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:gap-5 components_rules_public_rules_div_container">
          <div className="components_rules_public_rules_div_rules">
            <p className="text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8f714a))] components_rules_public_rules_p_rules">
              Sepulchria · Offgame
            </p>

            <h1 className="mt-1 font-serif text-3xl leading-none text-[rgb(var(--sep-colour-ead5ac))] components_rules_public_rules_h1_rules">
              Rules
            </h1>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-3xl lg:flex-row components_rules_public_rules_div_container_2">
            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder={
                glossaryOpen
                  ? "Search glossary..."
                  : "Search rules..."
              }
              className="h-9 min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 text-xs text-[rgb(var(--sep-colour-d6c3a3))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-9a7445))] components_rules_public_rules_input_field"
            />

            <button
              type="button"
              onClick={() => {
                setGlossaryOpen(true);
                setSelectedRuleId(null);
              }}
              className={[((`h-9 shrink-0 border px-4 text-[8px] uppercase tracking-[0.18em] transition ${
                glossaryOpen
                  ? "border-[rgb(var(--sep-colour-9a7445))] bg-[rgb(var(--sep-colour-302115))] text-[rgb(var(--sep-colour-e7c996))]"
                  : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-9f8d71))] hover:border-[rgb(var(--sep-colour-8c693e))] hover:text-[rgb(var(--sep-colour-d6b782))]"
              }`)), "components_rules_public_rules_button_glossary"].filter(Boolean).join(" ")}
            >
              Glossary
            </button>
          </div>
        </div>
      </header>

      {!glossaryOpen ? (
        <nav className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] components_rules_public_rules_nav_navigation">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-2 sm:px-6 components_rules_public_rules_div_container_3">
            <CategoryButton
              active={
                selectedCategoryId ===
                "all"
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
      ) : null}

      <div
        className={[(([
          "mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6",
          glossaryOpen
            ? ""
            : "lg:grid-cols-[280px_minmax(0,1fr)]",
          embedded
            ? "min-h-0 flex-1 overflow-hidden"
            : "",
        ].join(" "))), "components_rules_public_rules_div_container_4"].filter(Boolean).join(" ")}
      >
        {!glossaryOpen ? (
          <aside
            className={[(([
              "min-w-0 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))]",
              embedded
                ? "flex min-h-0 flex-col overflow-hidden"
                : "",
            ].join(" "))), "components_rules_public_rules_aside_sidebar"].filter(Boolean).join(" ")}
          >
            <div className="flex h-9 items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/35 px-3 components_rules_public_rules_div_container_5">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-816a4d))] components_rules_public_rules_p_text">
                Rule index
              </p>

              <span className="text-[9px] text-[rgb(var(--sep-colour-756958))] components_rules_public_rules_span_text">
                {visibleRules.length}
              </span>
            </div>

            <div
              className={[((embedded
                  ? "min-h-0 flex-1 overflow-y-auto p-2"
                  : "max-h-[calc(100vh-190px)] overflow-y-auto p-2")), "components_rules_public_rules_div_container_6"].filter(Boolean).join(" ")}
            >
              {visibleRules.length ===
              0 ? (
                <p className="p-3 text-xs leading-5 text-[rgb(var(--sep-colour-766b5d))] components_rules_public_rules_p_text_2">
                  No matching published
                  rules.
                </p>
              ) : (
                <div className="space-y-1 components_rules_public_rules_div_container_7">
                  {visibleRules.map(
                    (rule) => (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() =>
                          selectRule(rule)
                        }
                        className={[((`w-full border px-3 py-2.5 text-left transition ${
                          selectedRule?.id ===
                          rule.id
                            ? "border-[rgb(var(--sep-colour-8d693e))] bg-[rgb(var(--sep-colour-2a1d12))]"
                            : "border-transparent bg-[rgb(var(--sep-colour-100c09))]/55 hover:border-[rgb(var(--sep-colour-59432c))]/55 hover:bg-[rgb(var(--sep-colour-19120d))]"
                        }`)), "components_rules_public_rules_button_action"].filter(Boolean).join(" ")}
                      >
                        <span className="block font-serif text-sm text-[rgb(var(--sep-colour-d0b78e))] components_rules_public_rules_span_text_2">
                          {rule.title}
                        </span>

                        {rule.summary ? (
                          <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-[rgb(var(--sep-colour-817565))] components_rules_public_rules_span_text_3">
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
        ) : null}

        <section
          className={[(([
            "min-w-0 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))]",
            embedded
              ? "min-h-0 overflow-y-auto"
              : "",
          ].join(" "))), "components_rules_public_rules_section_section"].filter(Boolean).join(" ")}
        >
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
            <div className="p-8 text-center text-sm text-[rgb(var(--sep-colour-7d7161))] components_rules_public_rules_div_container_8">
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
      className={[((`border px-2.5 py-1.5 text-[8px] uppercase tracking-[0.13em] transition ${
        active
          ? "border-[rgb(var(--sep-colour-8c693e))] bg-[rgb(var(--sep-colour-2a1d12))] text-[rgb(var(--sep-colour-dfc28f))]"
          : "border-[rgb(var(--sep-colour-4f3b28))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-776a58))] hover:border-[rgb(var(--sep-colour-765937))] hover:text-[rgb(var(--sep-colour-bca47e))]"
      }`)), "components_rules_public_rules_button_click"].filter(Boolean).join(" ")}
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
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 sm:px-7 components_rules_public_rules_header_header_2">
        <p className="text-[7px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8d6f48))] components_rules_public_rules_p_text_3">
          Official rule
        </p>

        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99c))] components_rules_public_rules_h2_heading">
          {rule.title}
        </h2>

        {rule.summary ? (
          <RichTextContentClient
            body={rule.summary}
            className="mt-2 text-xs leading-6 text-[rgb(var(--sep-colour-9e8e78))] [&_p]:m-0"
          />
        ) : null}
      </header>

      <div className="px-5 py-5 sm:px-7 components_rules_public_rules_div_container_9">
        <RichTextContentClient
          body={rule.body}
          className="mx-auto max-w-5xl text-sm leading-7 text-[rgb(var(--sep-colour-b9a991))] [&_h1]:mt-7 [&_h1]:text-3xl [&_h2]:mt-6 [&_h2]:text-2xl [&_h3]:mt-5 [&_h3]:text-xl [&_p]:mb-4"
        />

        {relatedRules.length >
        0 ? (
          <div className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4 components_rules_public_rules_div_container_10">
            <p className="mb-2 text-[8px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-79664c))] components_rules_public_rules_p_text_4">
              Related rules
            </p>

            <div className="flex flex-wrap gap-2 components_rules_public_rules_div_container_11">
              {relatedRules.map(
                ({
                  label,
                  rule,
                }) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() =>
                      onSelectRule(rule)
                    }
                    className="border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-b59e78))] transition hover:border-[rgb(var(--sep-colour-8c693e))] hover:text-[rgb(var(--sep-colour-e2c58f))] components_rules_public_rules_button_action_2"
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

  const entries =
    data.glossary.filter(
      (entry) => {
        if (!normalized) {
          return true;
        }

        return (
          entry.term
            .toLowerCase()
            .includes(normalized) ||
          stripHtml(
            entry.definition,
          )
            .toLowerCase()
            .includes(normalized)
        );
      },
    );

  return (
    <>
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 sm:px-7 components_rules_public_rules_header_glossary">
        <p className="text-[7px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8d6f48))] components_rules_public_rules_p_glossary">
          Reference
        </p>

        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99c))] components_rules_public_rules_h2_glossary">
          Glossary
        </h2>

        <p className="mt-2 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-colour-8d806e))] components_rules_public_rules_p_glossary_2">
          A quick reference for terms
          used throughout Sepulchria.
          Where available, use the
          related rule link to see the
          term in its wider gameplay
          context.
        </p>
      </header>

      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-5 components_rules_public_rules_div_container_12">
        {entries.length === 0 ? (
          <p className="p-3 text-xs text-[rgb(var(--sep-colour-766b5d))] components_rules_public_rules_p_text_5">
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
                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]/70 p-4 components_rules_public_rules_article_article"
              >
                <h3 className="font-serif text-lg text-[rgb(var(--sep-colour-d2b98e))] components_rules_public_rules_h3_heading">
                  {entry.term}
                </h3>

                <RichTextContentClient
                  body={
                    entry.definition
                  }
                  className="mt-2 text-xs leading-6 text-[rgb(var(--sep-colour-948674))] [&_p]:m-0"
                />

                {relatedRule ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectRule(
                        relatedRule,
                      )
                    }
                    className="mt-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9a7547))] hover:text-[rgb(var(--sep-colour-dfbd84))] components_rules_public_rules_button_related_rule"
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