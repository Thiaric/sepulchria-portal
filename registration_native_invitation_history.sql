-- Native Supabase Auth invitation history.
-- Run this ONCE in Supabase SQL Editor before testing the new invitation flow.

create table if not exists public.registration_auth_invitations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.registration_applications(id)
    on delete cascade,
  auth_user_id uuid null
    references auth.users(id)
    on delete set null,
  email text not null,
  created_by uuid null
    references auth.users(id)
    on delete set null,
  sent_at timestamptz not null default now(),
  accepted_at timestamptz null
);

create index if not exists
  registration_auth_invitations_application_id_idx
on public.registration_auth_invitations(application_id);

create index if not exists
  registration_auth_invitations_sent_at_idx
on public.registration_auth_invitations(sent_at desc);

alter table public.registration_auth_invitations
  enable row level security;

comment on table public.registration_auth_invitations is
  'Staff audit/history for native Supabase Auth closed-alpha invitations.';
