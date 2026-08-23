import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import { TicketLiveSync } from "@/components/support/ticket-live-sync";
import { requireStaff } from "@/lib/auth/require-staff";
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
  sourceContext,
  evidenceContext,
  originalCreatedAt,
}: {
  sourceType: string | null;
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

  return `/admin/communication-logs?${params.toString()}`;
}

export default async function AdminTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams?: Promise<{ sanctionError?: string }>;
}) {
  const staff = await requireStaff();
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
        sourceContext: report.source_context,
        evidenceContext:
          firstEvidence?.context_snapshot ?? null,
        originalCreatedAt:
          firstEvidence?.original_created_at ?? null,
      })
    : null;

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <TicketLiveSync reference={ticket.public_reference} admin />

      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/tickets"
          className="text-[8px] uppercase text-[rgb(var(--sep-colour-a58b68))]"
        >
          ← Ticket Queue
        </Link>

        <div className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6">
          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-8c704b))]">
            {ticket.public_reference} · {ticket.category}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
            {ticket.subject}
          </h1>
          <p className="mt-3 text-[9px] text-[rgb(var(--sep-colour-756957))]">
            Opened {fmt(ticket.created_at)}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {ticket.assigned_staff_user_id !== staff.userId ? (
              <form action={assignTicketToSelf}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <button className="border border-[rgb(var(--sep-colour-80613b))] px-4 py-2 text-[8px] uppercase">
                  Assign to Me
                </button>
              </form>
            ) : null}

            <form action={updateTicketState} className="flex gap-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <select
                key={`status-${ticket.status}`}
                name="status"
                defaultValue={ticket.status}
                className="bg-[rgb(var(--sep-colour-100c09))] px-2"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_player">Waiting on Player</option>
                <option value="waiting_on_staff">Waiting on Staff</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                key={`priority-${ticket.priority}`}
                name="priority"
                defaultValue={ticket.priority}
                className="bg-[rgb(var(--sep-colour-100c09))] px-2"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <button className="border border-[rgb(var(--sep-colour-80613b))] px-4 py-2 text-[8px] uppercase">
                Update
              </button>
            </form>
          </div>
        </div>

        {report ? (
          <section className="mt-5 border border-[rgb(var(--sep-colour-8d5b45))]/65 bg-[rgb(var(--sep-colour-1d1110))]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-70483f))]/50 px-5 py-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))]">
                  Moderation Report
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))]">
                  Preserved Evidence
                </h2>
              </div>

              {sourceHref ? (
                <Link
  href={sourceHref}
  target="_blank"
  rel="noopener noreferrer"
  className="..."
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
                  className="bg-[rgb(var(--sep-colour-120e0b))] px-4 py-3"
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
              <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4">
                <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                  Reporter explanation
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-cbbba3))]">
                  {report.explanation}
                </p>
              </div>
            ) : null}

            <div className="space-y-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-5">
              {(evidence ?? []).map((item, index) => {
                const rows = contextRows(item.context_snapshot);

                return (
                  <article
                    key={item.id}
                    className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
                      <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-b58a69))]">
                        Evidence #{index + 1} · {characterProfileFieldLabel(item.context_snapshot) ?? sourceLabel(item.source_type)}
                      </p>
                      <p className="text-[8px] text-[rgb(var(--sep-colour-756957))]">
                        Captured {fmt(item.captured_at)}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
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
                      <div className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[rgb(var(--sep-colour-a65343))] bg-black/20 p-4 text-sm leading-6 text-[rgb(var(--sep-colour-d6c3aa))]">
                        {item.content_snapshot || "(No text snapshot)"}
                      </div>

                      {rows.length > 0 ? (
                        <div className="mt-5">
                          <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                            Captured surrounding context
                          </p>
                          <div className="mt-2 space-y-2">
                            {rows.map((row, rowIndex) => (
                              <div
                                key={row.id ?? `${item.id}-${rowIndex}`}
                                className={`border p-3 text-xs leading-5 ${
                                  row.id === item.source_id
                                    ? "border-[rgb(var(--sep-colour-a65343))] bg-[rgb(var(--sep-colour-2b1512))]"
                                    : "border-[rgb(var(--sep-colour-4f3b28))]/45 bg-black/10"
                                }`}
                              >
                                <p className="mb-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
                                  {row.author_name ??
                                    row.sender_name ??
                                    (row.id === item.source_id
                                      ? "Reported content"
                                      : "Context")}
                                  {row.created_at
                                    ? ` · ${fmt(row.created_at)}`
                                    : ""}
                                </p>
                                <p className="whitespace-pre-wrap break-words text-[rgb(var(--sep-colour-bbaa91))]">
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
          <section className="mt-5 border border-[rgb(var(--sep-colour-7d493f))]/35 bg-[rgb(var(--sep-colour-18100e))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))]">Disciplinary Action</p><h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))]">Sanctions</h2><p className="mt-2 text-xs text-[rgb(var(--sep-colour-9e8c75))]">Target: <strong>{report.reported_name_snapshot ?? "Reported account"}</strong></p></div>
              <Link href="/admin/sanctions" className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-a58b68))]">All Sanctions</Link>
            </div>

            {(linkedSanctions ?? []).length>0?<div className="mt-4 space-y-2">{(linkedSanctions??[]).map(s=><Link key={s.id} href={`/admin/sanctions/${s.id}`} className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 p-3"><span className="text-[9px] uppercase text-[rgb(var(--sep-colour-cdbb9f))]">{sourceLabel(s.sanction_type)}</span><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">{s.status}</span></Link>)}</div>:null}

            <details className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]">
              <summary className="cursor-pointer px-4 py-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]">Issue Sanction</summary>
              <form action={issueSanction} className="grid gap-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-4 lg:grid-cols-2">
                <input type="hidden" name="returnTo" value={`/admin/tickets/${ticket.public_reference}`}/>
                <input type="hidden" name="ticketId" value={ticket.id}/>
                <input type="hidden" name="targetUserId" value={report.reported_user_id}/>
                <input type="hidden" name="targetCharacterId" value={report.reported_character_id ?? ""}/>
                <input type="hidden" name="targetName" value={report.reported_name_snapshot ?? ""}/>

                <label className="block"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Sanction type</span>
                  <select name="sanctionType" required defaultValue="warning" className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm">
                    <option value="warning">Warning</option><option value="communication_restriction">Communication restriction</option><option value="forum_restriction">Forum restriction</option><option value="game_chat_restriction">Game chat restriction</option><option value="feature_restriction">Feature restriction</option><option value="temporary_suspension">Temporary suspension</option><option value="permanent_ban">Permanent ban</option>
                  </select>
                </label>

                <label className="block"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Expiry · required for temporary sanctions</span><input type="datetime-local" name="expiresAt" className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm"/></label>

                <label className="block lg:col-span-2"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Reason code</span><input name="reasonCode" required maxLength={120} defaultValue={report.reason_code ?? ""} className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm"/></label>

                <label className="block lg:col-span-2"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Player-facing reason</span><textarea name="playerReason" required rows={5} maxLength={5000} placeholder="Explain the sanction clearly to the player. Do not include private staff notes." className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6"/></label>

                <label className="block lg:col-span-2"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Internal rationale · staff only</span><textarea name="internalRationale" rows={5} maxLength={10000} className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6"/></label>

                <div className="lg:col-span-2"><button className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-5 py-3 text-[8px] uppercase text-[rgb(var(--sep-colour-e0a69a))]">Issue Sanction</button></div>
              </form>
            </details>
            {sanctionError ? <div role="alert" className="mt-3 border-l-2 border-red-800/70 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">{sanctionError}</div> : null}
          </section>
        ) : null}

        <div className="mt-5 space-y-3">
          {(messages ?? []).map((message) => (
            <div
              key={message.id}
              className={`border p-5 ${
                message.visibility === "internal"
                  ? "border-dashed border-[rgb(var(--sep-colour-9a7749))]/65"
                  : "border-[rgb(var(--sep-colour-60482e))]/45"
              }`}
            >
              <div className="text-[8px] uppercase text-[rgb(var(--sep-colour-8c704b))]">
                {message.visibility === "internal"
                  ? "Internal Staff Note"
                  : message.author_user_id === ticket.opened_by_user_id
                    ? "Player"
                    : "Staff"}{" "}
                · {fmt(message.created_at)}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                {message.body}
              </p>
            </div>
          ))}
        </div>

        {ticket.status !== "closed" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {[false, true].map((internal) => (
              <form
                key={String(internal)}
                action={staffTicketMessage}
                className="border border-[rgb(var(--sep-colour-60482e))]/45 p-5"
              >
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input
                  type="hidden"
                  name="internal"
                  value={String(internal)}
                />
                <div className="text-[8px] uppercase">
                  {internal ? "Internal Staff Note" : "Reply to Player"}
                </div>
                <textarea
                  name="body"
                  required
                  maxLength={10000}
                  rows={7}
                  className="mt-3 w-full bg-[rgb(var(--sep-colour-100c09))] p-3"
                />
                <button className="mt-3 border border-[rgb(var(--sep-colour-80613b))] px-4 py-2 text-[8px] uppercase">
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
