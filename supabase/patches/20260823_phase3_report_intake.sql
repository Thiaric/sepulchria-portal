begin;

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
