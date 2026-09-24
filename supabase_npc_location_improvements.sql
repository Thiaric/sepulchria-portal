-- Run once in Supabase SQL Editor after applying the Python patch.
begin;

alter table public.npcs add column if not exists character_id uuid null references public.characters(id) on delete set null;
create unique index if not exists npcs_character_id_unique on public.npcs(character_id) where character_id is not null;
alter table public.npcs add column if not exists order_id uuid null references public.orders(id) on delete set null;
alter table public.order_headquarters add column if not exists description_changed_at timestamptz null;
alter table public.private_location_rooms add column if not exists description_changed_at timestamptz null;

insert into public.characters (id,user_id,first_name,surname,pronouns,portrait_url,physical_description,personality,biography,public_slug,status,approved_at,current_room_id,race_id,title,is_system,muscles,reflexes,vigor,brains,shrewd,presence_score,current_health)
select n.id,null,n.name,'',n.pronouns,n.portrait_url,coalesce(n.description,'NPC'),'Staff-controlled NPC.',coalesce(n.description,'Staff-controlled NPC.'),'npc-'||replace(n.id::text,'-',''),'approved',now(),n.current_room_id,n.race_id,'NPC',true,3,3,3,3,3,3,30 from public.npcs n where not exists(select 1 from public.characters c where c.id=n.id);
update public.npcs n set character_id=n.id where n.character_id is null and exists(select 1 from public.characters c where c.id=n.id and c.is_system=true);
commit;
