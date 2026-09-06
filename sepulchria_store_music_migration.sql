-- Sepulchria Store — Music extension
-- Run this in Supabase SQL Editor after the original Store Phase 1 migration.

begin;

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  artist text not null default '',
  description text not null default '',
  audio_url text not null,
  preview_url text,
  artwork_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_tracks_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.character_music_entitlements (
  character_id uuid not null references public.characters(id) on delete cascade,
  music_track_id uuid not null references public.music_tracks(id) on delete cascade,
  enabled boolean not null default true,
  source text not null default 'paid' check (source in ('paid','staff')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (character_id, music_track_id)
);

create index if not exists music_tracks_active_sort_idx
  on public.music_tracks (is_active, sort_order, name);

create index if not exists character_music_entitlements_character_idx
  on public.character_music_entitlements (character_id, enabled);

alter table public.store_products
  drop constraint if exists store_products_category_check;

alter table public.store_products
  add constraint store_products_category_check
  check (category in ('skin','cosmetic','music','friend_list','private_location','bundle'));

alter table public.store_discount_codes
  drop constraint if exists store_discount_codes_scope_category_check;

alter table public.store_discount_codes
  add constraint store_discount_codes_scope_category_check
  check (scope_category is null or scope_category in ('skin','cosmetic','music','friend_list','private_location','bundle'));

alter table public.store_post_purchase_offers
  drop constraint if exists store_post_purchase_offers_trigger_category_check;

alter table public.store_post_purchase_offers
  add constraint store_post_purchase_offers_trigger_category_check
  check (trigger_category is null or trigger_category in ('skin','cosmetic','music','friend_list','private_location','bundle'));

alter table public.store_product_grants
  add column if not exists music_track_id uuid references public.music_tracks(id) on delete restrict;

alter table public.store_product_grants
  drop constraint if exists store_product_grants_grant_type_check;

alter table public.store_product_grants
  add constraint store_product_grants_grant_type_check
  check (grant_type in ('portal_skin','cosmetic','music','feature'));

alter table public.store_product_grants
  drop constraint if exists store_product_grants_target_check;

alter table public.store_product_grants
  add constraint store_product_grants_target_check check (
    (grant_type='portal_skin' and portal_skin_id is not null and cosmetic_item_id is null and music_track_id is null and feature_key is null) or
    (grant_type='cosmetic' and portal_skin_id is null and cosmetic_item_id is not null and music_track_id is null and feature_key is null) or
    (grant_type='music' and portal_skin_id is null and cosmetic_item_id is null and music_track_id is not null and feature_key is null) or
    (grant_type='feature' and portal_skin_id is null and cosmetic_item_id is null and music_track_id is null and feature_key in ('friend_list','private_chat'))
  );

create unique index if not exists store_product_grants_music_unique
  on public.store_product_grants(product_id, music_track_id)
  where music_track_id is not null;

alter table public.store_order_grants
  add column if not exists music_track_id uuid references public.music_tracks(id) on delete restrict;

alter table public.store_order_grants
  drop constraint if exists store_order_grants_grant_type_check;

alter table public.store_order_grants
  add constraint store_order_grants_grant_type_check
  check (grant_type in ('portal_skin','cosmetic','music','feature'));

alter table public.store_order_grants
  drop constraint if exists store_order_grants_target_check;

alter table public.store_order_grants
  add constraint store_order_grants_target_check check (
    (grant_type='portal_skin' and portal_skin_id is not null and cosmetic_item_id is null and music_track_id is null and feature_key is null) or
    (grant_type='cosmetic' and portal_skin_id is null and cosmetic_item_id is not null and music_track_id is null and feature_key is null) or
    (grant_type='music' and portal_skin_id is null and cosmetic_item_id is null and music_track_id is not null and feature_key is null) or
    (grant_type='feature' and portal_skin_id is null and cosmetic_item_id is null and music_track_id is null and feature_key in ('friend_list','private_chat'))
  );

alter table public.music_tracks enable row level security;
alter table public.character_music_entitlements enable row level security;

drop policy if exists "music tracks authenticated read" on public.music_tracks;
create policy "music tracks authenticated read"
on public.music_tracks for select to authenticated
using (is_active = true);

drop policy if exists "own music entitlements read" on public.character_music_entitlements;
create policy "own music entitlements read"
on public.character_music_entitlements for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = character_music_entitlements.character_id
      and c.user_id = auth.uid()
  )
);

commit;
