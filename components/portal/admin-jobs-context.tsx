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
    <div className="flex h-full min-h-0 flex-col components_portal_admin_jobs_context_div_jump_jobs">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] components_portal_admin_jobs_context_p_jump_jobs">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_portal_admin_jobs_context_h2_jump_jobs">
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
        className="mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d6b37d))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))] components_portal_admin_jobs_context_button_jump_jobs"
      >
        <span className="components_portal_admin_jobs_context_span_jump_jobs">Create new</span>
        <span className="components_portal_admin_jobs_context_span_jump_jobs_2">+</span>
      </button>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search jobs..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))] components_portal_admin_jobs_context_input_search_jobs"
      />

      <p className="mt-1.5 text-right text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))] components_portal_admin_jobs_context_p_jump_jobs_2">
        {visible.length}{search.trim() ? ` / ${jobs.length}` : ""} Jobs
      </p>

      {error ? (
        <p className="mt-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))] components_portal_admin_jobs_context_p_jump_jobs_3">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 components_portal_admin_jobs_context_div_jump_jobs_2">
        {loading ? (
          <div className="space-y-2 components_portal_admin_jobs_context_div_container">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))] components_portal_admin_jobs_context_div_container_2"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 components_portal_admin_jobs_context_div_container_3">
            {visible.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => jumpTo(job.id)}
                className="group w-full border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))] components_portal_admin_jobs_context_button_action"
              >
                <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))] components_portal_admin_jobs_context_span_text">
                  {job.name}
                </span>
                <span className="mt-0.5 block truncate text-[8px] text-[rgb(var(--sep-colour-756958))] components_portal_admin_jobs_context_span_text_2">
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
