"use client";

import { useMemo, useState } from "react";
import { formatRemnants, formatSignedRemnants } from "@/lib/economy/currency";

export type LedgerFilterEntry = {
  id: string;
  amount: number | string;
  balance_after: number | string;
  reason: string;
  created_at: string;
};

type Props = {
  entries: LedgerFilterEntry[];
  compact?: boolean;
};

export function LedgerEntries({ entries, compact = false }: Props) {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [movement, setMovement] = useState<"all" | "positive" | "negative">("all");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const amount = Number(entry.amount);
      if (movement === "positive" && amount <= 0) return false;
      if (movement === "negative" && amount >= 0) return false;

      if (date) {
        const entryDate = new Date(entry.created_at);
        const localDate = [
          entryDate.getFullYear(),
          String(entryDate.getMonth() + 1).padStart(2, "0"),
          String(entryDate.getDate()).padStart(2, "0"),
        ].join("-");
        if (localDate !== date) return false;
      }

      if (needle && !entry.reason.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [entries, search, date, movement]);

  return (
    <>
      <div className="grid gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] p-3 sm:grid-cols-[minmax(180px,1fr)_150px_150px_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shop, Item, type, reason..."
          className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-bba98c))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
        />
        <select
          value={movement}
          onChange={(e) => setMovement(e.target.value as "all" | "positive" | "negative")}
          className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-bba98c))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
        >
          <option value="all">All movements</option>
          <option value="positive">Positive only</option>
          <option value="negative">Negative only</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setDate("");
            setMovement("all");
          }}
          className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a99578))] hover:border-[rgb(var(--sep-colour-8c6b43))] hover:text-[rgb(var(--sep-colour-dfc79c))]"
        >
          Clear
        </button>
      </div>

      <div className={compact ? "max-h-[230px] space-y-1.5 overflow-y-auto p-1 pr-1" : "max-h-[520px] overflow-y-auto"}>
        {filtered.length ? (
          filtered.map((entry) =>
            compact ? (
              <div key={entry.id} className="grid gap-1 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 sm:grid-cols-[90px_minmax(0,1fr)_110px_120px]">
                <span className={Number(entry.amount) > 0 ? "text-[10px] text-emerald-400" : "text-[10px] text-red-400"}>
                  {formatSignedRemnants(Number(entry.amount))}
                </span>
                <span className="min-w-0 text-[9px] text-[rgb(var(--sep-colour-a99578))]">{entry.reason}</span>
                <span className="text-right text-[8px] text-[rgb(var(--sep-colour-756958))]">Balance {formatRemnants(Number(entry.balance_after))}</span>
                <time className="text-right text-[8px] text-[rgb(var(--sep-colour-665b4d))]">{new Date(entry.created_at).toLocaleString("en-GB")}</time>
              </div>
            ) : (
              <div key={entry.id} className="grid gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/25 px-4 py-3 last:border-b-0 sm:grid-cols-[120px_minmax(0,1fr)_130px_145px] sm:items-center sm:px-5">
                <span className={Number(entry.amount) > 0 ? "text-[11px] text-emerald-400" : "text-[11px] text-red-400"}>
                  {formatSignedRemnants(Number(entry.amount))}
                </span>
                <span className="min-w-0 text-[10px] leading-5 text-[rgb(var(--sep-colour-a99578))]">{entry.reason}</span>
                <span className="text-[9px] text-[rgb(var(--sep-colour-756958))] sm:text-right">Balance {formatRemnants(Number(entry.balance_after))}</span>
                <time className="text-[8px] text-[rgb(var(--sep-colour-665b4d))] sm:text-right">{new Date(entry.created_at).toLocaleString("en-GB")}</time>
              </div>
            ),
          )
        ) : (
          <p className="px-5 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-756958))]">No Ledger transactions match these filters.</p>
        )}
      </div>
    </>
  );
}
