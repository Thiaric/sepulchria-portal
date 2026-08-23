#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

BASELINE = "e0b7e7a4898ff591047d2487f342e313c1bd2f72"

def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()

def once(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"ERROR: {label}: expected anchor once, found {n}. Nothing written.")
    return text.replace(old, new, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--allow-different-head", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        raise SystemExit("ERROR: run this from the sepulchria-portal repository root.")

    head = git("rev-parse", "HEAD")
    if head != BASELINE and not args.allow_different_head:
        raise SystemExit(
            f"ERROR: HEAD is {head}; patch baseline is {BASELINE}.\n"
            "If the only difference is known/safe, rerun with --allow-different-head."
        )

    paths = {
        "button": root / "components/reports/report-button.tsx",
        "forum_post": root / "components/forum/topic-post.tsx",
        "forum_page": root / "app/(portal)/forum/[sectionSlug]/[topicSlug]/page.tsx",
        "pm": root / "app/(portal)/messages/[id]/components/ConversationMessageList.tsx",
        "room": root / "app/(portal)/game/components/RoomMessageList.tsx",
        "instant": root / "components/instant-chat/instant-chat-dock.tsx",
        "admin_ticket": root / "app/(portal)/admin/tickets/[reference]/page.tsx",
        "live": root / "components/support/ticket-live-sync.tsx",
    }
    for p in paths.values():
        if not p.exists():
            raise SystemExit(f"ERROR: missing {p.relative_to(root)}. Nothing written.")

    sql_path = root / "supabase/patches/20260823_phase3_1_report_fixes.sql"
    if sql_path.exists():
        raise SystemExit(f"ERROR: {sql_path.relative_to(root)} already exists. Nothing written.")

    changes: dict[Path, str] = {}

    # 1) Report button variants: normal forum button, toolbar PM button, tiny icon for compact surfaces.
    p = paths["button"]
    s = p.read_text(encoding="utf-8")
    s = once(
        s,
        'import Link from "next/link";\nimport { useState } from "react";',
        'import Link from "next/link";\nimport { Flag } from "lucide-react";\nimport { useState } from "react";',
        "report button Flag import",
    )
    s = once(
        s,
        '''  label = "Report",
  compact = false,
}: {
  sourceType: ReportSourceType;
  sourceId: string;
  label?: string;
  compact?: boolean;
}) {''',
        '''  label = "Report",
  compact = false,
  toolbar = false,
}: {
  sourceType: ReportSourceType;
  sourceId: string;
  label?: string;
  compact?: boolean;
  toolbar?: boolean;
}) {''',
        "report button props",
    )
    s = once(
        s,
        '''        className={
          compact
            ? "text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8c7860))] transition hover:text-[rgb(var(--sep-colour-d7a698))]"
            : "border border-[rgb(var(--sep-colour-70483f))]/65 bg-[rgb(var(--sep-colour-211311))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c99589))] transition hover:border-[rgb(var(--sep-colour-a65d51))] hover:text-[rgb(var(--sep-colour-e4b0a5))]"
        }
      >
        {label}
      </button>''',
        '''        title={compact ? "Report this content" : undefined}
        aria-label={compact ? "Report this content" : undefined}
        className={
          compact
            ? "inline-flex h-5 w-5 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-70483f))]/55 bg-[rgb(var(--sep-colour-17110d))] text-[rgb(var(--sep-colour-9b765e))] transition hover:border-[rgb(var(--sep-colour-a65d51))] hover:text-[rgb(var(--sep-colour-e4b0a5))]"
            : toolbar
              ? "border border-[rgb(var(--sep-colour-7b4035))]/80 bg-[rgb(var(--sep-colour-27120f))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:border-[rgb(var(--sep-colour-ad5a4c))] hover:bg-[rgb(var(--sep-colour-391713))] hover:text-[rgb(var(--sep-colour-f1b2a5))]"
              : "border border-[rgb(var(--sep-colour-70483f))]/65 bg-[rgb(var(--sep-colour-211311))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c99589))] transition hover:border-[rgb(var(--sep-colour-a65d51))] hover:text-[rgb(var(--sep-colour-e4b0a5))]"
        }
      >
        {compact ? <Flag aria-hidden="true" className="h-2.5 w-2.5" /> : label}
      </button>''',
        "report button visual variants",
    )
    changes[p] = s

    # 2) Forum: hide report UI on own topics/replies while retaining server-side own-content protection.
    p = paths["forum_post"]
    s = p.read_text(encoding="utf-8")
    s = once(
        s,
        '''  canDelete: boolean;
  canQuote: boolean;
  canModerate: boolean;''',
        '''  canDelete: boolean;
  canQuote: boolean;
  canReport: boolean;
  canModerate: boolean;''',
        "forum canReport prop type",
    )
    s = once(
        s,
        '''  canDelete,
  canQuote,
  canModerate,''',
        '''  canDelete,
  canQuote,
  canReport,
  canModerate,''',
        "forum canReport destructure",
    )
    s = once(
        s,
        '''                {!isDeleted ? (
                  <ReportButton''',
        '''                {!isDeleted && canReport ? (
                  <ReportButton''',
        "forum own report visibility",
    )
    changes[p] = s

    p = paths["forum_page"]
    s = p.read_text(encoding="utf-8")
    s = once(
        s,
        '''                canQuote={
                  !post.author_character_id ||
                  !blockedForumCharacterIds.has(
                    post.author_character_id,
                  )
                }
                canModerate={''',
        '''                canQuote={
                  !post.author_character_id ||
                  !blockedForumCharacterIds.has(
                    post.author_character_id,
                  )
                }
                canReport={
                  Boolean(user) &&
                  !ownsPost
                }
                canModerate={''',
        "forum pass canReport",
    )
    changes[p] = s

    # 3) PM: remove floating report and place it beside Delete, same visual family.
    p = paths["pm"]
    s = p.read_text(encoding="utf-8")
    s = once(
        s,
        '''                {!own ? (
                  <div className="absolute bottom-2 right-2 z-10">
                    <ReportButton
                      sourceType="direct_message"
                      sourceId={message.id}
                      compact
                    />
                  </div>
                ) : null}

''',
        "",
        "remove floating PM report",
    )
    anchor = '''                        <form
                          action={
                            deletePrivateMessages
                          }'''
    replacement = '''                        {!own ? (
                          <ReportButton
                            sourceType="direct_message"
                            sourceId={message.id}
                            toolbar
                          />
                        ) : null}

''' + anchor
    s = once(s, anchor, replacement, "PM report beside Delete")
    changes[p] = s

    # 4) Room/game: compact report becomes a real tiny flag icon.
    p = paths["room"]
    s = p.read_text(encoding="utf-8")
    if s.count('sourceType="room_message"') != 3:
        raise SystemExit(
            f'ERROR: room report surfaces: expected 3, found {s.count("sourceType=" + chr(34) + "room_message" + chr(34))}. Nothing written.'
        )
    # ReportButton compact now renders an icon. For ordinary messages, move it out of the identity column.
    old = '''    {item.character_id &&
    item.character_id !== viewerCharacterId ? (
      <ReportButton
        sourceType="room_message"
        sourceId={item.id}
        compact
      />
    ) : null}
  </div>

  {/* Message */}
  <div className="min-w-0 flex-1">'''
    new = '''  </div>

  {/* Message */}
  <div className="min-w-0 flex-1">'''
    s = once(s, old, new, "remove room report under timestamp")
    old2 = '''      <ActionSpeechText
        content={
          item.message
        }'''
    new2 = '''      <ActionSpeechText
        content={
          item.message
        }'''
    # keep body unchanged; append icon after message column instead.
    end_anchor = '''    </div>
  </div>
</article>
                );'''
    end_replacement = '''    </div>
  </div>

  {item.character_id &&
  item.character_id !== viewerCharacterId ? (
    <div className="ml-auto shrink-0 pt-0.5">
      <ReportButton
        sourceType="room_message"
        sourceId={item.id}
        compact
      />
    </div>
  ) : null}
</article>
                );'''
    s = once(s, end_anchor, end_replacement, "room report separate icon column")
    changes[p] = s

    # 5) Instant Chat: move report icon outside the message bubble.
    p = paths["instant"]
    s = p.read_text(encoding="utf-8")
    old = '''                          {!own ? (
                            <div className="mt-1 text-right">
                              <ReportButton
                                sourceType="instant_chat_message"
                                sourceId={message.id}
                                compact
                              />
                            </div>
                          ) : null}

'''
    s = once(s, old, "", "remove instant report inside bubble")
    old = '''                        </div>
                      </div>
                    );'''
    new = '''                        </div>

                        {!own ? (
                          <div className="shrink-0 self-end pb-0.5">
                            <ReportButton
                              sourceType="instant_chat_message"
                              sourceId={message.id}
                              compact
                            />
                          </div>
                        ) : null}
                      </div>
                    );'''
    s = once(s, old, new, "instant report outside bubble")
    changes[p] = s

    # 6) Admin queue: guarantee visible queue refresh on every successful poll.
    p = paths["live"]
    s = p.read_text(encoding="utf-8")
    s = once(
        s,
        '''        const sig=signatureForPayload(await r.json());
        if(last.current===null)last.current=sig;
        else if(last.current!==sig){last.current=sig;router.refresh();}
        await markRead();''',
        '''        const sig=signatureForPayload(await r.json());
        if(last.current===null)last.current=sig;
        else if(last.current!==sig){last.current=sig;router.refresh();}
        if(admin&&!reference)router.refresh();
        await markRead();''',
        "admin ticket queue hard live refresh",
    )
    changes[p] = s

    # 7) Admin ticket: show report metadata, source link, preserved evidence and captured context.
    p = paths["admin_ticket"]
    changes[p] = r'''import Link from "next/link";
import { notFound } from "next/navigation";

import { TicketLiveSync } from "@/components/support/ticket-live-sync";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

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

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const staff = await requireStaff();
  const { reference } = await params;
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

  const [{ data: messages, error: messageError }, reportResult] =
    await Promise.all([
      admin
        .from("ticket_messages")
        .select("id,author_user_id,visibility,body,created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
      ticket.category === "report"
        ? admin
            .from("reports")
            .select(
              "id,reporter_name_snapshot,reported_name_snapshot,reason_code,explanation,source_type,source_id,source_context,created_at",
            )
            .eq("ticket_id", ticket.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (messageError) throw new Error(messageError.message);
  if (reportResult.error) throw new Error(reportResult.error.message);

  const report = reportResult.data;

  const { data: evidence, error: evidenceError } = report
    ? await admin
        .from("report_evidence")
        .select(
          "id,evidence_type,source_type,source_id,author_name_snapshot,content_snapshot,original_created_at,context_snapshot,captured_at",
        )
        .eq("report_id", report.id)
        .order("captured_at", { ascending: true })
    : { data: [], error: null };

  if (evidenceError) throw new Error(evidenceError.message);

  const sourceHref = safeInternalHref(
    report &&
      report.source_context &&
      typeof report.source_context === "object"
      ? (report.source_context as Record<string, unknown>).url
      : null,
  );

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
                  className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]"
                >
                  Open Original Source
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
                        Evidence #{index + 1} · {sourceLabel(item.source_type)}
                      </p>
                      <p className="text-[8px] text-[rgb(var(--sep-colour-756957))]">
                        Captured {fmt(item.captured_at)}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                        Original content
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
'''

    # 8) DB constraints: current DB constraint predates the new source types.
    changes[sql_path] = r'''begin;

alter table public.reports
  drop constraint if exists reports_source_type_check;

alter table public.reports
  add constraint reports_source_type_check
  check (
    source_type is null
    or source_type in (
      'forum_topic',
      'forum_post',
      'direct_message',
      'room_message',
      'instant_chat_message'
    )
  );

alter table public.report_evidence
  drop constraint if exists report_evidence_source_type_check;

alter table public.report_evidence
  add constraint report_evidence_source_type_check
  check (
    source_type is null
    or source_type in (
      'forum_topic',
      'forum_post',
      'direct_message',
      'room_message',
      'instant_chat_message'
    )
  );

commit;
'''

    print(f"Baseline: {BASELINE[:7]}")
    print(f"Prepared {len(changes)} local file change(s):")
    for path in changes:
        print(" ", path.relative_to(root))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for path, content in changes.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
        print("patched:", path.relative_to(root))

    print("\nApplied LOCALLY only. No GitHub write was performed.")
    print("Next:")
    print("  1. Run supabase/patches/20260823_phase3_1_report_fixes.sql in Supabase SQL Editor")
    print("  2. npm run build")

if __name__ == "__main__":
    main()
