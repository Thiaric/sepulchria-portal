begin;

create or replace function public.get_npc_visual_order(
  p_character_id uuid
)
returns table(
  id uuid,
  name text,
  slug text,
  icon_url text,
  colour text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    o.id,
    o.name,
    o.slug,
    o.icon_url,
    o.colour
  from public.npcs n
  join public.orders o
    on o.id = n.order_id
  where n.character_id = p_character_id
  limit 1;
$function$;

revoke all on function public.get_npc_visual_order(uuid)
from public, anon;

grant execute on function public.get_npc_visual_order(uuid)
to authenticated, service_role;

commit;
