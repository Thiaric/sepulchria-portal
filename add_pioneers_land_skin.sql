-- Pioneers' Land portal skin
-- Run in Supabase SQL Editor after applying the code patch.
--
-- This creates the skin as active and previewable.
-- It is NOT marked as the default skin and does not automatically grant ownership.
-- You can grant it to your own user from the existing admin user skin-access controls
-- after inserting it.

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
values (
  'pioneers-land',
  'Pioneers'' Land',
  'An elegant frontier-inspired skin of deep charcoal, warm gold and aged bronze.',
  null,
  null,
  false,
  true,
  999
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
