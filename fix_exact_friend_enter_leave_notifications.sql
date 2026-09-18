-- Sepulchria
-- Exact mutual-friend ENTER / LEAVE notifications.
--
-- ENTER is called immediately after successful signInWithPassword().
-- LEAVE is called immediately before presence is cleared / sign-out.
-- No heartbeat inference is used.

begin;

drop trigger if exists mutual_friend_online_notification
on public.character_presence;

drop function if exists public.notify_mutual_friends_character_online();
drop function if exists public.notify_my_mutual_friends_online();

create or replace function public.notify_my_mutual_friends_presence(
  p_action text
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_uid uuid;
  v_character_id uuid;
  v_display_name text;
  v_public_slug text;
  v_session_id text;
  v_source_trigger text;
  v_title text;
  v_body text;
  v_recipient record;
  v_notification_id uuid;
  v_created integer := 0;
begin
  if p_action not in ('entered', 'left') then
    raise exception 'Invalid presence notification action.';
  end if;

  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    coalesce(
      nullif(auth.jwt() ->> 'session_id', ''),
      nullif(auth.jwt() ->> 'session', ''),
      v_uid::text
    );

  select
    c.id,
    coalesce(
      nullif(trim(c.display_name), ''),
      trim(
        coalesce(c.first_name, '')
        || ' '
        || coalesce(c.surname, '')
      )
    ),
    c.public_slug
  into
    v_character_id,
    v_display_name,
    v_public_slug
  from public.characters c
  where c.user_id = v_uid
    and c.status = 'approved'
    and coalesce(c.is_system, false) = false
  limit 1;

  if v_character_id is null then
    return 0;
  end if;

  if p_action = 'entered' then
    v_title :=
      v_display_name || ' has entered Sepulchria';
    v_body :=
      v_display_name || ' has entered Sepulchria.';
  else
    v_title :=
      v_display_name || ' has left Sepulchria';
    v_body :=
      v_display_name || ' has left Sepulchria.';
  end if;

  v_source_trigger :=
    p_action || ':' || v_session_id;

  for v_recipient in
    select distinct
      mine.owner_character_id as recipient_character_id
    from public.character_friend_entries mine
    where mine.target_character_id = v_character_id

      and exists (
        select 1
        from public.character_friend_entries reciprocal
        where reciprocal.owner_character_id = v_character_id
          and reciprocal.target_character_id = mine.owner_character_id
      )

      and not exists (
        select 1
        from public.character_blocks b
        where (
          b.blocker_character_id = mine.owner_character_id
          and b.blocked_character_id = v_character_id
        )
        or (
          b.blocker_character_id = v_character_id
          and b.blocked_character_id = mine.owner_character_id
        )
      )

      and exists (
        select 1
        from public.characters recipient
        where recipient.id = mine.owner_character_id
          and recipient.status = 'approved'
          and coalesce(recipient.is_system, false) = false
      )
  loop
    select public.create_automatic_notification(
      p_type => 'system',
      p_title => v_title,
      p_body => v_body,
      p_href =>
        case
          when v_public_slug is null
            or trim(v_public_slug) = ''
          then '/friends'
          else '/characters/' || v_public_slug
        end,
      p_target_type => 'character',
      p_target_id => v_recipient.recipient_character_id,
      p_source_type => 'friend_presence',
      p_source_id => v_character_id::text,
      p_source_trigger => v_source_trigger,
      p_expires_at => now() + interval '1 hour'
    )
    into v_notification_id;

    if v_notification_id is not null then
      v_created := v_created + 1;
    end if;
  end loop;

  return v_created;
end;
$function$;

create or replace function public.notify_my_mutual_friends_entered()
returns integer
language sql
security definer
set search_path to 'public', 'auth'
as $function$
  select public.notify_my_mutual_friends_presence('entered');
$function$;

create or replace function public.notify_my_mutual_friends_left()
returns integer
language sql
security definer
set search_path to 'public', 'auth'
as $function$
  select public.notify_my_mutual_friends_presence('left');
$function$;

grant execute
on function public.notify_my_mutual_friends_entered()
to authenticated;

grant execute
on function public.notify_my_mutual_friends_left()
to authenticated;

-- Remove stale old implementation rows so they do not confuse testing.
delete from public.notifications
where source_type = 'friend_online';

commit;

-- Verification:
-- select id,title,source_type,source_id,source_trigger,created_at
-- from public.notifications
-- where source_type='friend_presence'
-- order by created_at desc;
