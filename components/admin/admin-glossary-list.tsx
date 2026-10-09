"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { updateGlossaryEntry, deleteGlossaryEntry } from "@/app/(portal)/admin/rules/actions";

type GlossaryEntry = {
  id: string; term: string; slug: string; definition: string;
  related_rule_id: string | null; sort_order: number;
  status: "draft" | "published";
};
type RuleEntry = { id: string; title: string };

export function AdminGlossaryList({ initialEntries, rules, totalCount }: {
  initialEntries: GlossaryEntry[]; rules: RuleEntry[]; totalCount: number;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [loading, setLoading] = useState(false);
  // Offset tracks ONLY sequential batches; a jumped-to entry must not change it.
  const [batchOffset, setBatchOffset] = useState(initialEntries.length);
  const offsetRef = useRef(initialEntries.length);
  const entriesRef = useRef(initialEntries);
  const jumpPendingRef = useRef<string | null>(null);
  const jumpInFlightRef = useRef(false);
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { entriesRef.current = entries; }, [entries]);

  useEffect(() => {
    function jumpToSlug(slug: string) {
      const el = document.getElementById(`glossary-${slug}`);
      if (!el) return false;
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#glossary-${slug}`);
      return true;
    }

    async function onJump(event: Event) {
      const slug = (event as CustomEvent<{ slug?: string }>).detail?.slug;
      if (!slug || jumpInFlightRef.current) return;
      if (jumpToSlug(slug)) return;
      jumpInFlightRef.current = true;
      setJumpError(null);
      try {
        const response = await fetch(`/api/admin/rules/glossary?slug=${encodeURIComponent(slug)}`, {
          credentials: "same-origin", cache: "no-store",
        });
        if (!response.ok) throw new Error(`Unable to open glossary entry (${response.status})`);
        const result: { entries: GlossaryEntry[] } = await response.json();
        const entry = result.entries.find(entry => entry.slug === slug);
        if (!entry) throw new Error("Glossary entry not found.");
        if (!entriesRef.current.some(existing => existing.id === entry.id)) {
          entriesRef.current = [...entriesRef.current, entry];
          setEntries(entriesRef.current);
        }
        jumpPendingRef.current = slug;
        // DOM may not yet include the newly rendered entry; the effect below handles it.
        if (jumpToSlug(slug)) jumpPendingRef.current = null;
      } catch (cause) {
        setJumpError(cause instanceof Error ? cause.message : "Unable to open entry.");
      } finally {
        jumpInFlightRef.current = false;
      }
    }

    window.addEventListener("sepulchria:glossary-jump", onJump);
    return () => window.removeEventListener("sepulchria:glossary-jump", onJump);
  }, []);

  useEffect(() => {
    const slug = jumpPendingRef.current;
    if (!slug) return;
    const el = document.getElementById(`glossary-${slug}`);
    if (!el) return;
    if (el instanceof HTMLDetailsElement) el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#glossary-${slug}`);
    jumpPendingRef.current = null;
  }, [entries]);

  async function loadMore() {
    if (loading || batchOffset >= totalCount) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/rules/glossary?offset=${offsetRef.current}`, {
        credentials: "same-origin", cache: "no-store",
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const result: { entries: GlossaryEntry[] } = await response.json();
      offsetRef.current += result.entries.length;
      setBatchOffset(offsetRef.current);
      setEntries(previous => {
        const seen = new Set(previous.map(entry => entry.id));
        const merged = [...previous, ...result.entries.filter(entry => !seen.has(entry.id))];
        entriesRef.current = merged;
        return merged;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load more entries.");
    } finally {
      setLoading(false);
    }
  }
  return (
          <div className="admin_rules_page_div_container_16">
            <SectionHeading
              title="Glossary"
              count={totalCount}
            />

            <div id="glossary-list" className="mt-3 space-y-2 admin_rules_page_div_container_17">
              {entries.map(
                (entry) => (
                  <details
                    key={entry.id}
                    id={`glossary-${entry.slug}`}
                    className="scroll-mt-24 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] admin_rules_page_details_details_2"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 admin_rules_page_summary_summary_2">
                      <div className="flex items-center justify-between admin_rules_page_div_container_18">
                        <span className="font-serif text-sm text-[rgb(var(--sep-colour-d1b98e))] admin_rules_page_span_text_3">
                          {entry.term}
                        </span>
                        <StatusBadge
                          status={
                            entry.status
                          }
                        />
                      </div>
                    </summary>

                    <AdminActionForm
                      action={
                        updateGlossaryEntry
                      }
                      className="space-y-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 p-4"
                    >
                      <input className="admin_rules_page_input_id_4"
                        type="hidden"
                        name="id"
                        value={
                          entry.id
                        }
                      />

                      <div className="grid gap-2 sm:grid-cols-2 admin_rules_page_div_container_19">
                        <AdminField label="Term">
                          <input
                            name="term"
                            defaultValue={
                              entry.term
                            }
                            className={[((inputClass)), "admin_rules_page_input_term_2"].filter(Boolean).join(" ")}
                          />
                        </AdminField>

                        <AdminField label="Slug">
                          <input
                            name="slug"
                            defaultValue={
                              entry.slug
                            }
                            className={[((inputClass)), "admin_rules_page_input_slug_6"].filter(Boolean).join(" ")}
                          />
                        </AdminField>
                      </div>

                      <AdminField label="Definition">
                        <RichTextEditor
                          name="definition"
                          defaultValue={
                            entry.definition
                          }
                          minHeight={
                            110
                          }
                          variant="lore"
                        />
                      </AdminField>

                      <div className="grid gap-2 sm:grid-cols-3 admin_rules_page_div_container_20">
                        <AdminField label="Related rule">
                          <select
                            name="related_rule_id"
                            defaultValue={
                              entry.related_rule_id ??
                              ""
                            }
                            className={[((inputClass)), "admin_rules_page_select_related_rule_id_2"].filter(Boolean).join(" ")}
                          >
                            <option className="admin_rules_page_option_related_rule_id_2" value="">
                              None
                            </option>
                            {[...rules]
                  .sort((a, b) =>
                    a.title.localeCompare(
                      b.title,
                      undefined,
                      { sensitivity: "base", numeric: true },
                    ),
                  )
                  .map(
                              (rule) => (
                                <option className="admin_rules_page_option_option_4"
                                  key={
                                    rule.id
                                  }
                                  value={
                                    rule.id
                                  }
                                >
                                  {
                                    rule.title
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        </AdminField>

                        <AdminField label="Status">
                          <select
                            name="status"
                            defaultValue={
                              entry.status
                            }
                            className={[((inputClass)), "admin_rules_page_select_status_4"].filter(Boolean).join(" ")}
                          >
                            <option className="admin_rules_page_option_draft_4" value="draft">
                              Draft
                            </option>
                            <option className="admin_rules_page_option_published_4" value="published">
                              Published
                            </option>
                          </select>
                        </AdminField>

                        <AdminField label="Order">
                          <input
                            name="sort_order"
                            type="number"
                            defaultValue={
                              entry.sort_order
                            }
                            className={[((inputClass)), "admin_rules_page_input_sort_order_6"].filter(Boolean).join(" ")}
                          />
                        </AdminField>
                      </div>

                      <SubmitButton>
                        Save glossary entry
                      </SubmitButton>
                    </AdminActionForm>

                    <AdminActionForm
                      action={
                        deleteGlossaryEntry
                      }
                      className="border-t border-[rgb(var(--sep-colour-60482e))]/25 px-4 py-3 text-right"
                    >
                      <input className="admin_rules_page_input_id_5"
                        type="hidden"
                        name="id"
                        value={
                          entry.id
                        }
                      />
                      <button
                        type="submit"
                        className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-875a50))] hover:text-[rgb(var(--sep-colour-d88f80))] admin_rules_page_button_delete"
                      >
                        Delete
                      </button>
                    </AdminActionForm>
                  </details>
                ),
              )}
              {batchOffset < totalCount ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadMore()}
                  className="block w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-d4bd94))] hover:border-[rgb(var(--sep-colour-8d693e))] disabled:opacity-50"
                >
                  {loading ? "Loading…" : `Load 25 more (${entries.length} of ${totalCount} shown)`}
                </button>
              ) : null}
              {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
              {jumpError ? <p role="alert" className="text-xs text-red-400">{jumpError}</p> : null}
            </div>
          </div>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="block admin_rules_page_div_container_23">
      <div className="mb-1.5 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_rules_page_div_container_24">
        {label}
      </div>
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/30 pb-2 admin_rules_page_div_container_25">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d4bd94))] admin_rules_page_h2_heading_2">
        {title}
      </h2>
      <span className="text-[9px] text-[rgb(var(--sep-colour-716452))] admin_rules_page_span_text_4">
        {count}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
        status === "published"
          ? "border-[rgb(var(--sep-colour-536a43))]/55 bg-[rgb(var(--sep-colour-172015))] text-[rgb(var(--sep-colour-90a77b))]"
          : "border-[rgb(var(--sep-colour-685843))]/55 bg-[rgb(var(--sep-colour-1a1611))] text-[rgb(var(--sep-colour-8e806d))]"
      }`)), "admin_rules_page_span_text_5"].filter(Boolean).join(" ")}
    >
      {status}
    </span>
  );
}

function SubmitButton({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-d4b783))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))] admin_rules_page_button_action"
    >
      {children}
    </button>
  );
}

const inputClass =
  "h-9 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 text-xs text-[rgb(var(--sep-colour-cdbb9d))] outline-none placeholder:text-[rgb(var(--sep-colour-5d554a))] focus:border-[rgb(var(--sep-colour-8d693e))]";
