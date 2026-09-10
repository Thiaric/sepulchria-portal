import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import { updateOrderSubmissionAction } from "./actions";
import { InlineActionForm } from "@/components/forms/inline-action-form";

type RoleEntry = {
  name: string;
  description: string;
};

type LevelEntry = {
  level: number;
  roles: RoleEntry[];
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function statusLabel(status: string) {
  if (status === "under_review") return "Under Review";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

export default async function OrderSubmissionsPage() {
  await requireAdminSection("orders");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_submissions")
    .select(`
      id,
      order_name,
      description,
      banner_description,
      icon_description,
      levels,
      status,
      staff_notes,
      created_at,
      submitter:characters!order_submissions_submitted_by_character_id_fkey(
        display_name,
        first_name,
        surname
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load Order submissions: ${error.message}`);
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_order_submissions_page_main_main">
      <div className="max-w-6xl admin_order_submissions_page_div_order_submissions">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_order_submissions_page_p_order_submissions">
          Order administration
        </p>
        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e1c89f))] admin_order_submissions_page_h2_order_submissions">
          Order Submissions
        </h2>

        <div className="mt-6 space-y-5 admin_order_submissions_page_div_order_submissions_2">
          {(data ?? []).map((submission) => {
            const submitter = one(submission.submitter);
            const submitterName =
              submitter?.display_name?.trim() ||
              `${submitter?.first_name ?? ""} ${submitter?.surname ?? ""}`.trim() ||
              "Unknown character";

            const levels = Array.isArray(submission.levels)
              ? (submission.levels as unknown as LevelEntry[])
              : [];

            return (
              <details
                key={submission.id}
                id={`order-submission-${submission.id}`}
                className={[((submission.status === "pending"
                    ? "group scroll-mt-4 border border-[rgb(var(--sep-colour-b1844b))] bg-[rgb(var(--sep-colour-24180f))] shadow-[0_0_0_1px_rgba(var(--sep-rgb-177-132-75),0.15)]"
                    : "group scroll-mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]")), "admin_order_submissions_page_details_details"].filter(Boolean).join(" ")}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden admin_order_submissions_page_summary_summary">
                  <div className="min-w-0 admin_order_submissions_page_div_container">
                    <div className="flex flex-wrap items-center gap-2 admin_order_submissions_page_div_container_2">
                      {submission.status === "pending" ? (
                        <span className="border border-[rgb(var(--sep-colour-d19a4c))]/70 bg-[rgb(var(--sep-colour-7a291f))] px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-ffe1ac))] admin_order_submissions_page_span_text">
                          New
                        </span>
                      ) : null}

                      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] admin_order_submissions_page_p_text">
                        Submitted by {submitterName}
                      </p>
                    </div>

                    <h3 className="mt-1 truncate font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))] admin_order_submissions_page_h3_heading">
                      {submission.order_name}
                    </h3>

                    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-817563))] admin_order_submissions_page_p_text_2">
                      {new Date(submission.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 admin_order_submissions_page_div_container_3">
                    <span className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-c1a477))] admin_order_submissions_page_span_text_2">
                      {statusLabel(submission.status)}
                    </span>

                    <span
                      aria-hidden="true"
                      className="text-lg text-[rgb(var(--sep-colour-a98657))] transition-transform group-open:rotate-180 admin_order_submissions_page_span_text_3"
                    >
                      ▾
                    </span>
                  </div>
                </summary>

                <div className="grid gap-5 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-5 lg:grid-cols-2 admin_order_submissions_page_div_container_4">
                  <section className="lg:col-span-2 admin_order_submissions_page_section_section">
                    <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_order_submissions_page_p_text_3">
                      Description
                    </p>
                    <div className="mt-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_order_submissions_page_div_container_5">
                      <RichTextContentClient
                        body={submission.description}
                        className="text-sm leading-7 text-[rgb(var(--sep-colour-b7a58c))]"
                      />
                    </div>
                  </section>

                  <Brief title="Banner Description" body={submission.banner_description} />
                  <Brief title="Icon Description" body={submission.icon_description} />

                  <section className="lg:col-span-2 admin_order_submissions_page_section_section_2">
                    <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_order_submissions_page_p_text_4">
                      Roles by Level
                    </p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3 admin_order_submissions_page_div_container_6">
                      {levels
                        .slice()
                        .sort((a, b) => a.level - b.level)
                        .map((level) => (
                          <div
                            key={level.level}
                            className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_order_submissions_page_div_level_roles"
                          >
                            <h4 className="font-serif text-lg text-[rgb(var(--sep-colour-d2b98f))] admin_order_submissions_page_h4_level_roles">
                              Level {level.level} Roles
                            </h4>
                            <div className="mt-3 space-y-3 admin_order_submissions_page_div_level_roles_2">
                              {level.roles.map((role, index) => (
                                <div
                                  key={`${role.name}-${index}`}
                                  className="border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3 first:border-t-0 first:pt-0 admin_order_submissions_page_div_container_7"
                                >
                                  <p className="text-sm font-semibold text-[rgb(var(--sep-colour-c9af86))] admin_order_submissions_page_p_text_5">
                                    {role.name}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f9281))] admin_order_submissions_page_p_text_6">
                                    {role.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </section>

                  <InlineActionForm
                    action={updateOrderSubmissionAction}
                    successMessage="Review saved."
                    className="lg:col-span-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5"
                  >
                    <input className="admin_order_submissions_page_input_submission_id" type="hidden" name="submissionId" value={submission.id} />
                    <div className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end admin_order_submissions_page_div_container_8">
                      <label className="admin_order_submissions_page_label_label">
                        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_order_submissions_page_span_text_4">
                          Status
                        </span>
                        <select
                          key={`status-${submission.id}-${submission.status}`}
                          name="status"
                          defaultValue={submission.status}
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d8c4a4))] admin_order_submissions_page_select_status"
                        >
                          <option className="admin_order_submissions_page_option_pending" value="pending">Pending</option>
                          <option className="admin_order_submissions_page_option_under_review" value="under_review">Under Review</option>
                          <option className="admin_order_submissions_page_option_accepted" value="accepted">Accepted</option>
                          <option className="admin_order_submissions_page_option_rejected" value="rejected">Rejected</option>
                        </select>
                      </label>

                      <label className="admin_order_submissions_page_label_label_2">
                        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_order_submissions_page_span_text_5">
                          Staff Notes
                        </span>
                        <input
                          name="staffNotes"
                          defaultValue={submission.staff_notes ?? ""}
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d8c4a4))] admin_order_submissions_page_input_staff_notes"
                          placeholder="Optional internal note..."
                        />
                      </label>

                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] admin_order_submissions_page_button_save_review"
                      >
                        Save Review
                      </button>
                    </div>
                  </InlineActionForm>
                </div>
              </details>
            );
          })}

          {(data ?? []).length === 0 ? (
            <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 text-sm text-[rgb(var(--sep-colour-9f9281))] admin_order_submissions_page_div_container_9">
              No Order ideas have been submitted yet.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Brief({ title, body }: { title: string; body: string }) {
  return (
    <section className="admin_order_submissions_page_section_section_3">
      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_order_submissions_page_p_text_7">
        {title}
      </p>
      <p className="mt-2 whitespace-pre-wrap border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 text-xs leading-6 text-[rgb(var(--sep-colour-9f9281))] admin_order_submissions_page_p_text_8">
        {body}
      </p>
    </section>
  );
}
