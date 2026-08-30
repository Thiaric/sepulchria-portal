-- Sepulchria global notification centre
-- Foundation + manual notifications + automatic Calendar Event notifications
-- Built for repo commit 45f5be8
-- Run in Supabase SQL Editor BEFORE applying the code patch.

begin;

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- Core notifications
-- -------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'announcement',
  title text not null,
  body text not null,
  href text null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz null,
  expires_game_at timestamptz null,
  source_type text null,
  source_id text null,
  source_trigger text null,
  created_by uuid null,
  is_automatic boolean not null default false,
  staff_overridden boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_has_expiry
    check (expires_at is not null or expires_game_at is not null)
);

create table if not exists public.notification_targets (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null
    references public.notifications(id) on delete cascade,
  target_type text not null
    check (target_type in ('global', 'staff', 'user', 'character')),
  target_id uuid null,
  created_at timestamptz not null default now(),
  constraint notification_target_shape check (
    (target_type in ('global', 'staff') and target_id is null)
    or
    (target_type in ('user', 'character') and target_id is not null)
  )
);

create unique index if not exists notification_targets_unique_target
  on public.notification_targets (
    notification_id,
    target_type,
    coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.notification_reads (
  notification_id uuid not null
    references public.notifications(id) on delete cascade,
  user_id uuid not null,
  viewed_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- Prevent automatic sources that staff deliberately deleted from reappearing.
create table if not exists public.notification_suppressions (
  source_type text not null,
  source_id text not null,
  source_trigger text not null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  primary key (source_type, source_id, source_trigger)
);

create unique index if not exists notifications_unique_automatic_source
  on public.notifications(source_type, source_id, source_trigger);

create index if not exists notifications_visibility_idx
  on public.notifications(is_active, starts_at, expires_at);

create index if not exists notifications_game_expiry_idx
  on public.notifications(expires_game_at)
  where expires_game_at is not null;

create index if not exists notification_reads_user_idx
  on public.notification_reads(user_id, viewed_at desc);

create index if not exists notification_targets_user_idx
  on public.notification_targets(target_type, target_id);

alter table public.notifications enable row level security;
alter table public.notification_targets enable row level security;
alter table public.notification_reads enable row level security;
alter table public.notification_suppressions enable row level security;

-- Direct table access is intentionally not granted to ordinary users.
-- User-facing access happens through the security-definer RPCs below.
revoke all on public.notifications from anon, authenticated;
revoke all on public.notification_targets from anon, authenticated;
revoke all on public.notification_reads from anon, authenticated;
revoke all on public.notification_suppressions from anon, authenticated;

-- -------------------------------------------------------------------
-- Calendar Event notification settings
-- -------------------------------------------------------------------

alter table public.calendar_events
  add column if not exists notify_on_publish boolean not null default false,
  add column if not exists notify_24h boolean not null default false,
  add column if not exists notify_1h boolean not null default false;

-- -------------------------------------------------------------------
-- Current Aureth/game datetime, respecting pause + time scale
-- -------------------------------------------------------------------

create or replace function public.current_aureth_game_datetime()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when ws.automatic_time then
        ws.game_datetime
        + make_interval(
            secs => (
              extract(epoch from (now() - ws.updated_at))
              * greatest(coalesce(ws.time_scale, 0), 0)
            )::double precision
          )
      else ws.game_datetime
    end
  from public.world_state ws
  where ws.id = 'aureth'
  limit 1;
$$;

revoke all on function public.current_aureth_game_datetime() from public;
grant execute on function public.current_aureth_game_datetime() to authenticated;

-- -------------------------------------------------------------------
-- Event helpers
-- -------------------------------------------------------------------

create or replace function public.calendar_event_start_datetime(
  p_event_date date,
  p_start_time time
)
returns timestamptz
language sql
immutable
as $$
  select
    (p_event_date + coalesce(p_start_time, time '00:00'))
    at time zone 'UTC';
$$;

create or replace function public.calendar_event_expiry_datetime(
  p_event_date date,
  p_start_time time,
  p_end_time time
)
returns timestamptz
language sql
immutable
as $$
  select
    (
      p_event_date
      + coalesce(
          p_end_time,
          p_start_time,
          time '23:59:59'
        )
    ) at time zone 'UTC';
$$;

-- Publish notification + synchronisation of already-generated event notices.
create or replace function public.sync_calendar_event_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_expiry timestamptz;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
    where is_automatic = true
      and source_type = 'event'
      and source_id = old.id::text;

    return old;
  end if;

  v_expiry := public.calendar_event_expiry_datetime(
    new.event_date,
    new.start_time,
    new.end_time
  );

  -- Keep generated notices aligned with Event edits unless staff overrode them.
  update public.notifications
  set
    title = case source_trigger
      when 'published' then 'New Event: ' || new.title
      when '24h' then new.title || ' — 24 Aureth hours'
      when '1h' then new.title || ' — 1 Aureth hour'
      else title
    end,
    body = case source_trigger
      when 'published' then new.title || ' has been added to the calendar.'
      when '24h' then new.title || ' begins in 24 Aureth hours.'
      when '1h' then new.title || ' begins in 1 Aureth hour.'
      else body
    end,
    expires_game_at = v_expiry,
    updated_at = now(),
    is_active = case
      when source_trigger = 'published' and not new.notify_on_publish then false
      when source_trigger = '24h' and not new.notify_24h then false
      when source_trigger = '1h' and not new.notify_1h then false
      when not new.is_active then false
      else true
    end
  where is_automatic = true
    and source_type = 'event'
    and source_id = new.id::text
    and staff_overridden = false;

  -- "Notify when published" means visible/active Calendar publication.
  if new.is_active
     and new.notify_on_publish
     and not exists (
       select 1
       from public.notification_suppressions s
       where s.source_type = 'event'
         and s.source_id = new.id::text
         and s.source_trigger = 'published'
     )
  then
    insert into public.notifications (
      type,
      title,
      body,
      href,
      starts_at,
      expires_game_at,
      source_type,
      source_id,
      source_trigger,
      created_by,
      is_automatic,
      is_active
    )
    values (
      'event',
      'New Event: ' || new.title,
      new.title || ' has been added to the calendar.',
      null,
      now(),
      v_expiry,
      'event',
      new.id::text,
      'published',
      new.created_by,
      true,
      true
    )
    on conflict (
      source_type,
      source_id,
      source_trigger
    )
    do nothing
    returning id into v_notification_id;

    if v_notification_id is null then
      select n.id
      into v_notification_id
      from public.notifications n
      where n.is_automatic = true
        and n.source_type = 'event'
        and n.source_id = new.id::text
        and n.source_trigger = 'published'
      limit 1;
    end if;

    if v_notification_id is not null then
      insert into public.notification_targets (
        notification_id,
        target_type,
        target_id
      )
      values (
        v_notification_id,
        'global',
        null
      )
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists calendar_event_notifications_sync
  on public.calendar_events;

create trigger calendar_event_notifications_sync
after insert or update or delete
on public.calendar_events
for each row
execute function public.sync_calendar_event_notifications();

-- -------------------------------------------------------------------
-- Materialise reminders that have become due in GAME TIME.
-- Called automatically by the bell RPC.
-- -------------------------------------------------------------------

create or replace function public.materialize_due_event_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_game timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  v_now_game := public.current_aureth_game_datetime();

  if v_now_game is null then
    return;
  end if;

  -- 24h reminder is only useful from 24h until 1h before the Event.
  insert into public.notifications (
    type,
    title,
    body,
    starts_at,
    expires_game_at,
    source_type,
    source_id,
    source_trigger,
    created_by,
    is_automatic,
    is_active
  )
  select
    'event',
    e.title || ' — 24 Aureth hours',
    e.title || ' begins in 24 Aureth hours.',
    now(),
    public.calendar_event_expiry_datetime(
      e.event_date,
      e.start_time,
      e.end_time
    ),
    'event',
    e.id::text,
    '24h',
    e.created_by,
    true,
    true
  from public.calendar_events e
  where e.is_active = true
    and e.notify_24h = true
    and e.start_time is not null
    and v_now_game >=
      public.calendar_event_start_datetime(
        e.event_date,
        e.start_time
      ) - interval '24 hours'
    and v_now_game <
      public.calendar_event_start_datetime(
        e.event_date,
        e.start_time
      ) - interval '1 hour'
    and not exists (
      select 1
      from public.notification_suppressions s
      where s.source_type = 'event'
        and s.source_id = e.id::text
        and s.source_trigger = '24h'
    )
  on conflict (
    source_type,
    source_id,
    source_trigger
  )
  do nothing;

  -- 1h reminder is useful from 1h before until the Event has passed.
  insert into public.notifications (
    type,
    title,
    body,
    starts_at,
    expires_game_at,
    source_type,
    source_id,
    source_trigger,
    created_by,
    is_automatic,
    is_active
  )
  select
    'event',
    e.title || ' — 1 Aureth hour',
    e.title || ' begins in 1 Aureth hour.',
    now(),
    public.calendar_event_expiry_datetime(
      e.event_date,
      e.start_time,
      e.end_time
    ),
    'event',
    e.id::text,
    '1h',
    e.created_by,
    true,
    true
  from public.calendar_events e
  where e.is_active = true
    and e.notify_1h = true
    and e.start_time is not null
    and v_now_game >=
      public.calendar_event_start_datetime(
        e.event_date,
        e.start_time
      ) - interval '1 hour'
    and v_now_game <
      public.calendar_event_expiry_datetime(
        e.event_date,
        e.start_time,
        e.end_time
      )
    and not exists (
      select 1
      from public.notification_suppressions s
      where s.source_type = 'event'
        and s.source_id = e.id::text
        and s.source_trigger = '1h'
    )
  on conflict (
    source_type,
    source_id,
    source_trigger
  )
  do nothing;

  -- Every generated Event notification is global.
  insert into public.notification_targets (
    notification_id,
    target_type,
    target_id
  )
  select
    n.id,
    'global',
    null
  from public.notifications n
  where n.is_automatic = true
    and n.source_type = 'event'
    and not exists (
      select 1
      from public.notification_targets t
      where t.notification_id = n.id
        and t.target_type = 'global'
        and t.target_id is null
    )
  on conflict do nothing;
end;
$$;

revoke all on function public.materialize_due_event_notifications() from public;
grant execute on function public.materialize_due_event_notifications() to authenticated;

-- -------------------------------------------------------------------
-- User-facing notification list + read state
-- -------------------------------------------------------------------

create or replace function public.get_my_notifications()
returns table (
  id uuid,
  type text,
  title text,
  body text,
  href text,
  starts_at timestamptz,
  expires_at timestamptz,
  expires_game_at timestamptz,
  source_type text,
  source_trigger text,
  is_automatic boolean,
  created_at timestamptz,
  is_unread boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_game_now timestamptz;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  perform public.materialize_due_event_notifications();
  v_game_now := public.current_aureth_game_datetime();

  return query
  select distinct
    n.id,
    n.type,
    n.title,
    n.body,
    n.href,
    n.starts_at,
    n.expires_at,
    n.expires_game_at,
    n.source_type,
    n.source_trigger,
    n.is_automatic,
    n.created_at,
    (r.notification_id is null) as is_unread
  from public.notifications n
  join public.notification_targets t
    on t.notification_id = n.id
  left join public.notification_reads r
    on r.notification_id = n.id
   and r.user_id = v_uid
  where n.is_active = true
    and n.starts_at <= now()
    and (
      n.expires_at is null
      or n.expires_at > now()
    )
    and (
      n.expires_game_at is null
      or v_game_now is null
      or n.expires_game_at > v_game_now
    )
    and (
      t.target_type = 'global'
      or (
        t.target_type = 'staff'
        and exists (
          select 1
          from public.staff_members sm
          where sm.user_id = v_uid
        )
      )
      or (
        t.target_type = 'user'
        and t.target_id = v_uid
      )
      or (
        t.target_type = 'character'
        and exists (
          select 1
          from public.characters c
          where c.id = t.target_id
            and c.user_id = v_uid
        )
      )
    )
  order by n.starts_at desc, n.created_at desc;
end;
$$;

revoke all on function public.get_my_notifications() from public;
grant execute on function public.get_my_notifications() to authenticated;

create or replace function public.mark_my_notifications_viewed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_game_now timestamptz;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  perform public.materialize_due_event_notifications();
  v_game_now := public.current_aureth_game_datetime();

  insert into public.notification_reads (
    notification_id,
    user_id,
    viewed_at
  )
  select distinct
    n.id,
    v_uid,
    now()
  from public.notifications n
  join public.notification_targets t
    on t.notification_id = n.id
  where n.is_active = true
    and n.starts_at <= now()
    and (
      n.expires_at is null
      or n.expires_at > now()
    )
    and (
      n.expires_game_at is null
      or v_game_now is null
      or n.expires_game_at > v_game_now
    )
    and (
      t.target_type = 'global'
      or (
        t.target_type = 'staff'
        and exists (
          select 1
          from public.staff_members sm
          where sm.user_id = v_uid
        )
      )
      or (
        t.target_type = 'user'
        and t.target_id = v_uid
      )
      or (
        t.target_type = 'character'
        and exists (
          select 1
          from public.characters c
          where c.id = t.target_id
            and c.user_id = v_uid
        )
      )
    )
  on conflict (notification_id, user_id)
  do update set viewed_at = excluded.viewed_at;
end;
$$;

revoke all on function public.mark_my_notifications_viewed() from public;
grant execute on function public.mark_my_notifications_viewed() to authenticated;

commit;
