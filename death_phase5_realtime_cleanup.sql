-- Death Phase 5: Realtime system events
-- Target commit: 64704840eeff3b7a794d190bcdb4bc6998548c12

begin;

drop policy if exists "Players can read current room system events"
  on public.room_system_events;

create policy "Players can read current room system events"
on public.room_system_events
for select
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.user_id = auth.uid()
      and c.current_room_id = room_system_events.room_id
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_system_events'
  ) then
    alter publication supabase_realtime
      add table public.room_system_events;
  end if;
end
$$;

commit;
