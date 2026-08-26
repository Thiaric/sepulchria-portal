-- Preserve generated registration invitation links for staff history.
-- Run once in Supabase SQL Editor.

alter table public.registration_invitations
  add column if not exists invitation_url text null;

comment on column public.registration_invitations.invitation_url is
  'Full generated registration URL retained for staff-only invitation history.';
