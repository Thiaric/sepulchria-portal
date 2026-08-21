-- Sepulchria Portal — nine additional premium portal skins
begin;

insert into public.portal_skins (
  slug,
  name,
  description,
  price_pence,
  is_active,
  is_default,
  sort_order
)
values
  ('blood-court','Blood Court','Blackened crimson, old ivory and restrained scarlet accents.',null,true,false,20),
  ('ivory-archive','Ivory Archive','Pale parchment, charcoal ink and aged brass inspired by sealed archives.',null,true,false,30),
  ('verdant-reliquary','Verdant Reliquary','Deep forest greens, mineral shadows and muted botanical highlights.',null,true,false,40),
  ('amethyst-veil','Amethyst Veil','Dark violet, smoky plum and cold lavender with an arcane character.',null,true,false,50),
  ('emberforge','Emberforge','Coal-black surfaces, copper borders and ember-orange highlights.',null,true,false,60),
  ('deepwater','Deepwater','A drowned palette of midnight teal, oxidised metal and cold sea-glass.',null,true,false,70),
  ('ashen','Ashen','Near-monochrome charcoal, pewter and pale silver for a severe understated portal.',null,true,false,80),
  ('rose-nocturne','Rose Nocturne','Black plum, antique rose and faded blush with a nocturnal softness.',null,true,false,90),
  ('starfall','Starfall','Ink-blue darkness, indigo metal and clear celestial highlights.',null,true,false,100)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;

select slug, name, is_default, is_active, sort_order
from public.portal_skins
order by sort_order, name;
