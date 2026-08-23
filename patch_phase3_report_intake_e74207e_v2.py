#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

BASELINE = "e74207e"

def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label}: expected anchor once, found {count}. Nothing written."
        )
    return text.replace(old, new, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        raise SystemExit("ERROR: run from the sepulchria-portal repository root.")

    targets = [
        "components/forum/topic-post.tsx",
        "app/(portal)/messages/[id]/components/ConversationMessageList.tsx",
        "app/(portal)/game/components/RoomMessageList.tsx",
        "components/instant-chat/instant-chat-dock.tsx",
    ]
    for rel in targets:
        if not (root / rel).exists():
            raise SystemExit(f"ERROR: missing {rel}. Nothing written.")

    new_files = [
        "components/reports/report-button.tsx",
        "app/(portal)/api/reports/route.ts",
        "supabase/patches/20260823_phase3_report_intake.sql",
    ]
    for rel in new_files:
        if (root / rel).exists():
            raise SystemExit(f"ERROR: {rel} already exists. Nothing written.")

    changes: dict[Path, str] = {}

    changes[root / "components/reports/report-button.tsx"] = r'''"use client";

import Link from "next/link";
import { useState } from "react";

export type ReportSourceType =
  | "forum_topic"
  | "forum_post"
  | "direct_message"
  | "room_message"
  | "instant_chat_message";

const REASONS = [
  ["harassment", "Harassment"],
  ["offensive_inappropriate", "Offensive / inappropriate content"],
  ["metagaming_rule_breach", "Metagaming / rule breach"],
  ["spam", "Spam"],
  ["impersonation", "Impersonation"],
  ["sexual_inappropriate", "Sexual / inappropriate behaviour"],
  ["other", "Other"],
] as const;

export function ReportButton({
  sourceType,
  sourceId,
  label = "Report",
  compact = false,
}: {
  sourceType: ReportSourceType;
  sourceId: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("harassment");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function submit() {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sourceType,
          sourceId,
          reason,
          explanation: explanation.trim(),
          sourceUrl:
            `${window.location.pathname}${window.location.search}${window.location.hash}`,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Unable to submit this report.",
        );
      }

      setReference(
        typeof payload.reference === "string"
          ? payload.reference
          : null,
      );

      window.dispatchEvent(
        new Event("sepulchria:ticket-notifications-changed"),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to submit this report.",
      );
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setReference(null);
    setError(null);
    setExplanation("");
    setReason("harassment");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8c7860))] transition hover:text-[rgb(var(--sep-colour-d7a698))]"
            : "border border-[rgb(var(--sep-colour-70483f))]/65 bg-[rgb(var(--sep-colour-211311))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c99589))] transition hover:border-[rgb(var(--sep-colour-a65d51))] hover:text-[rgb(var(--sep-colour-e4b0a5))]"
        }
      >
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report content"
        >
          <div className="w-full max-w-lg border border-[rgb(var(--sep-colour-73513a))] bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/45 px-5 py-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
                  Moderation Report
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))]">
                  Report this content
                </h2>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="text-lg text-[rgb(var(--sep-colour-907c63))] hover:text-[rgb(var(--sep-colour-d6bf9d))]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {reference ? (
              <div className="p-5">
                <div className="border border-[rgb(var(--sep-colour-6e7547))]/60 bg-[rgb(var(--sep-colour-182016))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-c9c99d))]">
                  Your report has been submitted as <strong>{reference}</strong>.
                  The reported content has been preserved for staff review.
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/support/${reference}`}
                    onClick={close}
                    className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]"
                  >
                    Open Report Ticket
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="border border-[rgb(var(--sep-colour-59432c))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a58b68))]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <p className="text-xs leading-6 text-[rgb(var(--sep-colour-9e8c75))]">
                  Choose the reason that best describes the problem. Staff will
                  receive a preserved snapshot of the content as it exists now.
                </p>

                <label className="block">
                  <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9d8464))]">
                    Reason
                  </span>
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm text-[rgb(var(--sep-colour-d2c0a5))]"
                  >
                    {REASONS.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9d8464))]">
                    Additional details · Optional
                  </span>
                  <textarea
                    value={explanation}
                    onChange={(event) => setExplanation(event.target.value)}
                    maxLength={5000}
                    rows={6}
                    className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6 text-[rgb(var(--sep-colour-d2c0a5))]"
                    placeholder="Anything staff should know about why you are reporting this?"
                  />
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="border border-red-900/60 bg-red-950/25 p-3 text-xs leading-5 text-red-300"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="border border-[rgb(var(--sep-colour-59432c))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a58b68))]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-e0a69a))] disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Submit Report"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
'''

    changes[root / "supabase/patches/20260823_phase3_report_intake.sql"] = r'''begin;

create or replace function public.create_moderation_report(
  p_reporter_user_id uuid,
  p_reporter_character_id uuid,
  p_reporter_name_snapshot text,
  p_reported_user_id uuid,
  p_reported_character_id uuid,
  p_reported_name_snapshot text,
  p_reason_code text,
  p_explanation text,
  p_source_type text,
  p_source_id uuid,
  p_source_context jsonb,
  p_author_user_id uuid,
  p_author_character_id uuid,
  p_author_name_snapshot text,
  p_content_snapshot text,
  p_original_created_at timestamptz,
  p_context_snapshot jsonb
)
returns table (
  ticket_id uuid,
  public_reference text,
  report_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ticket_id uuid;
  v_reference text;
  v_report_id uuid;
  v_duplicate_reference text;
  v_recent_count integer;
  v_player_message text;
begin
  if p_reporter_user_id is null then
    raise exception 'A reporter account is required.';
  end if;

  if p_source_type not in (
    'forum_topic',
    'forum_post',
    'direct_message',
    'room_message',
    'instant_chat_message'
  ) then
    raise exception 'Unsupported report source.';
  end if;

  if p_reason_code not in (
    'harassment',
    'offensive_inappropriate',
    'metagaming_rule_breach',
    'spam',
    'impersonation',
    'sexual_inappropriate',
    'other'
  ) then
    raise exception 'Invalid report reason.';
  end if;

  select t.public_reference
    into v_duplicate_reference
  from public.reports r
  join public.tickets t on t.id = r.ticket_id
  where r.reporter_user_id = p_reporter_user_id
    and r.source_type = p_source_type
    and r.source_id = p_source_id
    and t.status not in ('resolved', 'closed')
  order by r.created_at desc
  limit 1;

  if v_duplicate_reference is not null then
    raise exception
      'You already have an open report for this content (%).',
      v_duplicate_reference;
  end if;

  select count(*)
    into v_recent_count
  from public.reports
  where reporter_user_id = p_reporter_user_id
    and created_at >= now() - interval '10 minutes';

  if v_recent_count >= 5 then
    raise exception
      'Too many reports were submitted recently. Please wait before submitting another.';
  end if;

  insert into public.tickets (
    category, status, priority, subject,
    opened_by_user_id, opened_by_character_id,
    subject_user_id, subject_character_id
  )
  values (
    'report', 'open', 'normal',
    case p_source_type
      when 'forum_topic' then 'Report: Forum topic'
      when 'forum_post' then 'Report: Forum post'
      when 'direct_message' then 'Report: Private message'
      when 'room_message' then 'Report: Location message'
      when 'instant_chat_message' then 'Report: Instant Chat message'
      else 'Report'
    end,
    p_reporter_user_id, p_reporter_character_id,
    p_reported_user_id, p_reported_character_id
  )
  returning id, tickets.public_reference
  into v_ticket_id, v_reference;

  insert into public.reports (
    ticket_id,
    reporter_user_id, reporter_character_id,
    reported_user_id, reported_character_id,
    reporter_name_snapshot, reported_name_snapshot,
    reason_code, explanation,
    source_type, source_id, source_context
  )
  values (
    v_ticket_id,
    p_reporter_user_id, p_reporter_character_id,
    p_reported_user_id, p_reported_character_id,
    p_reporter_name_snapshot, p_reported_name_snapshot,
    p_reason_code, nullif(trim(p_explanation), ''),
    p_source_type, p_source_id,
    coalesce(p_source_context, '{}'::jsonb)
  )
  returning id into v_report_id;

  v_player_message :=
    'A moderation report was submitted.' || E'\n\n' ||
    'Reason: ' || initcap(replace(p_reason_code, '_', ' ')) ||
    case
      when nullif(trim(p_explanation), '') is not null
      then E'\n\nDetails:\n' || trim(p_explanation)
      else ''
    end;

  insert into public.ticket_messages (
    ticket_id, author_user_id, author_character_id, visibility, body
  )
  values (
    v_ticket_id, p_reporter_user_id, p_reporter_character_id,
    'player', v_player_message
  );

  insert into public.ticket_events (
    ticket_id, actor_user_id, actor_character_id, event_type, details
  )
  values (
    v_ticket_id, p_reporter_user_id, p_reporter_character_id,
    'ticket_created',
    jsonb_build_object(
      'category', 'report',
      'source', 'player_report',
      'source_type', p_source_type,
      'source_id', p_source_id
    )
  );

  insert into public.ticket_events (
    ticket_id, actor_user_id, actor_character_id, event_type, details
  )
  values (
    v_ticket_id, p_reporter_user_id, p_reporter_character_id,
    'report_submitted',
    jsonb_build_object(
      'report_id', v_report_id,
      'reason_code', p_reason_code,
      'source_type', p_source_type,
      'source_id', p_source_id
    )
  );

  insert into public.report_evidence (
    ticket_id, report_id, evidence_type,
    source_type, source_id,
    author_user_id, author_character_id, author_name_snapshot,
    content_snapshot, original_created_at,
    context_snapshot, captured_by_user_id
  )
  values (
    v_ticket_id, v_report_id, 'content_snapshot',
    p_source_type, p_source_id,
    p_author_user_id, p_author_character_id, p_author_name_snapshot,
    p_content_snapshot, p_original_created_at,
    coalesce(p_context_snapshot, '{}'::jsonb),
    p_reporter_user_id
  );

  return query select v_ticket_id, v_reference, v_report_id;
end;
$$;

revoke all
  on function public.create_moderation_report(
    uuid, uuid, text, uuid, uuid, text,
    text, text, text, uuid, jsonb,
    uuid, uuid, text, text, timestamptz, jsonb
  )
  from public, anon, authenticated;

grant execute
  on function public.create_moderation_report(
    uuid, uuid, text, uuid, uuid, text,
    text, text, text, uuid, jsonb,
    uuid, uuid, text, text, timestamptz, jsonb
  )
  to service_role;

create index if not exists reports_reporter_source_lookup_idx
  on public.reports (
    reporter_user_id,
    source_type,
    source_id,
    created_at desc
  );

commit;
'''

    changes[root / "app/(portal)/api/reports/route.ts"] = r'''import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SOURCE_TYPES = [
  "forum_topic",
  "forum_post",
  "direct_message",
  "room_message",
  "instant_chat_message",
] as const;

type SourceType = (typeof SOURCE_TYPES)[number];

const REASONS = [
  "harassment",
  "offensive_inappropriate",
  "metagaming_rule_breach",
  "spam",
  "impersonation",
  "sexual_inappropriate",
  "other",
] as const;

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function safeText(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

async function characterSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  characterId: string | null,
) {
  if (!characterId) return null;

  const { data, error } = await admin
    .from("characters")
    .select("id, user_id, display_name, first_name, surname")
    .eq("id", characterId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id ?? null,
    name:
      data.display_name?.trim() ||
      [data.first_name, data.surname]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Unknown character",
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to submit a report." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const sourceType = body?.sourceType;
  const sourceId = body?.sourceId;
  const reason = body?.reason;
  const explanation = safeText(body?.explanation, 5000);
  const sourceUrl = safeText(body?.sourceUrl, 1200);

  if (
    !SOURCE_TYPES.includes(sourceType as SourceType) ||
    !isUuid(sourceId) ||
    !REASONS.includes(reason as (typeof REASONS)[number])
  ) {
    return NextResponse.json(
      { error: "This report request is invalid." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: reporterCharacter, error: reporterCharacterError } =
    await admin
      .from("characters")
      .select(
        "id, user_id, display_name, first_name, surname, current_room_id",
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (reporterCharacterError || !reporterCharacter) {
    return NextResponse.json(
      { error: "A character is required to submit a report." },
      { status: 403 },
    );
  }

  const reporterName =
    reporterCharacter.display_name?.trim() ||
    [reporterCharacter.first_name, reporterCharacter.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Player";

  const { data: staffRow } = await admin
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const reporterIsStaff = Boolean(staffRow);

  let authorUserId: string | null = null;
  let authorCharacterId: string | null = null;
  let authorName: string | null = null;
  let contentSnapshot = "";
  let originalCreatedAt: string | null = null;
  let sourceContext: Record<string, unknown> = {
    url: sourceUrl || null,
  };
  let contextSnapshot: Record<string, unknown> = {};

  if (sourceType === "forum_post") {
    const { data: post, error } = await supabase
      .from("forum_posts")
      .select(
        "id, topic_id, author_user_id, author_character_id, body, is_initial, is_anonymous, created_at, updated_at, deleted_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !post || post.deleted_at) {
      return NextResponse.json(
        { error: "This forum post is unavailable." },
        { status: 404 },
      );
    }

    authorUserId = post.author_user_id ?? null;
    authorCharacterId = post.author_character_id ?? null;
    contentSnapshot = post.body;
    originalCreatedAt = post.created_at;

    const { data: topic } = await supabase
      .from("forum_topics")
      .select("id, title, slug, section_id")
      .eq("id", post.topic_id)
      .maybeSingle();

    const { data: nearby } = await admin
      .from("forum_posts")
      .select(
        "id, author_user_id, author_character_id, body, created_at, edited_at, deleted_at",
      )
      .eq("topic_id", post.topic_id)
      .order("created_at", { ascending: true })
      .limit(40);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      topic: topic ?? null,
      surrounding_posts:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
      reported_post_updated_at: post.updated_at,
      reported_post_was_anonymous: post.is_anonymous,
    };

    sourceContext = {
      ...sourceContext,
      topic_id: post.topic_id,
      is_initial: post.is_initial,
    };
  } else if (sourceType === "forum_topic") {
    const { data: topic, error } = await supabase
      .from("forum_topics")
      .select(
        "id, section_id, author_user_id, author_character_id, title, slug, created_at, updated_at, deleted_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !topic || topic.deleted_at) {
      return NextResponse.json(
        { error: "This forum topic is unavailable." },
        { status: 404 },
      );
    }

    const { data: openingPost } = await supabase
      .from("forum_posts")
      .select(
        "id, author_user_id, author_character_id, body, is_anonymous, created_at, updated_at, deleted_at",
      )
      .eq("topic_id", topic.id)
      .eq("is_initial", true)
      .maybeSingle();

    authorUserId =
      openingPost?.author_user_id ?? topic.author_user_id ?? null;
    authorCharacterId =
      openingPost?.author_character_id ??
      topic.author_character_id ??
      null;
    contentSnapshot =
      `${topic.title}\n\n${openingPost?.body ?? ""}`.trim();
    originalCreatedAt = topic.created_at;

    const { data: nearby } = await admin
      .from("forum_posts")
      .select(
        "id, author_user_id, author_character_id, body, created_at, edited_at, deleted_at",
      )
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: true })
      .limit(7);

    contextSnapshot = {
      topic: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        section_id: topic.section_id,
        updated_at: topic.updated_at,
      },
      opening_post_id: openingPost?.id ?? null,
      surrounding_posts: nearby ?? [],
      opening_post_was_anonymous: openingPost?.is_anonymous ?? false,
    };
  } else if (sourceType === "direct_message") {
    const { data: message, error } = await supabase
      .from("direct_messages")
      .select(
        "id, conversation_id, sender_character_id, body, message_mode, created_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json(
        { error: "This private message is unavailable." },
        { status: 404 },
      );
    }

    const { data: membership } = await admin
      .from("direct_conversation_participants")
      .select("character_id")
      .eq("conversation_id", message.conversation_id)
      .eq("character_id", reporterCharacter.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "This private message is not available to your character." },
        { status: 403 },
      );
    }

    authorCharacterId = message.sender_character_id;
    contentSnapshot = message.body;
    originalCreatedAt = message.created_at;

    const { data: nearby } = await admin
      .from("direct_messages")
      .select("id, sender_character_id, body, message_mode, created_at")
      .eq("conversation_id", message.conversation_id)
      .order("created_at", { ascending: true })
      .limit(200);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      conversation_id: message.conversation_id,
      surrounding_messages:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
    };

    sourceContext = {
      ...sourceContext,
      conversation_id: message.conversation_id,
      message_mode: message.message_mode,
    };
  } else if (sourceType === "instant_chat_message") {
    const { data: message, error } = await supabase
      .from("instant_chat_messages")
      .select("id, conversation_id, sender_character_id, body, created_at")
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json(
        { error: "This Instant Chat message is unavailable." },
        { status: 404 },
      );
    }

    const { data: membership } = await admin
      .from("instant_chat_participants")
      .select("character_id")
      .eq("conversation_id", message.conversation_id)
      .eq("character_id", reporterCharacter.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "This Instant Chat message is not available to your character." },
        { status: 403 },
      );
    }

    authorCharacterId = message.sender_character_id;
    contentSnapshot = message.body;
    originalCreatedAt = message.created_at;

    const { data: nearby } = await admin
      .from("instant_chat_messages")
      .select("id, sender_character_id, body, created_at")
      .eq("conversation_id", message.conversation_id)
      .order("created_at", { ascending: true })
      .limit(200);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      conversation_id: message.conversation_id,
      surrounding_messages:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
    };

    sourceContext = {
      ...sourceContext,
      conversation_id: message.conversation_id,
    };
  } else {
    const { data: message, error } = await supabase
      .from("room_messages")
      .select(
        "id, room_id, character_id, message, message_type, whisper_recipient_character_id, created_at, edited_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json(
        { error: "This location message is unavailable." },
        { status: 404 },
      );
    }

    if (
      !reporterIsStaff &&
      reporterCharacter.current_room_id !== message.room_id
    ) {
      return NextResponse.json(
        { error: "This location message is not available to your character." },
        { status: 403 },
      );
    }

    if (
      message.message_type === "whisper" &&
      !reporterIsStaff &&
      message.character_id !== reporterCharacter.id &&
      message.whisper_recipient_character_id !== reporterCharacter.id
    ) {
      return NextResponse.json(
        { error: "This whisper is not available to your character." },
        { status: 403 },
      );
    }

    authorCharacterId = message.character_id ?? null;
    contentSnapshot = message.message;
    originalCreatedAt = message.created_at;

    const { data: room } = await admin
      .from("rooms")
      .select("id, name, slug")
      .eq("id", message.room_id)
      .maybeSingle();

    const { data: nearby } = await admin
      .from("room_messages")
      .select(
        "id, character_id, message, message_type, whisper_recipient_character_id, created_at, edited_at",
      )
      .eq("room_id", message.room_id)
      .order("created_at", { ascending: true })
      .limit(500);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      room: room ?? null,
      surrounding_messages:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
      reported_message_edited_at: message.edited_at,
    };

    sourceContext = {
      ...sourceContext,
      room_id: message.room_id,
      message_type: message.message_type,
      whisper_recipient_character_id:
        message.whisper_recipient_character_id,
    };
  }

  const authorCharacter = await characterSnapshot(
    admin,
    authorCharacterId,
  );

  if (authorCharacter) {
    authorUserId = authorCharacter.userId ?? authorUserId;
    authorName = authorCharacter.name;
  }

  if (
    authorUserId === user.id ||
    authorCharacterId === reporterCharacter.id
  ) {
    return NextResponse.json(
      { error: "You cannot report your own content." },
      { status: 400 },
    );
  }

  if (!contentSnapshot.trim()) {
    return NextResponse.json(
      { error: "There is no reportable content to preserve." },
      { status: 400 },
    );
  }

  const { data: result, error: reportError } = await admin.rpc(
    "create_moderation_report",
    {
      p_reporter_user_id: user.id,
      p_reporter_character_id: reporterCharacter.id,
      p_reporter_name_snapshot: reporterName,
      p_reported_user_id: authorUserId,
      p_reported_character_id: authorCharacterId,
      p_reported_name_snapshot: authorName,
      p_reason_code: reason,
      p_explanation: explanation || null,
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_source_context: sourceContext,
      p_author_user_id: authorUserId,
      p_author_character_id: authorCharacterId,
      p_author_name_snapshot: authorName,
      p_content_snapshot: contentSnapshot,
      p_original_created_at: originalCreatedAt,
      p_context_snapshot: contextSnapshot,
    },
  );

  if (reportError) {
    return NextResponse.json(
      { error: reportError.message },
      {
        status:
          reportError.message.includes("already have an open report") ||
          reportError.message.includes("Too many reports")
            ? 409
            : 500,
      },
    );
  }

  const created = Array.isArray(result) ? result[0] : result;

  if (!created?.public_reference) {
    return NextResponse.json(
      { error: "The report could not be created." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reference: created.public_reference,
  });
}
'''

    forum_path = root / "components/forum/topic-post.tsx"
    forum = forum_path.read_text(encoding="utf-8")
    forum = once(
        forum,
        'import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";',
        'import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";\nimport { ReportButton } from "@/components/reports/report-button";',
        "forum report import",
    )
    anchor = '''                {!isDeleted &&
                canEdit ? ('''
    block = '''                {!isDeleted ? (
                  <ReportButton
                    sourceType={
                      post.is_initial
                        ? "forum_topic"
                        : "forum_post"
                    }
                    sourceId={
                      post.is_initial
                        ? post.topic_id
                        : post.id
                    }
                    label={
                      post.is_initial
                        ? "Report topic"
                        : "Report"
                    }
                  />
                ) : null}

''' + anchor
    forum = once(forum, anchor, block, "forum report button")
    changes[forum_path] = forum

    pm_path = root / "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
    pm = pm_path.read_text(encoding="utf-8")
    pm = once(
        pm,
        'import { RichTextContentClient } from "@/components/editor/rich-text-content-client";',
        'import { RichTextContentClient } from "@/components/editor/rich-text-content-client";\nimport { ReportButton } from "@/components/reports/report-button";',
        "private message report import",
    )
    pm_anchor = '''              >
                <div className="flex items-start gap-3">'''
    pm_replacement = '''              >
                {!own ? (
                  <div className="absolute bottom-2 right-2 z-10">
                    <ReportButton
                      sourceType="direct_message"
                      sourceId={message.id}
                      compact
                    />
                  </div>
                ) : null}

                <div className="flex items-start gap-3">'''
    pm = once(pm, pm_anchor, pm_replacement, "private message report button")
    changes[pm_path] = pm

    room_path = root / "app/(portal)/game/components/RoomMessageList.tsx"
    room = room_path.read_text(encoding="utf-8")
    room = once(
        room,
        'import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";',
        'import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";\nimport { ReportButton } from "@/components/reports/report-button";',
        "room report import",
    )
    closing_time_pattern = re.compile(r'(?P<indent>[ \t]*)</time>')
    matches = list(closing_time_pattern.finditer(room))
    if len(matches) != 3:
        raise SystemExit(
            f"ERROR: room timestamp anchors: expected 3, found {len(matches)}. Nothing written."
        )

    def add_room_report(match: re.Match[str]) -> str:
        indent = match.group("indent")
        return (
            f"{indent}</time>\n\n"
            f"{indent}{{item.character_id &&\n"
            f"{indent}item.character_id !== viewerCharacterId ? (\n"
            f"{indent}  <ReportButton\n"
            f"{indent}    sourceType=\"room_message\"\n"
            f"{indent}    sourceId={{item.id}}\n"
            f"{indent}    compact\n"
            f"{indent}  />\n"
            f"{indent}) : null}}"
        )

    room = closing_time_pattern.sub(add_room_report, room)
    changes[room_path] = room

    instant_path = root / "components/instant-chat/instant-chat-dock.tsx"
    instant = instant_path.read_text(encoding="utf-8")
    instant = once(
        instant,
        'import { usePortalAudio } from "@/components/audio/portal-audio-provider";',
        'import { usePortalAudio } from "@/components/audio/portal-audio-provider";\nimport { ReportButton } from "@/components/reports/report-button";',
        "instant report import",
    )
    instant_anchor = '''                          <p className="whitespace-pre-wrap break-words">
                            {
                              message.body
                            }
                          </p>

                          <time className="mt-0.5 block text-right text-[6px] leading-none text-[rgb(var(--sep-colour-746858))]">'''

    instant_replacement = '''                          <p className="whitespace-pre-wrap break-words">
                            {
                              message.body
                            }
                          </p>

                          {!own ? (
                            <div className="mt-1 text-right">
                              <ReportButton
                                sourceType="instant_chat_message"
                                sourceId={message.id}
                                compact
                              />
                            </div>
                          ) : null}

                          <time className="mt-0.5 block text-right text-[6px] leading-none text-[rgb(var(--sep-colour-746858))]">'''

    instant = once(
        instant,
        instant_anchor,
        instant_replacement,
        "instant message report button",
    )
    changes[instant_path] = instant

    print(f"Baseline: {BASELINE}")
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
    print("  1. Run supabase/patches/20260823_phase3_report_intake.sql in Supabase SQL Editor")
    print("  2. npm run build")

if __name__ == "__main__":
    main()
