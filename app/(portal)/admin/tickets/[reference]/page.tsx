

import { notFound, redirect } from "next/navigation";
import { TicketLiveSync } from "@/components/support/ticket-live-sync";
import Link from "next/link";
import {
  requireAdminSection,
  canHandleTicketCategory,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import { issueSanction } from "@/app/(portal)/admin/sanctions/actions";

import {
  assignTicketToSelf,
  staffTicketMessage,
  updateTicketState,
} from "../actions";

function fmt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sourceLabel(value: string | null) {
  return (value ?? "content")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reasonLabel(value: string | null) {
  return (value ?? "Not specified")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeInternalHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  return href.startsWith("/") && !href.startsWith("//") ? href : null;
}

function isoDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function objectRecord(
  value: unknown,
): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function characterProfileFieldLabel(
  value: unknown,
): string | null {
  const record = objectRecord(value);
  return typeof record?.character_profile_field_label === "string"
    ? record.character_profile_field_label
    : null;
}

type ContextMessage = {
  id?: string;
  body?: string;
  message?: string;
  created_at?: string;
  author_name?: string;
  sender_name?: string;
};

function contextRows(context: unknown): ContextMessage[] {
  if (!context || typeof context !== "object") return [];
  const record = context as Record<string, unknown>;
  const candidate =
    record.surrounding_posts ??
    record.surrounding_messages;

  return Array.isArray(candidate)
    ? candidate.filter(
        (row): row is ContextMessage =>
          Boolean(row) && typeof row === "object",
      )
    : [];
}

function reportSourceHref({
  sourceType,
  sourceId,
  sourceContext,
  evidenceContext,
  originalCreatedAt,
}: {
  sourceType: string | null;
  sourceId: string | null;
  sourceContext: unknown;
  evidenceContext: unknown;
  originalCreatedAt: string | null;
}): string | null {
  const source = objectRecord(sourceContext);

  if (
    sourceType === "forum_topic" ||
    sourceType === "forum_post"
  ) {
    return safeInternalHref(source?.url);
  }

  const evidence = objectRecord(evidenceContext);
  const rows = contextRows(evidenceContext);

  const dates = rows
    .map((row) =>
      typeof row.created_at === "string"
        ? new Date(row.created_at)
        : null,
    )
    .filter(
  (date): date is Date =>
    date instanceof Date &&
    !Number.isNaN(date.getTime()),
)
    .sort(
      (a, b) =>
        a.getTime() - b.getTime(),
    );

  const from = isoDay(
    dates[0]?.toISOString() ??
      originalCreatedAt,
  );

  const to = isoDay(
    dates.at(-1)?.toISOString() ??
      originalCreatedAt,
  );

  const params = new URLSearchParams();

  if (sourceType === "room_message") {
    params.set("view", "chat");

    const room = objectRecord(
      evidence?.room,
    );

    const roomId =
      typeof room?.id === "string"
        ? room.id
        : typeof source?.room_id === "string"
          ? source.room_id
          : null;

    if (roomId) {
      params.set("room", roomId);
    }
  } else if (
    sourceType === "direct_message"
  ) {
    params.set("view", "pm");

    const conversationId =
      typeof evidence?.conversation_id === "string"
        ? evidence.conversation_id
        : typeof source?.conversation_id === "string"
          ? source.conversation_id
          : null;

    if (conversationId) {
      params.set(
        "conversation",
        conversationId,
      );
    }
  } else if (
    sourceType === "instant_chat_message"
  ) {
    params.set("view", "instant");

    const conversationId =
      typeof evidence?.conversation_id === "string"
        ? evidence.conversation_id
        : typeof source?.conversation_id === "string"
          ? source.conversation_id
          : null;

    if (conversationId) {
      params.set(
        "conversation",
        conversationId,
      );
    }
  } else {
    return safeInternalHref(source?.url);
  }

  if (from) params.set("from", from);
  if (to) params.set("to", to);

  if (
    sourceId &&
    (
      sourceType === "room_message" ||
      sourceType === "direct_message" ||
      sourceType === "instant_chat_message"
    )
  ) {
    params.set(
      "message",
      sourceId,
    );
  }

  const base =
    `/admin/communication-logs?${params.toString()}`;

  return sourceId
    ? `${base}#message-${sourceId}`
    : base;
}

export default async function AdminTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams?: Promise<{ sanctionError?: string }>;
}) {
  const staff = await requireAdminSection("tickets");
  const { reference } = await params;
  const query = (await searchParams) ?? {};
  const sanctionError = query.sanctionError ?? null;
  const admin = createAdminClient();

  const { data: ticket, error } = await admin
    .from("tickets")
    .select(
      "id,public_reference,category,status,priority,subject,opened_by_user_id,opened_by_character_id,assigned_staff_user_id,created_at",
    )
    .eq("public_reference", reference)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!ticket) notFound();

  if (
    !canHandleTicketCategory(
      staff.role,
      ticket.category,
    )
  ) {
    redirect("/admin/tickets");
  }

  const {
    data: openerCharacter,
    error: openerCharacterError,
  } = ticket.opened_by_character_id
    ? await admin
        .from("characters")
        .select(
          "display_name,first_name,surname",
        )
        .eq(
          "id",
          ticket.opened_by_character_id,
        )
        .maybeSingle()
    : {
        data: null,
        error: null,
      };

  if (openerCharacterError) {
    throw new Error(
      openerCharacterError.message,
    );
  }

  const openerName =
    openerCharacter?.display_name?.trim() ||
    `${openerCharacter?.first_name ?? ""} ${openerCharacter?.surname ?? ""}`.trim() ||
    "Player";

  const [
    { data: messages, error: messageError },
    reportResult,
    evidenceResult,
  ] = await Promise.all([
    admin
      .from("ticket_messages")
      .select("id,author_user_id,visibility,body,created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
    ticket.category === "report"
      ? admin
          .from("reports")
          .select(
            "id,reporter_name_snapshot,reported_name_snapshot,reported_user_id,reported_character_id,reason_code,explanation,source_type,source_id,source_context,created_at",
          )
          .eq("ticket_id", ticket.id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),
    ticket.category === "report"
      ? admin
          .from("report_evidence")
          .select(
            "id,evidence_type,source_type,source_id,author_name_snapshot,content_snapshot,original_created_at,context_snapshot,captured_at",
          )
          .eq("ticket_id", ticket.id)
          .order("captured_at", {
            ascending: true,
          })
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (messageError) throw new Error(messageError.message);
  if (reportResult.error) throw new Error(reportResult.error.message);
  if (evidenceResult.error) throw new Error(evidenceResult.error.message);

  const report = reportResult.data;
  const evidence = evidenceResult.data ?? [];
  const firstEvidence = evidence[0] ?? null;

  const { data: linkedSanctions, error: linkedSanctionsError } = await admin
    .from("sanctions")
    .select("id,sanction_type,status,target_name_snapshot,issued_at")
    .eq("ticket_id", ticket.id)
    .order("issued_at", { ascending: false });

  if (linkedSanctionsError) throw new Error(linkedSanctionsError.message);

  const sourceHref = report
  ? reportSourceHref({
      sourceType: report.source_type,
      sourceId: report.source_id,
      sourceContext: report.source_context,
      evidenceContext:
        firstEvidence?.context_snapshot ?? null,
      originalCreatedAt:
        firstEvidence?.original_created_at ?? null,
    })
  : null;

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_tickets_reference_page_main_main">
      <TicketLiveSync reference={ticket.public_reference} admin />

      <div className="mx-auto max-w-5xl admin_tickets_reference_page_div_container">
        <Link
          href="/admin/tickets"
          className="border border-[rgb(var(--sep-colour-80613b))] px-4 py-2 text-[8px] uppercase"
        >
          ← Ticket Queue
        </Link>

        <div className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 admin_tickets_reference_page_div_container_2">
          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-8c704b))] admin_tickets_reference_page_p_text">
            {ticket.public_reference} · {ticket.category}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))] admin_tickets_reference_page_h1_title">
            {ticket.subject}
          </h1>
          <p className="mt-3 text-[9px] text-[rgb(var(--sep-colour-756957))] admin_tickets_reference_page_p_text_2">
            Opened by {openerName} · {fmt(ticket.created_at)}
          </p>

          <div className="mt-5 flex flex-wrap gap-3 admin_tickets_reference_page_div_container_3">
            {ticket.assigned_staff_user_id !== staff.userId ? (
              <form className="admin_tickets_reference_page_form_assign_ticket_self" action={assignTicketToSelf}>
                <input className="admin_tickets_reference_page_input_ticket_id" type="hidden" name="ticketId" value={ticket.id} />
                <button className="border border-[rgb(var(--sep-colour-80613b))] px-4 py-2 text-[8px] uppercase admin_tickets_reference_page_button_assign">
                  Assign to Me
                </button>
              </form>
            ) : null}

            <form action={updateTicketState} className="flex gap-2 admin_tickets_reference_page_form_update_ticket_state">
              <input className="admin_tickets_reference_page_input_ticket_id_2" type="hidden" name="ticketId" value={ticket.id} />
              <select
                key={`status-${ticket.status}`}
                name="status"
                defaultValue={ticket.status}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-a47a44))]/40 admin_tickets_reference_page_select_status"
              >
                <option className="admin_tickets_reference_page_option_open" value="open">Open</option>
                <option className="admin_tickets_reference_page_option_progress" value="in_progress">In Progress</option>
                <option className="admin_tickets_reference_page_option_waiting_player" value="waiting_on_player">Waiting on Player</option>
                <option className="admin_tickets_reference_page_option_waiting_staff" value="waiting_on_staff">Waiting on Staff</option>
                <option className="admin_tickets_reference_page_option_resolved" value="resolved">Resolved</option>
                <option className="admin_tickets_reference_page_option_closed" value="closed">Closed</option>
              </select>

              <select
                key={`priority-${ticket.priority}`}
                name="priority"
                defaultValue={ticket.priority}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-a47a44))]/40 admin_tickets_reference_page_select_priority"
              >
                <option className="admin_tickets_reference_page_option_low" value="low">Low</option>
                <option className="admin_tickets_reference_page_option_normal" value="normal">Normal</option>
                <option className="admin_tickets_reference_page_option_high" value="high">High</option>
                <option className="admin_tickets_reference_page_option_urgent" value="urgent">Urgent</option>
              </select>

              <button className="border border-[rgb(var(--sep-colour-80613b))] px-4 py-2 text-[8px] uppercase admin_tickets_reference_page_button_update">
                Update
              </button>
            </form>
          </div>
        </div>

        {report ? (
          <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-1d1110))] admin_tickets_reference_page_section_section">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/50 px-5 py-4 admin_tickets_reference_page_header_header">
              <div className="admin_tickets_reference_page_div_preserved_evidence">
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))] admin_tickets_reference_page_p_preserved_evidence">
                  Moderation Report
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))] admin_tickets_reference_page_h2_preserved_evidence">
                  Preserved Evidence
                </h2>
              </div>

              {sourceHref ? (
                <Link
  href={sourceHref}
  className="inline-flex h-9 items-center justify-center border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))] transition hover:border-[rgb(var(--sep-colour-ad824d))] hover:bg-[rgb(var(--sep-colour-332318))]"
>
  {report.source_type === "forum_topic" ||
  report.source_type === "forum_post"
    ? "Open Original Source"
    : report.source_type === "character"
      ? "Open Character Profile"
      : "Open Communication Logs"}
</Link>
              ) : null}
            </header>

            <dl className="grid gap-px bg-[rgb(var(--sep-colour-60482e))]/30 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Reporter", report.reporter_name_snapshot ?? "Unknown"],
                ["Reported", report.reported_name_snapshot ?? "Unknown"],
                ["Reason", reasonLabel(report.reason_code)],
                ["Source", sourceLabel(report.source_type)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="bg-[rgb(var(--sep-colour-120e0b))] px-4 py-3 admin_tickets_reference_page_div_container_4"
                >
                  <dt className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xs text-[rgb(var(--sep-colour-cdbb9f))]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {report.explanation ? (
              <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 admin_tickets_reference_page_div_container_5">
                <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))] admin_tickets_reference_page_p_text_3">
                  Reporter explanation
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-cbbba3))] admin_tickets_reference_page_p_text_4">
                  {report.explanation}
                </p>
              </div>
            ) : null}

            <div className="space-y-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-5 admin_tickets_reference_page_div_container_6">
              {(evidence ?? []).map((item, index) => {
                const rows = contextRows(item.context_snapshot);

                return (
                  <article
                    key={item.id}
                    className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] admin_tickets_reference_page_article_article"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3 admin_tickets_reference_page_div_container_7">
                      <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-b58a69))] admin_tickets_reference_page_p_text_5">
                        Evidence #{index + 1} · {characterProfileFieldLabel(item.context_snapshot) ?? sourceLabel(item.source_type)}
                      </p>
                      <p className="text-[8px] text-[rgb(var(--sep-colour-756957))] admin_tickets_reference_page_p_text_6">
                        Captured {fmt(item.captured_at)}
                      </p>
                    </div>

                    <div className="p-4 admin_tickets_reference_page_div_container_8">
                      <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))] admin_tickets_reference_page_p_text_7">
                        {characterProfileFieldLabel(item.context_snapshot)
                          ? `Preserved ${characterProfileFieldLabel(item.context_snapshot)}`
                          : "Original content"}
                        {item.author_name_snapshot
                          ? ` · ${item.author_name_snapshot}`
                          : ""}
                        {item.original_created_at
                          ? ` · ${fmt(item.original_created_at)}`
                          : ""}
                      </p>
                      <div className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[rgb(var(--sep-colour-a65343))] bg-black/20 p-4 text-sm leading-6 text-[rgb(var(--sep-colour-d6c3aa))] admin_tickets_reference_page_div_container_9">
                        {item.content_snapshot || "(No text snapshot)"}
                      </div>

                      {rows.length > 0 ? (
                        <div className="mt-5 admin_tickets_reference_page_div_container_10">
                          <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))] admin_tickets_reference_page_p_text_8">
                            Captured surrounding context
                          </p>
                          <div className="mt-2 space-y-2 admin_tickets_reference_page_div_container_11">
                            {rows.map((row, rowIndex) => (
                              <div
                                key={row.id ?? `${item.id}-${rowIndex}`}
                                className={[((`border p-3 text-xs leading-5 ${
                                  row.id === item.source_id
                                    ? "border-[rgb(var(--sep-colour-a65343))] bg-[rgb(var(--sep-colour-2b1512))]"
                                    : "border-[rgb(var(--sep-colour-4f3b28))]/45 bg-black/10"
                                }`)), "admin_tickets_reference_page_div_container_12"].filter(Boolean).join(" ")}
                              >
                                <p className="mb-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))] admin_tickets_reference_page_p_text_9">
                                  {row.author_name ??
                                    row.sender_name ??
                                    (row.id === item.source_id
                                      ? "Reported content"
                                      : "Context")}
                                  {row.created_at
                                    ? ` · ${fmt(row.created_at)}`
                                    : ""}
                                </p>
                                <p className="whitespace-pre-wrap break-words text-[rgb(var(--sep-colour-bbaa91))] admin_tickets_reference_page_p_text_10">
                                  {row.body ?? row.message ?? "(No text)"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {report?.reported_user_id ? (
          <section className="mt-5 border border border-amber-900/55 bg-[rgb(var(--sep-colour-18100e))] p-5 admin_tickets_reference_page_section_section_2">
            <div className="flex flex-wrap items-start justify-between gap-4 admin_tickets_reference_page_div_container_13">
              <div className="admin_tickets_reference_page_div_sanctions"><p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))] admin_tickets_reference_page_p_sanctions">Disciplinary Action</p><h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))] admin_tickets_reference_page_h2_sanctions">Sanctions</h2><p className="mt-2 text-xs text-[rgb(var(--sep-colour-9e8c75))] admin_tickets_reference_page_p_sanctions_2">Target: <strong className="admin_tickets_reference_page_strong_sanctions">{report.reported_name_snapshot ?? "Reported account"}</strong></p></div>
              <Link href="/admin/sanctions" className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-a58b68))]">All Sanctions</Link>
            </div>

            {(linkedSanctions ?? []).length>0?<div className="mt-4 space-y-2 admin_tickets_reference_page_div_container_14">{(linkedSanctions??[]).map(s=><Link key={s.id} href={`/admin/sanctions/${s.id}`} className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 p-3"><span className="text-[9px] uppercase text-[rgb(var(--sep-colour-cdbb9f))] admin_tickets_reference_page_span_text">{sourceLabel(s.sanction_type)}</span><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))] admin_tickets_reference_page_span_text_2">{s.status}</span></Link>)}</div>:null}

            <details className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] admin_tickets_reference_page_details_issue_sanction">
              <summary className="cursor-pointer px-4 py-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))] admin_tickets_reference_page_summary_issue_sanction">Issue Sanction</summary>
              <form action={issueSanction} className="grid gap-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-4 lg:grid-cols-2 admin_tickets_reference_page_form_issue_sanction">
                <input className="admin_tickets_reference_page_input_return" type="hidden" name="returnTo" value={`/admin/tickets/${ticket.public_reference}`}/>
                <input className="admin_tickets_reference_page_input_ticket_id_3" type="hidden" name="ticketId" value={ticket.id}/>
                <input className="admin_tickets_reference_page_input_issue_sanction" type="hidden" name="targetUserId" value={report.reported_user_id}/>
                <input className="admin_tickets_reference_page_input_issue_sanction_2" type="hidden" name="targetCharacterId" value={report.reported_character_id ?? ""}/>
                <input className="admin_tickets_reference_page_input_issue_sanction_3" type="hidden" name="targetName" value={report.reported_name_snapshot ?? ""}/>

                <label className="block admin_tickets_reference_page_label_issue_sanction"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))] admin_tickets_reference_page_span_issue_sanction">Sanction type</span>
                  <select name="sanctionType" required defaultValue="warning" className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm admin_tickets_reference_page_select_sanction_type">
                    <option className="admin_tickets_reference_page_option_warning" value="warning">Warning</option><option className="admin_tickets_reference_page_option_communication_restriction" value="communication_restriction">Communication restriction</option><option className="admin_tickets_reference_page_option_forum_restriction" value="forum_restriction">Forum restriction</option><option className="admin_tickets_reference_page_option_game_chat_restriction" value="game_chat_restriction">Game chat restriction</option><option className="admin_tickets_reference_page_option_feature_restriction" value="feature_restriction">Feature restriction</option><option className="admin_tickets_reference_page_option_temporary_suspension" value="temporary_suspension">Temporary suspension</option><option className="admin_tickets_reference_page_option_permanent_ban" value="permanent_ban">Permanent ban</option>
                  </select>
                </label>

                <label className="block admin_tickets_reference_page_label_issue_sanction_2"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))] admin_tickets_reference_page_span_issue_sanction_2">Expiry · required for temporary sanctions</span><input type="datetime-local" name="expiresAt" className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm admin_tickets_reference_page_input_expires"/></label>

                <label className="block lg:col-span-2 admin_tickets_reference_page_label_issue_sanction_3"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))] admin_tickets_reference_page_span_issue_sanction_3">Reason code</span><input name="reasonCode" required maxLength={120} defaultValue={report.reason_code ?? ""} className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm admin_tickets_reference_page_input_reason_code"/></label>

                <label className="block lg:col-span-2 admin_tickets_reference_page_label_issue_sanction_4"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))] admin_tickets_reference_page_span_issue_sanction_4">Player-facing reason</span><textarea name="playerReason" required rows={5} maxLength={5000} placeholder="Explain the sanction clearly to the player. Do not include private staff notes." className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6 admin_tickets_reference_page_textarea_player_reason"/></label>

                <label className="block lg:col-span-2 admin_tickets_reference_page_label_issue_sanction_5"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))] admin_tickets_reference_page_span_issue_sanction_5">Internal rationale · staff only</span><textarea name="internalRationale" rows={5} maxLength={10000} className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6 admin_tickets_reference_page_textarea_internal_rationale"/></label>

                <div className="lg:col-span-2 admin_tickets_reference_page_div_issue_sanction"><button className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-5 py-3 text-[8px] uppercase text-[rgb(var(--sep-colour-e0a69a))] admin_tickets_reference_page_button_issue_sanction">Issue Sanction</button></div>
              </form>
            </details>
            {sanctionError ? <div role="alert" className="mt-3 border-l-2 border-red-800/70 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300 admin_tickets_reference_page_div_alert">{sanctionError}</div> : null}
          </section>
        ) : null}

        <div className="mt-5 space-y-3 admin_tickets_reference_page_div_container_15">
          {(messages ?? []).map((message) => (
            <div
              key={message.id}
              className={[((`border p-5 ${
                message.visibility === "internal"
                  ? "border-dashed border-[rgb(var(--sep-colour-9a7749))]/65"
                  : "border-[rgb(var(--sep-colour-60482e))]/45"
              }`)), "admin_tickets_reference_page_div_container_16"].filter(Boolean).join(" ")}
            >
              <div className="text-[8px] uppercase text-[rgb(var(--sep-colour-8c704b))] admin_tickets_reference_page_div_container_17">
                {message.visibility === "internal"
                  ? "Internal Staff Note"
                  : message.author_user_id === ticket.opened_by_user_id
                    ? openerName
                    : "Staff"}{" "}
                · {fmt(message.created_at)}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 admin_tickets_reference_page_p_text_11">
                {message.body}
              </p>
            </div>
          ))}
        </div>

        {ticket.status !== "closed" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2 admin_tickets_reference_page_div_container_18">
            {[false, true].map((internal) => (
              <form
                key={String(internal)}
                action={staffTicketMessage}
                className="border border-[rgb(var(--sep-colour-60482e))]/45 p-5 admin_tickets_reference_page_form_staff_ticket_message"
              >
                <input className="admin_tickets_reference_page_input_ticket_id_4" type="hidden" name="ticketId" value={ticket.id} />
                <input className="admin_tickets_reference_page_input_internal"
                  type="hidden"
                  name="internal"
                  value={String(internal)}
                />
                <div className="text-[8px] uppercase admin_tickets_reference_page_div_container_19">
                  {internal ? "Internal Staff Note" : "Reply to Player"}
                </div>
                <textarea
                  name="body"
                  required
                  maxLength={10000}
                  rows={7}
                  className="mt-3 w-full bg-[rgb(var(--sep-colour-100c09))] p-3 admin_tickets_reference_page_textarea_body"
                />
                <button className="mt-3 border border-[rgb(var(--sep-colour-80613b))] px-4 py-2 text-[8px] uppercase admin_tickets_reference_page_button_action">
                  {internal ? "Add Internal Note" : "Send Reply"}
                </button>
              </form>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
