begin;

drop trigger if exists aaa_normalize_npc_mechanics_room_message
on public.room_messages;

drop function if exists public.normalize_npc_mechanics_room_message();

commit;
