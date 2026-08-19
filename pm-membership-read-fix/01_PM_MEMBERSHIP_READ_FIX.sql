-- PM membership/read correctness fix
-- Run once in Supabase SQL Editor.

-- Make group leave authoritative and security-definer so it is not dependent
-- on client-side update policies.
create or replace function public.leave_group_conversation(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user uuid := auth.uid();
  actor_character uuid;
  target_is_group boolean;
begin
  if actor_user is null then
    raise exception 'Authentication required.';
  end if;

  select c.id
    into actor_character
  from public.characters c
  where c.user_id = actor_user
  limit 1;

  if actor_character is null then
    raise exception 'Character required.';
  end if;

  select dc.is_group
    into target_is_group
  from public.direct_conversations dc
  where dc.id = target_conversation_id;

  if target_is_group is distinct from true then
    raise exception 'This conversation is not a group conversation.';
  end if;

  update public.direct_conversation_participants dcp
  set
    deleted_at = now(),
    archived_at = now(),
    last_read_at = now()
  where dcp.conversation_id = target_conversation_id
    and dcp.character_id = actor_character
    and dcp.deleted_at is null;

  if not found then
    raise exception 'Active group membership not found.';
  end if;
end;
$$;

grant execute on function public.leave_group_conversation(uuid)
to authenticated;
