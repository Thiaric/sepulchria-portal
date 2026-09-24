begin;
drop trigger if exists sync_npc_location_presence_trigger on public.npcs;
drop function if exists public.sync_npc_location_presence();
delete from public.character_presence cp using public.npcs n where cp.character_id=n.character_id;
alter table public.npcs drop column if exists is_location_active;
commit;
