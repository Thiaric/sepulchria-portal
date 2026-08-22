-- Active ancestry portal skins.
-- Inactive ancestries intentionally omitted:
-- Half-Aelari, Half-Vaskari, Nephilim.

insert into public.portal_skins (
  slug,
  name,
  description,
  preview_image_url,
  price_pence,
  is_default,
  is_active,
  sort_order
)
values
  (
    'aelari-dawn',
    'Aelari''s Dawn',
    'Luminous ivory, pale gold and cool sky-blue inspired by the Aelari.',
    null,
    null,
    false,
    true,
    200
  ),
  (
    'dwarven-deep',
    'Dwarven Deep',
    'Black stone, iron, bronze and forge-red inspired by the Dwarves.',
    null,
    null,
    false,
    true,
    210
  ),
  (
    'mortal-hearth',
    'Mortal Hearth',
    'Warm earth, old gold and firelit cream inspired by Humanity.',
    null,
    null,
    false,
    true,
    220
  ),
  (
    'wolfs-moon',
    'Wolf''s Moon',
    'Charcoal, cold grey and moon-silver inspired by the Werewolves.',
    null,
    null,
    false,
    true,
    230
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  preview_image_url = excluded.preview_image_url,
  price_pence = excluded.price_pence,
  is_default = excluded.is_default,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;
