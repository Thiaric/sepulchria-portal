-- SEPULCHRIA — ADMIN STACK NORMALISATION
--
-- Staff wrapper around the canonical stack normaliser introduced by
-- 01_STACK_NORMALIZE_EVERYWHERE.sql.

create or replace function public.normalize_character_inventory_stacks_staff(
  p_character_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.staff_members s
    where s.user_id = v_user_id
  ) then
    raise exception 'Staff access required.';
  end if;

  if p_character_id is null then
    raise exception 'Character is required.';
  end if;

  if not exists (
    select 1
    from public.characters c
    where c.id = p_character_id
  ) then
    raise exception 'Character not found.';
  end if;

  perform public._normalize_character_inventory_stacks(
    p_character_id
  );
end;
$$;

revoke all on function public.normalize_character_inventory_stacks_staff(uuid)
from public, anon;

grant execute on function public.normalize_character_inventory_stacks_staff(uuid)
to authenticated;
