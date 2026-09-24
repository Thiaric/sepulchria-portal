-- Database rollback. Does NOT delete system Character rows automatically.
begin;
alter table public.private_location_rooms drop column if exists description_changed_at;
alter table public.order_headquarters drop column if exists description_changed_at;
drop index if exists public.npcs_character_id_unique;
alter table public.npcs drop column if exists order_id;
alter table public.npcs drop column if exists character_id;
commit;
