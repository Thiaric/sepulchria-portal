begin;

drop trigger if exists trg_snapshot_room_message_conditions
on public.room_messages;

drop function if exists public.snapshot_room_message_conditions();

commit;
