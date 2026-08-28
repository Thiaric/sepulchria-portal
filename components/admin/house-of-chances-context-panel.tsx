"use client";

import { useEffect, useMemo, useState } from "react";

type RuleEntry = {
  id: string;
  name: string;
  matchType: string;
  priority: string;
  roll1Min: string;
  roll1Max: string;
  roll2Min: string;
  roll2Max: string;
  roll3Min: string;
  roll3Max: string;
  totalMin: string;
  totalMax: string;
};

type PlayEntry = {
  id: string;
  character: string;
  rule: string;
  date: string;
  roll1: string;
  roll2: string;
  roll3: string;
};

const searchClass =
  "w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]";

function jumpTo(id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  const previousOutline = target.style.outline;
  const previousOffset = target.style.outlineOffset;

  target.style.outline =
    "1px solid rgb(var(--sep-colour-987344))";
  target.style.outlineOffset = "3px";

  window.setTimeout(() => {
    target.style.outline = previousOutline;
    target.style.outlineOffset = previousOffset;
  }, 1200);
}

function readRules(): RuleEntry[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-house-rule-id]"),
  ).map((node) => ({
    id: node.dataset.houseRuleId ?? "",
    name: node.dataset.houseRuleName ?? "",
    matchType: node.dataset.houseRuleMatchType ?? "",
    priority: node.dataset.houseRulePriority ?? "",
    roll1Min: node.getAttribute("data-house-rule-roll-1-min") ?? "",
    roll1Max: node.getAttribute("data-house-rule-roll-1-max") ?? "",
    roll2Min: node.getAttribute("data-house-rule-roll-2-min") ?? "",
    roll2Max: node.getAttribute("data-house-rule-roll-2-max") ?? "",
    roll3Min: node.getAttribute("data-house-rule-roll-3-min") ?? "",
    roll3Max: node.getAttribute("data-house-rule-roll-3-max") ?? "",
    totalMin: node.dataset.houseRuleTotalMin ?? "",
    totalMax: node.dataset.houseRuleTotalMax ?? "",
  }));
}

function readPlays(): PlayEntry[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-house-play-id]"),
  ).map((node) => ({
    id: node.dataset.housePlayId ?? "",
    character: node.dataset.housePlayCharacter ?? "",
    rule: node.dataset.housePlayRule ?? "",
    date: node.dataset.housePlayDate ?? "",
    roll1: node.getAttribute("data-house-play-roll-1") ?? "",
    roll2: node.getAttribute("data-house-play-roll-2") ?? "",
    roll3: node.getAttribute("data-house-play-roll-3") ?? "",
  }));
}

function conditionTokens(rule: RuleEntry) {
  switch (rule.matchType) {
    case "exact":
      return [
        rule.roll1Min || "—",
        rule.roll2Min || "—",
        rule.roll3Min || "—",
      ];

    case "all_equal": {
      const range =
        rule.roll1Min || rule.roll1Max
          ? `${rule.roll1Min || "1"}–${rule.roll1Max || "100"}`
          : "1–100";
      return ["=", range];
    }

    case "all_in_range":
      return [
        `${rule.roll1Min || "1"}–${rule.roll1Max || "100"}`,
        "×3",
      ];

    case "total_range":
      return [
        `Σ ${rule.totalMin || "3"}–${rule.totalMax || "300"}`,
      ];

    case "ordered_ranges":
      return [
        `1: ${rule.roll1Min || "—"}–${rule.roll1Max || "—"}`,
        `2: ${rule.roll2Min || "—"}–${rule.roll2Max || "—"}`,
        `3: ${rule.roll3Min || "—"}–${rule.roll3Max || "—"}`,
      ];

    default:
      return [rule.matchType || "Rule"];
  }
}

export function HouseOfChancesContextPanel() {
  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [plays, setPlays] = useState<PlayEntry[]>([]);
  const [ruleSearch, setRuleSearch] = useState("");
  const [playSearch, setPlaySearch] = useState("");

  useEffect(() => {
    let frame = 0;

    const read = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setRules(readRules());
        setPlays(readPlays());
      });
    };

    read();

    const observer = new MutationObserver(read);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const ruleQuery = ruleSearch.trim().toLocaleLowerCase();
  const playQuery = playSearch.trim().toLocaleLowerCase();

  const visibleRules = useMemo(
    () =>
      rules.filter((rule) => {
        if (!ruleQuery) return true;

        return [
          rule.name,
          rule.matchType,
          rule.priority,
          rule.roll1Min,
          rule.roll1Max,
          rule.roll2Min,
          rule.roll2Max,
          rule.roll3Min,
          rule.roll3Max,
          rule.totalMin,
          rule.totalMax,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(ruleQuery);
      }),
    [rules, ruleQuery],
  );

  const visiblePlays = useMemo(
    () =>
      plays.filter((play) => {
        if (!playQuery) return true;

        return [
          play.character,
          play.rule,
          play.date,
          play.roll1,
          play.roll2,
          play.roll3,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(playQuery);
      }),
    [plays, playQuery],
  );

  return (
    <div className="grid h-full min-h-0 grid-rows-2 gap-4">
      <section className="flex min-h-0 flex-col">
        <div className="shrink-0">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
            Prize rules
          </p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
            Jump to Rule
          </h2>

          <input
            type="search"
            value={ruleSearch}
            onChange={(event) => setRuleSearch(event.target.value)}
            placeholder="Search rules or numbers..."
            className={`${searchClass} mt-3`}
          />

          <p className="mb-2 mt-3 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Rules · {visibleRules.length}
            {ruleQuery ? ` / ${rules.length}` : ""}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {visibleRules.length ? (
            visibleRules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                onClick={() =>
                  jumpTo(`house-of-chances-rule-${rule.id}`)
                }
                className="group w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {rule.name}
                  </span>

                  <span className="shrink-0 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-725a3d))]">
                    P{rule.priority}
                  </span>
                </span>

                <span className="mt-2 flex flex-wrap gap-1">
                  {conditionTokens(rule).map((token, index) => (
                    <span
                      key={`${rule.id}-${token}-${index}`}
                      className="border border-[rgb(var(--sep-colour-765735))]/55 bg-[rgb(var(--sep-colour-17110d))] px-1.5 py-0.5 font-mono text-[8px] text-[rgb(var(--sep-colour-c7aa7b))]"
                    >
                      {token}
                    </span>
                  ))}
                </span>
              </button>
            ))
          ) : (
            <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
              No matching rules.
            </p>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">
        <div className="shrink-0">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
            Recent plays
          </p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
            Find a Play
          </h2>

          <input
            type="search"
            value={playSearch}
            onChange={(event) => setPlaySearch(event.target.value)}
            placeholder="Name, rule or date..."
            className={`${searchClass} mt-3`}
          />

          <p className="mb-2 mt-3 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Plays · {visiblePlays.length}
            {playQuery ? ` / ${plays.length}` : ""}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {visiblePlays.length ? (
            visiblePlays.map((play) => (
              <button
                key={play.id}
                type="button"
                onClick={() =>
                  jumpTo(`house-of-chances-play-${play.id}`)
                }
                className="group w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
              >
                <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                  {play.character}
                </span>

                <span className="mt-1 block truncate text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-7f705d))]">
                  {play.rule}
                </span>

                <span className="mt-2 flex flex-wrap items-center gap-1">
                  {[play.roll1, play.roll2, play.roll3].map((roll, index) => (
                    <span
                      key={`${play.id}-roll-${index}`}
                      className="min-w-6 border border-[rgb(var(--sep-colour-765735))]/55 bg-[rgb(var(--sep-colour-17110d))] px-1.5 py-0.5 text-center font-mono text-[8px] text-[rgb(var(--sep-colour-c7aa7b))]"
                    >
                      {roll}
                    </span>
                  ))}

                  <span className="ml-auto text-[7px] text-[rgb(var(--sep-colour-665b4d))]">
                    {play.date}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
              No matching plays.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
