"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  scope: "live" | "archive";
  total: number;
};

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

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
    <div className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3 components_admin_admin_vault_filters_div_container">
      <div
        className={[((`grid gap-2 ${
          scope === "live"
            ? "sm:grid-cols-2 xl:grid-cols-5"
            : "sm:grid-cols-2 xl:grid-cols-3"
        }`)), "components_admin_admin_vault_filters_div_container_2"].filter(Boolean).join(" ")}
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
          className={[((inputClass)), "components_admin_admin_vault_filters_input_field"].filter(Boolean).join(" ")}
        />

        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value)}
          className={[((inputClass)), "components_admin_admin_vault_filters_select_select"].filter(Boolean).join(" ")}
        >
          <option className="components_admin_admin_vault_filters_option_option" value="">All qualities</option>
          <option className="components_admin_admin_vault_filters_option_poor" value="poor">Poor</option>
          <option className="components_admin_admin_vault_filters_option_average" value="average">Average</option>
          <option className="components_admin_admin_vault_filters_option_fine" value="fine">Fine</option>
          <option className="components_admin_admin_vault_filters_option_superior" value="superior">Superior</option>
          <option className="components_admin_admin_vault_filters_option_flawless" value="flawless">Flawless</option>
          <option className="components_admin_admin_vault_filters_option_peerless" value="peerless">Peerless</option>
        </select>

        {scope === "live" ? (
          <>
            <select
              value={transfer}
              onChange={(event) => setTransfer(event.target.value)}
              className={[((inputClass)), "components_admin_admin_vault_filters_select_select_2"].filter(Boolean).join(" ")}
            >
              <option className="components_admin_admin_vault_filters_option_option_2" value="">All transfer policies</option>
              <option className="components_admin_admin_vault_filters_option_free" value="free">Free</option>
              <option className="components_admin_admin_vault_filters_option_restricted" value="restricted">Restricted</option>
              <option className="components_admin_admin_vault_filters_option_bound" value="bound">Bound</option>
            </select>

            <select
              value={quest}
              onChange={(event) => setQuest(event.target.value)}
              className={[((inputClass)), "components_admin_admin_vault_filters_select_select_3"].filter(Boolean).join(" ")}
            >
              <option className="components_admin_admin_vault_filters_option_option_3" value="">All Quest states</option>
              <option className="components_admin_admin_vault_filters_option_option_4" value="yes">Quest Item</option>
              <option className="components_admin_admin_vault_filters_option_option_5" value="no">Not Quest Item</option>
            </select>
          </>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a99576))] components_admin_admin_vault_filters_button_reset"
        >
          Reset
        </button>
      </div>

      <p className="mt-2 text-right text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_admin_admin_vault_filters_p_text">
        {shown} of {total} shown
      </p>
    </div>
  );
}
