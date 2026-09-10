import Link from "next/link";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  recordOnlineSafetyReview,
} from "./actions";

type SearchParams = {
  year?: string;
};

type ReportRow = {
  id: string;
  ticket_id: string;
  reason_code: string;
  source_type: string;
  created_at: string;
};

type TicketRow = {
  id: string;
  status: string;
};

type ReviewRow = {
  id: string;
  review_date: string;
  review_type: string;
  notes: string;
  completed_by_label: string;
  created_at: string;
};

const REASON_LABELS:
  Record<string, string> = {
    child_sexual_content:
      "Sexual content involving a minor",
    child_grooming:
      "Grooming / sexual solicitation of a minor",
    suicide_self_harm:
      "Suicide / self-harm",
    eating_disorder:
      "Eating-disorder harm",
    pornographic_media:
      "Pornographic media",
    immediate_safety:
      "Immediate safety concern",
    harassment:
      "Harassment / threats / stalking",
    offensive_inappropriate:
      "Offensive / inappropriate content",
    metagaming_rule_breach:
      "Metagaming / rule breach",
    spam: "Spam",
    impersonation:
      "Impersonation",
    sexual_inappropriate:
      "Other sexual / inappropriate behaviour",
    other: "Other",
  };

const SOURCE_LABELS:
  Record<string, string> = {
    forum_topic:
      "Forum Topics",
    forum_post:
      "Forum Replies",
    direct_message:
      "Private Messages",
    room_message:
      "Location Chats",
    instant_chat_message:
      "Instant Chat",
    character:
      "Character Profiles",
  };

const REVIEW_LABELS:
  Record<string, string> = {
    initial:
      "Initial Review",
    annual:
      "Annual Review",
    serious_incident:
      "Serious Incident Review",
    significant_change:
      "Significant Change Review",
    regulatory_change:
      "Regulatory Change Review",
    other:
      "Other Review",
  };

function countBy(
  rows: ReportRow[],
  key:
    | "reason_code"
    | "source_type",
) {
  const result =
    new Map<string, number>();

  for (const row of rows) {
    const value =
      row[key] || "other";

    result.set(
      value,
      (result.get(value) ?? 0) +
        1,
    );
  }

  return [...result.entries()].sort(
    (a, b) => b[1] - a[1],
  );
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      `${value}T12:00:00Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

function addOneYear(
  value: string,
) {
  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return [
    year + 1,
    String(month).padStart(
      2,
      "0",
    ),
    String(day).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value:
    | number
    | string;
  note?: string;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 admin_safety_page_div_container">
      <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806f5b))] admin_safety_page_p_text">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e1c89d))] admin_safety_page_p_text_2">
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-[9px] leading-5 text-[rgb(var(--sep-colour-8d7b63))] admin_safety_page_p_text_3">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export default async function AdminSafetyPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminSection("safety");

  const params =
    (await searchParams) ?? {};

  const currentYear =
    new Date().getUTCFullYear();

  const requestedYear =
    Number(params.year);

  const year =
    Number.isInteger(
      requestedYear,
    ) &&
    requestedYear >= 2020 &&
    requestedYear <=
      currentYear + 1
      ? requestedYear
      : currentYear;

  const from =
    `${year}-01-01T00:00:00.000Z`;

  const to =
    `${year}-12-31T23:59:59.999Z`;

  const admin =
    createAdminClient();

  const [
    reportsResult,
    obscuredResult,
    reviewsResult,
  ] = await Promise.all([
    admin
      .from("reports")
      .select(
        "id, ticket_id, reason_code, source_type, created_at",
      )
      .gte(
        "created_at",
        from,
      )
      .lte(
        "created_at",
        to,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
    admin
      .from(
        "communication_moderation_actions",
      )
      .select(
        "id, moderated_at",
        {
          count: "exact",
          head: true,
        },
      )
      .gte(
        "moderated_at",
        from,
      )
      .lte(
        "moderated_at",
        to,
      ),
    admin
      .from(
        "online_safety_reviews",
      )
      .select(
        "id, review_date, review_type, notes, completed_by_label, created_at",
      )
      .order(
        "review_date",
        {
          ascending: false,
        },
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
  ]);

  const firstError =
    reportsResult.error ??
    obscuredResult.error ??
    reviewsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load Online Safety records: ${firstError.message}`,
    );
  }

  const reports =
    (reportsResult.data ??
      []) as ReportRow[];

  const reportTicketIds =
    [
      ...new Set(
        reports.map(
          (report) =>
            report.ticket_id,
        ),
      ),
    ];

  const ticketsResult =
    reportTicketIds.length
      ? await admin
          .from("tickets")
          .select(
            "id, status",
          )
          .in(
            "id",
            reportTicketIds,
          )
      : {
          data: [],
          error: null,
        };

  if (ticketsResult.error) {
    throw new Error(
      `Unable to load report outcomes: ${ticketsResult.error.message}`,
    );
  }

  const tickets =
    (ticketsResult.data ??
      []) as TicketRow[];

  const ticketStatus =
    new Map(
      tickets.map(
        (ticket) => [
          ticket.id,
          ticket.status,
        ],
      ),
    );

  const closedReports =
    reports.filter(
      (report) => {
        const status =
          ticketStatus.get(
            report.ticket_id,
          );

        return (
          status ===
            "resolved" ||
          status === "closed"
        );
      },
    ).length;

  const openReports =
    reports.length -
    closedReports;

  const prioritySafetyReasons =
    new Set([
      "child_sexual_content",
      "child_grooming",
      "suicide_self_harm",
      "eating_disorder",
      "pornographic_media",
      "immediate_safety",
    ]);

  const prioritySafetyReports =
    reports.filter(
      (report) =>
        prioritySafetyReasons.has(
          report.reason_code,
        ),
    ).length;

  const reasonCounts =
    countBy(
      reports,
      "reason_code",
    );

  const sourceCounts =
    countBy(
      reports,
      "source_type",
    );

  const reviews =
    (reviewsResult.data ??
      []) as ReviewRow[];

  const lastBaselineReview =
    reviews.find(
      (review) =>
        review.review_type ===
          "initial" ||
        review.review_type ===
          "annual",
    ) ?? null;

  const nextAnnualDue =
    lastBaselineReview
      ? addOneYear(
          lastBaselineReview.review_date,
        )
      : null;

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_safety_page_main_main">
      <div className="mx-auto max-w-[1450px] admin_safety_page_div_container_2">
        <div className="flex flex-wrap items-end justify-between gap-4 admin_safety_page_div_container_3">
          <div className="admin_safety_page_div_online_safety">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_safety_page_p_online_safety">
              Administration · Compliance
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_safety_page_h1_online_safety">
              Online Safety
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-9c8d79))] admin_safety_page_p_online_safety_2">
              Automatic safety statistics from reports and moderation actions, plus the formal Online Safety review register.
            </p>
          </div>

          <form
            method="get"
            className="flex items-center gap-2 admin_safety_page_form_reporting_year"
          >
            <label className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806f5b))] admin_safety_page_label_reporting_year">
              Reporting year
            </label>
            <input
              type="number"
              name="year"
              min={2020}
              max={
                currentYear + 1
              }
              defaultValue={year}
              className="h-9 w-24 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 text-[10px] admin_safety_page_input_year"
            />
            <button
              type="submit"
              className="h-9 border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-3 text-[8px] uppercase tracking-[0.12em] admin_safety_page_button_view"
            >
              View
            </button>
          </form>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 admin_safety_page_section_section">
          <StatCard
            label={`Reports ${year}`}
            value={
              reports.length
            }
          />
          <StatCard
            label="Open / active"
            value={openReports}
          />
          <StatCard
            label="Resolved / closed"
            value={
              closedReports
            }
          />
          <StatCard
            label="Priority safety reports"
            value={
              prioritySafetyReports
            }
            note="Child-safety, self-harm, eating-disorder, pornography and immediate-safety reasons."
          />
          <StatCard
            label="Messages obscured"
            value={
              obscuredResult.count ??
              0
            }
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-2 admin_safety_page_div_container_4">
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_safety_page_section_reports_reason">
            <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dcc49a))] admin_safety_page_h2_reports_reason">
              Reports by Reason
            </h2>

            <div className="mt-4 space-y-2 admin_safety_page_div_reports_reason">
              {reasonCounts.map(
                ([reason, count]) => (
                  <div
                    key={reason}
                    className="flex items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/25 pb-2 text-[10px] admin_safety_page_div_container_5"
                  >
                    <span className="text-[rgb(var(--sep-colour-baa58b))] admin_safety_page_span_text">
                      {REASON_LABELS[
                        reason
                      ] ??
                        reason.replaceAll(
                          "_",
                          " ",
                        )}
                    </span>
                    <span className="font-mono text-[rgb(var(--sep-colour-e1c89d))] admin_safety_page_span_text_2">
                      {count}
                    </span>
                  </div>
                ),
              )}

              {!reasonCounts.length ? (
                <p className="py-6 text-center text-xs italic text-[rgb(var(--sep-colour-776b5b))] admin_safety_page_p_text_4">
                  No reports recorded for this year.
                </p>
              ) : null}
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_safety_page_section_reports_source">
            <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dcc49a))] admin_safety_page_h2_reports_source">
              Reports by Source
            </h2>

            <div className="mt-4 space-y-2 admin_safety_page_div_reports_source">
              {sourceCounts.map(
                ([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/25 pb-2 text-[10px] admin_safety_page_div_container_6"
                  >
                    <span className="text-[rgb(var(--sep-colour-baa58b))] admin_safety_page_span_text_3">
                      {SOURCE_LABELS[
                        source
                      ] ??
                        source.replaceAll(
                          "_",
                          " ",
                        )}
                    </span>
                    <span className="font-mono text-[rgb(var(--sep-colour-e1c89d))] admin_safety_page_span_text_4">
                      {count}
                    </span>
                  </div>
                ),
              )}

              {!sourceCounts.length ? (
                <p className="py-6 text-center text-xs italic text-[rgb(var(--sep-colour-776b5b))] admin_safety_page_p_text_5">
                  No reports recorded for this year.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-5 border border-[rgb(var(--sep-colour-80613b))]/55 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_safety_page_section_section_2">
          <div className="flex flex-wrap items-start justify-between gap-4 admin_safety_page_div_container_7">
            <div className="admin_safety_page_div_risk_assessment_review_schedule">
              <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806f5b))] admin_safety_page_p_risk_assessment_review_schedule">
                Annual Review
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dcc49a))] admin_safety_page_h2_risk_assessment_review_schedule">
                Risk Assessment Review Schedule
              </h2>
            </div>

            <div className="text-right admin_safety_page_div_container_8">
              <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))] admin_safety_page_p_text_6">
                Next annual review due
              </p>
              <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e1c89d))] admin_safety_page_p_text_7">
                {nextAnnualDue
                  ? formatDate(
                      nextAnnualDue,
                    )
                  : "Not established"}
              </p>
            </div>
          </div>

          {lastBaselineReview ? (
            <p className="mt-4 text-[10px] leading-5 text-[rgb(var(--sep-colour-9f8d74))] admin_safety_page_p_text_8">
              Last baseline review:{" "}
              {formatDate(
                lastBaselineReview.review_date,
              )}
              {" · "}
              {REVIEW_LABELS[
                lastBaselineReview.review_type
              ] ??
                lastBaselineReview.review_type}
              {" · "}
              {lastBaselineReview.completed_by_label}
            </p>
          ) : (
            <p className="mt-4 text-[10px] text-[rgb(var(--sep-colour-c98f7f))] admin_safety_page_p_text_9">
              No initial or annual review has been recorded yet.
            </p>
          )}

          <form
            action={
              recordOnlineSafetyReview
            }
            className="mt-5 grid gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-5 lg:grid-cols-[160px_220px_minmax(0,1fr)_auto] admin_safety_page_form_record_online_safety_review"
          >
            <input
              type="date"
              name="reviewDate"
              required
              defaultValue={today}
              className="h-10 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[10px] admin_safety_page_input_review_date"
            />

            <select
              name="reviewType"
              defaultValue="annual"
              className="h-10 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[10px] admin_safety_page_select_review_type"
            >
              <option className="admin_safety_page_option_annual" value="annual">
                Annual review
              </option>
              <option className="admin_safety_page_option_serious_incident" value="serious_incident">
                Serious incident
              </option>
              <option className="admin_safety_page_option_significant_change" value="significant_change">
                Significant service change
              </option>
              <option className="admin_safety_page_option_regulatory_change" value="regulatory_change">
                Regulatory change
              </option>
              <option className="admin_safety_page_option_other" value="other">
                Other review
              </option>
            </select>

            <input
              type="text"
              name="notes"
              required
              maxLength={2000}
              placeholder="What was reviewed, conclusions and any actions required…"
              className="h-10 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[10px] admin_safety_page_input_notes"
            />

            <button
              type="submit"
              className="h-10 border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d5b785))] admin_safety_page_button_record_review"
            >
              Record Review
            </button>
          </form>
        </section>

        <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_safety_page_section_section_3">
          <div className="flex flex-wrap items-center justify-between gap-3 admin_safety_page_div_review_history">
            <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dcc49a))] admin_safety_page_h2_review_history">
              Review History
            </h2>

            <Link
              href="/admin/tickets"
              className="h-10 border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d5b785))]"
            >
              Open moderation tickets →
            </Link>
          </div>

          <div className="mt-4 space-y-2 admin_safety_page_div_container_9">
            {reviews.map(
              (review) => (
                <article
                  key={review.id}
                  className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_safety_page_article_article"
                >
                  <p className="text-[9px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-b99765))] admin_safety_page_p_text_10">
                    {REVIEW_LABELS[
                      review.review_type
                    ] ??
                      review.review_type.replaceAll(
                        "_",
                        " ",
                      )}
                  </p>
                  <p className="mt-1 text-xs text-[rgb(var(--sep-colour-d1bea0))] admin_safety_page_p_text_11">
                    {formatDate(
                      review.review_date,
                    )}
                    {" · "}
                    {review.completed_by_label}
                  </p>

                  <p className="mt-3 whitespace-pre-wrap text-[10px] leading-5 text-[rgb(var(--sep-colour-9e907d))] admin_safety_page_p_text_12">
                    {review.notes}
                  </p>
                </article>
              ),
            )}

            {!reviews.length ? (
              <p className="py-8 text-center text-xs italic text-[rgb(var(--sep-colour-776b5b))] admin_safety_page_p_text_13">
                No Online Safety reviews recorded.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
