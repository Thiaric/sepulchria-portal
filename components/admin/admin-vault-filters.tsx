"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  scope: "live" | "archive";
  total: number;
};

const inputClass =
  "w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]";

export function AdminVaultFilters({ scope, total }: Props) {
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState("");
  const [transfer, setTransfer] = useState("");
  const [quest, setQuest] = useState("");
  const [shown, setShown] = useState(total);

  const selector = useMemo(
    () => `[data-vault-scope="${scope}"]`,
    [scope],
  );

  useEffect(() => {
    const query = search.trim().toLowerCase();
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    );

    let visible = 0;

    for (const node of nodes) {
      const matches =
        (!query || (node.dataset.search ?? "").includes(query)) &&
        (!quality || node.dataset.quality === quality) &&
        (scope === "archive" ||
          !transfer ||
          node.dataset.transfer === transfer) &&
        (scope === "archive" ||
          !quest ||
          node.dataset.quest === quest);

      node.hidden = !matches;
      if (matches) visible += 1;
    }

    setShown(visible);
  }, [search, quality, transfer, quest, selector, scope]);

  function reset() {
    setSearch("");
    setQuality("");
    setTransfer("");
    setQuest("");
  }

  return (
    <div className="mt-4 border border-[#59432c]/40 bg-[#15100d] p-3">
      <div
        className={`grid gap-2 ${
          scope === "live"
            ? "sm:grid-cols-2 xl:grid-cols-5"
            : "sm:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            scope === "live"
              ? "Search name, master Item, description or notes..."
              : "Search destroyed Item, reason or instance ID..."
          }
          className={inputClass}
        />

        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value)}
          className={inputClass}
        >
          <option value="">All qualities</option>
          <option value="poor">Poor</option>
          <option value="average">Average</option>
          <option value="fine">Fine</option>
          <option value="superior">Superior</option>
          <option value="flawless">Flawless</option>
          <option value="peerless">Peerless</option>
        </select>

        {scope === "live" ? (
          <>
            <select
              value={transfer}
              onChange={(event) => setTransfer(event.target.value)}
              className={inputClass}
            >
              <option value="">All transfer policies</option>
              <option value="free">Free</option>
              <option value="restricted">Restricted</option>
              <option value="bound">Bound</option>
            </select>

            <select
              value={quest}
              onChange={(event) => setQuest(event.target.value)}
              className={inputClass}
            >
              <option value="">All Quest states</option>
              <option value="yes">Quest Item</option>
              <option value="no">Not Quest Item</option>
            </select>
          </>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="border border-[#60482e]/55 bg-[#100c09] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#a99576]"
        >
          Reset
        </button>
      </div>

      <p className="mt-2 text-right text-[8px] uppercase tracking-[0.12em] text-[#756958]">
        {shown} of {total} shown
      </p>
    </div>
  );
}
