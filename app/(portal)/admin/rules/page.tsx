

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
    <div className="p-5 sm:p-7 admin_rules_page_div_container">
      <div className="mx-auto max-w-6xl admin_rules_page_div_container_2">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-4 admin_rules_page_header_header">
          <div className="admin_rules_page_div_rules_management">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806a4b))] admin_rules_page_p_rules_management">
              Staff tools
            </p>
            <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-dfc99f))] admin_rules_page_h1_rules_management">
              Rules Management
            </h1>
          </div>

          <a
            href="/rules"
            target="_blank"
            rel="noreferrer"
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a78d68))] hover:border-[rgb(var(--sep-colour-8d693e))] hover:text-[rgb(var(--sep-colour-d8bb8a))] admin_rules_page_a_view_public_rules"
          >
            View public Rules ↗
          </a>
        </header>

        <section className="grid gap-4 lg:grid-cols-2 admin_rules_page_section_section">
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
                  className={[((inputClass)), "admin_rules_page_input_name"].filter(Boolean).join(" ")}
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  name="slug"
                  required
                  className={[((inputClass)), "admin_rules_page_input_slug"].filter(Boolean).join(" ")}
                />
              </AdminField>

              <AdminField label="Summary">
                <input
                  name="summary"
                  className={[((inputClass)), "admin_rules_page_input_summary"].filter(Boolean).join(" ")}
                />
              </AdminField>

              <AdminField label="Sort order">
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={0}
                  className={[((inputClass)), "admin_rules_page_input_sort_order"].filter(Boolean).join(" ")}
                />
              </AdminField>

              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-9f907d))] admin_rules_page_label_label">
                <input className="admin_rules_page_input_active"
                  name="is_active"
                  type="checkbox"
                  defaultChecked
                />
                Active
              </label>

              <div className="sm:text-right admin_rules_page_div_container_3">
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
              <div className="grid gap-3 sm:grid-cols-2 admin_rules_page_div_container_4">
                <AdminField label="Term">
                  <input
                    name="term"
                    required
                    className={[((inputClass)), "admin_rules_page_input_term"].filter(Boolean).join(" ")}
                  />
                </AdminField>

                <AdminField label="Slug">
                  <input
                    name="slug"
                    required
                    className={[((inputClass)), "admin_rules_page_input_slug_2"].filter(Boolean).join(" ")}
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

              <div className="grid gap-3 sm:grid-cols-3 admin_rules_page_div_container_5">
                <AdminField label="Related rule">
                  <select
                    name="related_rule_id"
                    className={[((inputClass)), "admin_rules_page_select_related_rule_id"].filter(Boolean).join(" ")}
                    defaultValue=""
                  >
                    <option className="admin_rules_page_option_related_rule_id" value="">
                      None
                    </option>
                    {rules.map(
                      (rule) => (
                        <option className="admin_rules_page_option_option"
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
                    className={[((inputClass)), "admin_rules_page_select_status"].filter(Boolean).join(" ")}
                    defaultValue="draft"
                  >
                    <option className="admin_rules_page_option_draft" value="draft">
                      Draft
                    </option>
                    <option className="admin_rules_page_option_published" value="published">
                      Published
                    </option>
                  </select>
                </AdminField>

                <AdminField label="Sort order">
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={0}
                    className={[((inputClass)), "admin_rules_page_input_sort_order_2"].filter(Boolean).join(" ")}
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 admin_rules_page_div_container_6">
              <AdminField label="Title">
                <input
                  name="title"
                  required
                  className={[((inputClass)), "admin_rules_page_input_title"].filter(Boolean).join(" ")}
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  name="slug"
                  required
                  className={[((inputClass)), "admin_rules_page_input_slug_3"].filter(Boolean).join(" ")}
                />
              </AdminField>

              <AdminField label="Category">
                <select
                  name="category_id"
                  required
                  className={[((inputClass)), "admin_rules_page_select_category_id"].filter(Boolean).join(" ")}
                  defaultValue=""
                >
                  <option className="admin_rules_page_option_category_id"
                    value=""
                    disabled
                  >
                    Select
                  </option>
                  {categories.map(
                    (category) => (
                      <option className="admin_rules_page_option_option_2"
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

              <div className="grid grid-cols-2 gap-2 admin_rules_page_div_container_7">
                <AdminField label="Status">
                  <select
                    name="status"
                    className={[((inputClass)), "admin_rules_page_select_status_2"].filter(Boolean).join(" ")}
                    defaultValue="draft"
                  >
                    <option className="admin_rules_page_option_draft_2" value="draft">
                      Draft
                    </option>
                    <option className="admin_rules_page_option_published_2" value="published">
                      Published
                    </option>
                  </select>
                </AdminField>

                <AdminField label="Order">
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={0}
                    className={[((inputClass)), "admin_rules_page_input_sort_order_3"].filter(Boolean).join(" ")}
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

        <section className="mt-5 admin_rules_page_section_section_2">
          <SectionHeading
            title="Existing rules"
            count={rules.length}
          />

          <div className="mt-3 space-y-2 admin_rules_page_div_container_8">
            {rules.map((rule) => (
              <details
                key={rule.id}
                id={`rule-${rule.slug}`}
                className="scroll-mt-24 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] admin_rules_page_details_details"
              >
                <summary className="cursor-pointer list-none px-4 py-3 admin_rules_page_summary_summary">
                  <div className="flex items-center justify-between gap-4 admin_rules_page_div_container_9">
                    <div className="min-w-0 admin_rules_page_div_container_10">
                      <span className="font-serif text-base text-[rgb(var(--sep-colour-d4bd94))] admin_rules_page_span_text">
                        {rule.title}
                      </span>
                      <span className="ml-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-736653))] admin_rules_page_span_text_2">
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
                  <input className="admin_rules_page_input_id"
                    type="hidden"
                    name="id"
                    value={rule.id}
                  />

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 admin_rules_page_div_container_11">
                    <AdminField label="Title">
                      <input
                        name="title"
                        defaultValue={
                          rule.title
                        }
                        className={[((inputClass)), "admin_rules_page_input_title_2"].filter(Boolean).join(" ")}
                      />
                    </AdminField>

                    <AdminField label="Slug">
                      <input
                        name="slug"
                        defaultValue={
                          rule.slug
                        }
                        className={[((inputClass)), "admin_rules_page_input_slug_4"].filter(Boolean).join(" ")}
                      />
                    </AdminField>

                    <AdminField label="Category">
                      <select
                        name="category_id"
                        defaultValue={
                          rule.category_id
                        }
                        className={[((inputClass)), "admin_rules_page_select_category_id_2"].filter(Boolean).join(" ")}
                      >
                        {categories.map(
                          (
                            category,
                          ) => (
                            <option className="admin_rules_page_option_option_3"
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

                    <div className="grid grid-cols-2 gap-2 admin_rules_page_div_container_12">
                      <AdminField label="Status">
                        <select
                          name="status"
                          defaultValue={
                            rule.status
                          }
                          className={[((inputClass)), "admin_rules_page_select_status_3"].filter(Boolean).join(" ")}
                        >
                          <option className="admin_rules_page_option_draft_3" value="draft">
                            Draft
                          </option>
                          <option className="admin_rules_page_option_published_3" value="published">
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
                          className={[((inputClass)), "admin_rules_page_input_sort_order_4"].filter(Boolean).join(" ")}
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

                  <div className="flex flex-wrap gap-2 admin_rules_page_div_container_13">
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
                  <input className="admin_rules_page_input_id_2"
                    type="hidden"
                    name="id"
                    value={rule.id}
                  />
                  <button
                    type="submit"
                    className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-875a50))] hover:text-[rgb(var(--sep-colour-d88f80))] admin_rules_page_button_delete_rule"
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

        <section className="mt-5 grid gap-4 lg:grid-cols-2 admin_rules_page_section_section_3">
          <div className="admin_rules_page_div_container_14">
            <SectionHeading
              title="Categories"
              count={
                categories.length
              }
            />

            <div className="mt-3 space-y-2 admin_rules_page_div_container_15">
              {categories.map(
                (category) => (
                  <AdminActionForm
                    key={category.id}
                    action={
                      updateRuleCategory
                    }
                    className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3 sm:grid-cols-[1fr_1fr_100px_auto]"
                  >
                    <input className="admin_rules_page_input_id_3"
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
                      className={[((inputClass)), "admin_rules_page_input_name_2"].filter(Boolean).join(" ")}
                    />

                    <input
                      name="slug"
                      defaultValue={
                        category.slug
                      }
                      className={[((inputClass)), "admin_rules_page_input_slug_5"].filter(Boolean).join(" ")}
                    />

                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={
                        category.sort_order
                      }
                      className={[((inputClass)), "admin_rules_page_input_sort_order_5"].filter(Boolean).join(" ")}
                    />

                    <div className="flex items-center justify-end gap-2 admin_rules_page_div_active">
                      <label className="text-[9px] text-[rgb(var(--sep-colour-8d806e))] admin_rules_page_label_active">
                        <input
                          name="is_active"
                          type="checkbox"
                          defaultChecked={
                            category.is_active
                          }
                          className="mr-1 admin_rules_page_input_active_2"
                        />
                        Active
                      </label>

                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-2 py-2 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d4b783))] admin_rules_page_button_save"
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
                      className={[((`sm:col-span-4 ${inputClass}`)), "admin_rules_page_input_summary_2"].filter(Boolean).join(" ")}
                    />
                  </AdminActionForm>
                ),
              )}
            </div>
          </div>

          <div className="admin_rules_page_div_container_16">
            <SectionHeading
              title="Glossary"
              count={glossary.length}
            />

            <div className="mt-3 space-y-2 admin_rules_page_div_container_17">
              {glossary.map(
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
                            {rules.map(
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
            </div>
          </div>
        </section>

        <section className="mt-5 admin_rules_page_section_section_4">
          <SectionHeading
            title="Related-rule links"
            count={links.length}
          />

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] admin_rules_page_div_container_21">
            <AdminActionForm
              action={createRuleLink}
              className="grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_100px_auto]"
            >
              <select
                name="source_rule_id"
                required
                className={[((inputClass)), "admin_rules_page_select_source_rule_id"].filter(Boolean).join(" ")}
                defaultValue=""
              >
                <option className="admin_rules_page_option_source_rule_id"
                  value=""
                  disabled
                >
                  Source rule
                </option>
                {rules.map((rule) => (
                  <option className="admin_rules_page_option_option_5"
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
                className={[((inputClass)), "admin_rules_page_select_select"].filter(Boolean).join(" ")}
                defaultValue=""
              >
                <option className="admin_rules_page_option_option_6"
                  value=""
                  disabled
                >
                  Target rule
                </option>
                {rules.map((rule) => (
                  <option className="admin_rules_page_option_option_7"
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
                className={[((inputClass)), "admin_rules_page_input_label"].filter(Boolean).join(" ")}
              />

              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className={[((inputClass)), "admin_rules_page_input_sort_order_7"].filter(Boolean).join(" ")}
              />

              <SubmitButton>
                Add link
              </SubmitButton>
            </AdminActionForm>
          </div>

          {links.length > 0 ? (
            <div className="mt-2 space-y-1 admin_rules_page_div_container_22">
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
                    <input className="admin_rules_page_input_id_6"
                      type="hidden"
                      name="id"
                      value={link.id}
                    />

                    <p className="truncate text-xs text-[rgb(var(--sep-colour-958672))] admin_rules_page_p_text">
                      {source?.title ??
                        "Unknown"}{" "}
                      →{" "}
                      {link.label ??
                        target?.title ??
                        "Unknown"}
                    </p>

                    <button
                      type="submit"
                      className="shrink-0 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-875a50))] hover:text-[rgb(var(--sep-colour-d88f80))] admin_rules_page_button_remove"
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
    <div className="block admin_rules_page_div_container_23">
      <div className="mb-1.5 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_rules_page_div_container_24">
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
      className={[((`border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4 ${className}`)), "admin_rules_page_section_section_5"].filter(Boolean).join(" ")}
    >
      <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-776248))] admin_rules_page_p_text_2">
        {eyebrow}
      </p>
      <h2 className="mb-3 mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d4bd94))] admin_rules_page_h2_heading">
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
  children: React.ReactNode;
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

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-5 text-sm text-[rgb(var(--sep-colour-7d7161))] admin_rules_page_div_container_26">
      {children}
    </div>
  );
}

const inputClass =
  "h-9 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 text-xs text-[rgb(var(--sep-colour-cdbb9d))] outline-none placeholder:text-[rgb(var(--sep-colour-5d554a))] focus:border-[rgb(var(--sep-colour-8d693e))]";
