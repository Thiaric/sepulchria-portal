

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  createGlossaryEntry,
  createRuleCategory,
  createRuleEntry,
  createRuleLink,
  deleteGlossaryEntry,
  deleteRuleEntry,
  deleteRuleLink,
  updateGlossaryEntry,
  updateRuleCategory,
  updateRuleEntry,
} from "./actions";

export const dynamic = "force-dynamic";

type RuleCategory = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  sort_order: number;
  is_active: boolean;
};

type RuleEntry = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  sort_order: number;
  status: "draft" | "published";
};

type GlossaryEntry = {
  id: string;
  term: string;
  slug: string;
  definition: string;
  related_rule_id: string | null;
  sort_order: number;
  status: "draft" | "published";
};

type RuleLink = {
  id: string;
  source_rule_id: string;
  target_rule_id: string;
  label: string | null;
  sort_order: number;
};

export default async function AdminRulesPage() {
  await requireAdminSection("rules");

  const supabase = await createClient();

  const [
    categoriesResult,
    rulesResult,
    glossaryResult,
    linksResult,
  ] = await Promise.all([
    supabase
      .from("rule_categories")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("rule_entries")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .order("title", {
        ascending: true,
      }),

    supabase
      .from("rule_glossary")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .order("term", {
        ascending: true,
      }),

    supabase
      .from("rule_links")
      .select("*")
      .order("sort_order", {
        ascending: true,
      }),
  ]);

  const error =
    categoriesResult.error ??
    rulesResult.error ??
    glossaryResult.error ??
    linksResult.error;

  if (error) {
    throw new Error(error.message);
  }

  const categories =
    (categoriesResult.data ??
      []) as RuleCategory[];

  const rules =
    (rulesResult.data ??
      []) as RuleEntry[];

  const glossary =
    (glossaryResult.data ??
      []) as GlossaryEntry[];

  const links =
    (linksResult.data ??
      []) as RuleLink[];

  return (
    <div className="p-5 sm:p-7">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806a4b))]">
              Staff tools
            </p>
            <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-dfc99f))]">
              Rules Management
            </h1>
          </div>

          <a
            href="/rules"
            target="_blank"
            rel="noreferrer"
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a78d68))] hover:border-[rgb(var(--sep-colour-8d693e))] hover:text-[rgb(var(--sep-colour-d8bb8a))]"
          >
            View public Rules ↗
          </a>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <CompactPanel
            eyebrow="Structure"
            title="Create category"
          >
            <AdminActionForm
              action={
                createRuleCategory
              }
              className="grid gap-3 sm:grid-cols-2"
            >
              <AdminField label="Name">
                <input
                  name="name"
                  required
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  name="slug"
                  required
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Summary">
                <input
                  name="summary"
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Sort order">
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={0}
                  className={inputClass}
                />
              </AdminField>

              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-9f907d))]">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked
                />
                Active
              </label>

              <div className="sm:text-right">
                <SubmitButton>
                  Create category
                </SubmitButton>
              </div>
            </AdminActionForm>
          </CompactPanel>

          <CompactPanel
            eyebrow="Reference"
            title="Create glossary entry"
          >
            <AdminActionForm
              action={
                createGlossaryEntry
              }
              className="space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Term">
                  <input
                    name="term"
                    required
                    className={inputClass}
                  />
                </AdminField>

                <AdminField label="Slug">
                  <input
                    name="slug"
                    required
                    className={inputClass}
                  />
                </AdminField>
              </div>

              <AdminField label="Definition">
                <RichTextEditor
                  name="definition"
                  minHeight={110}
                  variant="lore"
                />
              </AdminField>

              <div className="grid gap-3 sm:grid-cols-3">
                <AdminField label="Related rule">
                  <select
                    name="related_rule_id"
                    className={inputClass}
                    defaultValue=""
                  >
                    <option value="">
                      None
                    </option>
                    {rules.map(
                      (rule) => (
                        <option
                          key={rule.id}
                          value={rule.id}
                        >
                          {rule.title}
                        </option>
                      ),
                    )}
                  </select>
                </AdminField>

                <AdminField label="Status">
                  <select
                    name="status"
                    className={inputClass}
                    defaultValue="draft"
                  >
                    <option value="draft">
                      Draft
                    </option>
                    <option value="published">
                      Published
                    </option>
                  </select>
                </AdminField>

                <AdminField label="Sort order">
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={0}
                    className={inputClass}
                  />
                </AdminField>
              </div>

              <SubmitButton>
                Create glossary entry
              </SubmitButton>
            </AdminActionForm>
          </CompactPanel>
        </section>

        <CompactPanel
          eyebrow="Content"
          title="Create rule"
          className="mt-4"
        >
          <AdminActionForm
            action={createRuleEntry}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminField label="Title">
                <input
                  name="title"
                  required
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  name="slug"
                  required
                  className={inputClass}
                />
              </AdminField>

              <AdminField label="Category">
                <select
                  name="category_id"
                  required
                  className={inputClass}
                  defaultValue=""
                >
                  <option
                    value=""
                    disabled
                  >
                    Select
                  </option>
                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>
              </AdminField>

              <div className="grid grid-cols-2 gap-2">
                <AdminField label="Status">
                  <select
                    name="status"
                    className={inputClass}
                    defaultValue="draft"
                  >
                    <option value="draft">
                      Draft
                    </option>
                    <option value="published">
                      Published
                    </option>
                  </select>
                </AdminField>

                <AdminField label="Order">
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={0}
                    className={inputClass}
                  />
                </AdminField>
              </div>
            </div>

            <AdminField label="Summary">
              <RichTextEditor
                name="summary"
                minHeight={100}
                maxTextLength={2000}
                variant="lore"
              />
            </AdminField>

            <AdminField label="Rule body">
              <RichTextEditor
                name="body"
                minHeight={260}
                variant="lore"
              />
            </AdminField>

            <SubmitButton>
              Create rule
            </SubmitButton>
          </AdminActionForm>
        </CompactPanel>

        <section className="mt-5">
          <SectionHeading
            title="Existing rules"
            count={rules.length}
          />

          <div className="mt-3 space-y-2">
            {rules.map((rule) => (
              <details
                key={rule.id}
                id={`rule-${rule.slug}`}
                className="scroll-mt-24 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))]"
              >
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-serif text-base text-[rgb(var(--sep-colour-d4bd94))]">
                        {rule.title}
                      </span>
                      <span className="ml-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-736653))]">
                        {
                          categories.find(
                            (
                              category,
                            ) =>
                              category.id ===
                              rule.category_id,
                          )?.name
                        }
                      </span>
                    </div>

                    <StatusBadge
                      status={
                        rule.status
                      }
                    />
                  </div>
                </summary>

                <AdminActionForm
                  action={
                    updateRuleEntry
                  }
                  className="space-y-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 p-4"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={rule.id}
                  />

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminField label="Title">
                      <input
                        name="title"
                        defaultValue={
                          rule.title
                        }
                        className={
                          inputClass
                        }
                      />
                    </AdminField>

                    <AdminField label="Slug">
                      <input
                        name="slug"
                        defaultValue={
                          rule.slug
                        }
                        className={
                          inputClass
                        }
                      />
                    </AdminField>

                    <AdminField label="Category">
                      <select
                        name="category_id"
                        defaultValue={
                          rule.category_id
                        }
                        className={
                          inputClass
                        }
                      >
                        {categories.map(
                          (
                            category,
                          ) => (
                            <option
                              key={
                                category.id
                              }
                              value={
                                category.id
                              }
                            >
                              {
                                category.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </AdminField>

                    <div className="grid grid-cols-2 gap-2">
                      <AdminField label="Status">
                        <select
                          name="status"
                          defaultValue={
                            rule.status
                          }
                          className={
                            inputClass
                          }
                        >
                          <option value="draft">
                            Draft
                          </option>
                          <option value="published">
                            Published
                          </option>
                        </select>
                      </AdminField>

                      <AdminField label="Order">
                        <input
                          name="sort_order"
                          type="number"
                          defaultValue={
                            rule.sort_order
                          }
                          className={
                            inputClass
                          }
                        />
                      </AdminField>
                    </div>
                  </div>

                  <AdminField label="Summary">
                    <RichTextEditor
                      name="summary"
                      defaultValue={
                        rule.summary ??
                        ""
                      }
                      minHeight={100}
                      maxTextLength={
                        2000
                      }
                      variant="lore"
                    />
                  </AdminField>

                  <AdminField label="Rule body">
                    <RichTextEditor
                      name="body"
                      defaultValue={
                        rule.body
                      }
                      minHeight={260}
                      variant="lore"
                    />
                  </AdminField>

                  <div className="flex flex-wrap gap-2">
                    <SubmitButton>
                      Save changes
                    </SubmitButton>
                  </div>
                </AdminActionForm>

                <AdminActionForm
                  action={
                    deleteRuleEntry
                  }
                  className="border-t border-[rgb(var(--sep-colour-60482e))]/25 px-4 py-3 text-right"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={rule.id}
                  />
                  <button
                    type="submit"
                    className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-875a50))] hover:text-[rgb(var(--sep-colour-d88f80))]"
                  >
                    Delete rule
                  </button>
                </AdminActionForm>
              </details>
            ))}

            {rules.length === 0 ? (
              <EmptyState>
                No rules created yet.
              </EmptyState>
            ) : null}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <SectionHeading
              title="Categories"
              count={
                categories.length
              }
            />

            <div className="mt-3 space-y-2">
              {categories.map(
                (category) => (
                  <AdminActionForm
                    key={category.id}
                    action={
                      updateRuleCategory
                    }
                    className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3 sm:grid-cols-[1fr_1fr_100px_auto]"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={
                        category.id
                      }
                    />

                    <input
                      name="name"
                      defaultValue={
                        category.name
                      }
                      className={
                        inputClass
                      }
                    />

                    <input
                      name="slug"
                      defaultValue={
                        category.slug
                      }
                      className={
                        inputClass
                      }
                    />

                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={
                        category.sort_order
                      }
                      className={
                        inputClass
                      }
                    />

                    <div className="flex items-center justify-end gap-2">
                      <label className="text-[9px] text-[rgb(var(--sep-colour-8d806e))]">
                        <input
                          name="is_active"
                          type="checkbox"
                          defaultChecked={
                            category.is_active
                          }
                          className="mr-1"
                        />
                        Active
                      </label>

                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-2 py-2 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d4b783))]"
                      >
                        Save
                      </button>
                    </div>

                    <input
                      name="summary"
                      defaultValue={
                        category.summary ??
                        ""
                      }
                      placeholder="Category summary"
                      className={`sm:col-span-4 ${inputClass}`}
                    />
                  </AdminActionForm>
                ),
              )}
            </div>
          </div>

          <div>
            <SectionHeading
              title="Glossary"
              count={glossary.length}
            />

            <div className="mt-3 space-y-2">
              {glossary.map(
                (entry) => (
                  <details
                    key={entry.id}
                    id={`glossary-${entry.slug}`}
                    className="scroll-mt-24 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))]"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-sm text-[rgb(var(--sep-colour-d1b98e))]">
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
                      <input
                        type="hidden"
                        name="id"
                        value={
                          entry.id
                        }
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <AdminField label="Term">
                          <input
                            name="term"
                            defaultValue={
                              entry.term
                            }
                            className={
                              inputClass
                            }
                          />
                        </AdminField>

                        <AdminField label="Slug">
                          <input
                            name="slug"
                            defaultValue={
                              entry.slug
                            }
                            className={
                              inputClass
                            }
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

                      <div className="grid gap-2 sm:grid-cols-3">
                        <AdminField label="Related rule">
                          <select
                            name="related_rule_id"
                            defaultValue={
                              entry.related_rule_id ??
                              ""
                            }
                            className={
                              inputClass
                            }
                          >
                            <option value="">
                              None
                            </option>
                            {rules.map(
                              (rule) => (
                                <option
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
                            className={
                              inputClass
                            }
                          >
                            <option value="draft">
                              Draft
                            </option>
                            <option value="published">
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
                            className={
                              inputClass
                            }
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
                      <input
                        type="hidden"
                        name="id"
                        value={
                          entry.id
                        }
                      />
                      <button
                        type="submit"
                        className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-875a50))] hover:text-[rgb(var(--sep-colour-d88f80))]"
                      >
                        Delete
                      </button>
                    </AdminActionForm>
                  </details>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <SectionHeading
            title="Related-rule links"
            count={links.length}
          />

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
            <AdminActionForm
              action={createRuleLink}
              className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_100px_auto]"
            >
              <select
                name="source_rule_id"
                required
                className={inputClass}
                defaultValue=""
              >
                <option
                  value=""
                  disabled
                >
                  Source rule
                </option>
                {rules.map((rule) => (
                  <option
                    key={rule.id}
                    value={rule.id}
                  >
                    {rule.title}
                  </option>
                ))}
              </select>

              <select
                name="target_rule_id"
                required
                className={inputClass}
                defaultValue=""
              >
                <option
                  value=""
                  disabled
                >
                  Target rule
                </option>
                {rules.map((rule) => (
                  <option
                    key={rule.id}
                    value={rule.id}
                  >
                    {rule.title}
                  </option>
                ))}
              </select>

              <input
                name="label"
                placeholder="Optional label"
                className={inputClass}
              />

              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className={inputClass}
              />

              <SubmitButton>
                Add link
              </SubmitButton>
            </AdminActionForm>
          </div>

          {links.length > 0 ? (
            <div className="mt-2 space-y-1">
              {links.map((link) => {
                const source =
                  rules.find(
                    (rule) =>
                      rule.id ===
                      link.source_rule_id,
                  );

                const target =
                  rules.find(
                    (rule) =>
                      rule.id ===
                      link.target_rule_id,
                  );

                return (
                  <AdminActionForm
                    key={link.id}
                    action={
                      deleteRuleLink
                    }
                    className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-120e0b))] px-3 py-2"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={link.id}
                    />

                    <p className="truncate text-xs text-[rgb(var(--sep-colour-958672))]">
                      {source?.title ??
                        "Unknown"}{" "}
                      →{" "}
                      {link.label ??
                        target?.title ??
                        "Unknown"}
                    </p>

                    <button
                      type="submit"
                      className="shrink-0 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-875a50))] hover:text-[rgb(var(--sep-colour-d88f80))]"
                    >
                      Remove
                    </button>
                  </AdminActionForm>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-1.5 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </div>
      {children}
    </div>
  );
}

function CompactPanel({
  eyebrow,
  title,
  className = "",
  children,
}: {
  eyebrow: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4 ${className}`}
    >
      <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-776248))]">
        {eyebrow}
      </p>
      <h2 className="mb-3 mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d4bd94))]">
        {title}
      </h2>
      {children}
    </section>
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
    <div className="flex items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/30 pb-2">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d4bd94))]">
        {title}
      </h2>
      <span className="text-[9px] text-[rgb(var(--sep-colour-716452))]">
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
      className={`border px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
        status === "published"
          ? "border-[rgb(var(--sep-colour-536a43))]/55 bg-[rgb(var(--sep-colour-172015))] text-[rgb(var(--sep-colour-90a77b))]"
          : "border-[rgb(var(--sep-colour-685843))]/55 bg-[rgb(var(--sep-colour-1a1611))] text-[rgb(var(--sep-colour-8e806d))]"
      }`}
    >
      {status}
    </span>
  );
}

function SubmitButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-d4b783))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))]"
    >
      {children}
    </button>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-5 text-sm text-[rgb(var(--sep-colour-7d7161))]">
      {children}
    </div>
  );
}

const inputClass =
  "h-9 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 text-xs text-[rgb(var(--sep-colour-cdbb9d))] outline-none placeholder:text-[rgb(var(--sep-colour-5d554a))] focus:border-[rgb(var(--sep-colour-8d693e))]";
