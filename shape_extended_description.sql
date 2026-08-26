-- Sepulchria: optional rich-text Extended Description for Shapes
-- Run this once in Supabase SQL Editor.

alter table public.shapes
  add column if not exists extended_description text null;

comment on column public.shapes.extended_description is
  'Optional sanitised rich-text lore/detail shown on Shape catalogue/profile panels. Not used in Warping chat output.';
