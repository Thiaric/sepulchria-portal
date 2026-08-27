"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type SubmissionEntry = {
  id: string;
  orderName: string;
  characterName: string;
  status: string;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function labelStatus(status: string) {
  if (status === "under_review") return "Under Review";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

export function OrderSubmissionsContext() {
  const [entries, setEntries] = useState<SubmissionEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const { data, error: loadError } = await supabase
        .from("order_submissions")
        .select(`
          id,
          order_name,
          status,
          submitter:characters!order_submissions_submitted_by_character_id_fkey(
            display_name,
            first_name,
            surname
          )
        `)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setEntries([]);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map((row) => {
          const submitter = one(row.submitter);
          const characterName =
            submitter?.display_name?.trim() ||
            `${submitter?.first_name ?? ""} ${submitter?.surname ?? ""}`.trim() ||
            "Unknown character";

          return {
            id: String(row.id),
            orderName: String(row.order_name),
            characterName,
            status: String(row.status),
          };
        }),
      );

      setError(null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const query = search.trim().toLocaleLowerCase();

  const filtered = entries.filter((entry) => {
    if (!query) return true;

    return (
      entry.orderName.toLocaleLowerCase().includes(query) ||
      entry.characterName.toLocaleLowerCase().includes(query)
    );
  });

  function jumpTo(submissionId: string) {
    const element = document.getElementById(
      `order-submission-${submissionId}`,
    );

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#order-submission-${submissionId}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Administration
        </p>

        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8c19a))]">
          Order Submissions
        </h2>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filter by Order or character..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-8a673f))]"
      />

      <p className="mt-3 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
        Proposed Orders · {filtered.length}
      </p>

      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            Loading submissions...
          </p>
        ) : error ? (
          <p className="text-xs text-red-300">
            Unable to load submissions.
          </p>
        ) : filtered.length > 0 ? (
          filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => jumpTo(entry.id)}
              className={
                entry.status === "pending"
                  ? "w-full border border-[rgb(var(--sep-colour-b1844b))] bg-[rgb(var(--sep-colour-24180f))] px-3 py-2.5 text-left transition hover:bg-[rgb(var(--sep-colour-302217))]"
                  : "w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))]"
              }
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
                    {entry.orderName}
                  </span>

                  <span className="mt-1 block truncate text-[9px] text-[rgb(var(--sep-colour-817563))]">
                    {entry.characterName}
                  </span>
                </div>

                {entry.status === "pending" ? (
                  <span className="shrink-0 rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-1.5 py-0.5 text-[7px] font-bold uppercase text-[rgb(var(--sep-colour-ffe1ac))]">
                    New
                  </span>
                ) : null}
              </div>

              <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
                {labelStatus(entry.status)}
              </span>
            </button>
          ))
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching submissions.
          </p>
        )}
      </div>
    </div>
  );
}
