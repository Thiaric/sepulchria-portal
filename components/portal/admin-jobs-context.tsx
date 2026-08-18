"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type JobEntry = {
  id: string;
  name: string;
  description: string;
};

export function AdminJobsContext() {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("odd_jobs")
        .select("id, name, description, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setJobs(
        (data ?? []).map((row) => ({
          id: String(row.id),
          name: String(row.name),
          description: String(row.description ?? ""),
        })),
      );

      setError(null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return jobs;

    return jobs.filter((job) =>
      `${job.name} ${job.description}`.toLowerCase().includes(query),
    );
  }, [jobs, search]);

  function jumpTo(id: string) {
    document.getElementById(`job-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[#d8bf91]">
        Jump to Jobs
      </h2>

      <button
        type="button"
        onClick={() =>
          document.getElementById("job-new")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
        className="mt-3 flex w-full items-center justify-between border border-[#765937]/55 bg-[#271c12] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[#d6b37d] transition hover:border-[#9a7445] hover:bg-[#342318]"
      >
        <span>Create new</span>
        <span>+</span>
      </button>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search jobs..."
        className="mt-3 w-full border border-[#59432c]/45 bg-[#100c09] px-3 py-2.5 text-xs text-[#d4bea0] outline-none placeholder:text-[#665b4d] focus:border-[#987344]"
      />

      <p className="mt-1.5 text-right text-[7px] uppercase tracking-[0.1em] text-[#6f6353]">
        {visible.length}{search.trim() ? ` / ${jobs.length}` : ""} Jobs
      </p>

      {error ? (
        <p className="mt-3 border border-[#743d35] bg-[#2a1512] p-2.5 text-[10px] leading-5 text-[#d8a49a]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse border border-[#59432c]/30 bg-[#19120d]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => jumpTo(job.id)}
                className="group w-full border border-[#59432c]/40 bg-[#100c09] px-3 py-2 text-left transition hover:border-[#8d693e] hover:bg-[#1d150f]"
              >
                <span className="block truncate font-serif text-[13px] text-[#cbb28a] group-hover:text-[#ead0a0]">
                  {job.name}
                </span>
                <span className="mt-0.5 block truncate text-[8px] text-[#756958]">
                  {job.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
