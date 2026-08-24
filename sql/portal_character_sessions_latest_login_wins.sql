-- Sepulchria: one active portal instance per approved character.
-- Latest successful login always wins immediately.
-- There is deliberately NO stale timeout / lease window.
--
-- This intentionally removes the abandoned five-minute lease implementation
-- first, so this script is safe even if that earlier experiment still exists.

begin;

drop function if exists public.claim_portal_character_session(uuid, uuid, uuid);
drop function if exists public.heartbeat_portal_character_session(uuid, uuid, uuid);
drop function if exists public.release_portal_character_session(uuid, uuid, uuid);
drop function if exists public.is_portal_character_session_active(uuid);

drop table if exists public.portal_character_sessions;

create table public.portal_character_sessions (
  character_id uuid primary key
    references public.characters(id) on delete cascade,
  user_id uuid not null,
  session_id uuid not null,
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portal_character_sessions_user_id_idx
  on public.portal_character_sessions(user_id);

alter table public.portal_character_sessions enable row level security;

-- Browser clients never read or write the ownership table directly.
-- Claim/release is performed by server routes using the service role.
revoke all on public.portal_character_sessions from anon, authenticated;

create function public.is_portal_character_session_active(
  p_session_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
begin
  if v_user_id is null then
    return false;
  end if;

  select c.id
  into v_character_id
  from public.characters c
  where c.user_id = v_user_id
    and c.status = 'approved'
  limit 1;

  -- The single-session rule only applies once the character is approved.
  if v_character_id is null then
    return true;
  end if;

  if p_session_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.portal_character_sessions pcs
    where pcs.character_id = v_character_id
      and pcs.user_id = v_user_id
      and pcs.session_id = p_session_id
  );
end;
$$;

revoke all on function public.is_portal_character_session_active(uuid)
  from public, anon;

grant execute on function public.is_portal_character_session_active(uuid)
  to authenticated;

commit;
