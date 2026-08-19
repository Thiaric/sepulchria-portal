-- SEPULCHRIA — PRIVATE LOCATION SECURITY HARDENING
--
-- The application patch is the primary gate.
-- This trigger is defense-in-depth for room_messages so a character who
-- somehow submits directly cannot write into a private room without access.
-- Staff are always allowed.

create or replace function public.enforce_private_location_room_message_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_private boolean;
  v_owner uuid;
  v_current_character uuid;
  v_staff boolean;
  v_owner_enabled boolean;
  v_member_active boolean;
begin
  select true, owner_character_id
  into v_private, v_owner
  from public.private_location_rooms
  where room_id = new.room_id;

  if not coalesce(v_private, false) then
    return new;
  end if;

  select id
  into v_current_character
  from public.characters
  where user_id = auth.uid()
  limit 1;

  select exists (
    select 1
    from public.staff_members
    where user_id = auth.uid()
  )
  into v_staff;

  if coalesce(v_staff, false) then
    return new;
  end if;

  if v_current_character is null
     or new.character_id <> v_current_character then
    raise exception 'Private location access denied';
  end if;

  select exists (
    select 1
    from public.character_feature_entitlements
    where character_id = v_owner
      and feature_key = 'private_chat'
      and enabled = true
  )
  into v_owner_enabled;

  select exists (
    select 1
    from public.private_location_members
    where room_id = new.room_id
      and character_id = v_current_character
      and status = 'active'
  )
  into v_member_active;

  if not (
    coalesce(v_owner_enabled, false)
    and coalesce(v_member_active, false)
  ) then
    raise exception 'Private location access denied';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_private_location_room_message_access_trigger
on public.room_messages;

create trigger enforce_private_location_room_message_access_trigger
before insert or update
on public.room_messages
for each row
execute function public.enforce_private_location_room_message_access();
