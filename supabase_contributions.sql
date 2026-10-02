-- Sepulchria Contributions
-- Run this manually in the Supabase SQL Editor.
-- This subsystem is intentionally separate from all Store tables.

create extension if not exists pgcrypto;

create table if not exists public.support_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  character_id uuid null,
  customer_email text null,
  amount_minor integer not null
    check (amount_minor between 100 and 50000),
  currency text not null default 'GBP'
    check (currency = upper(currency) and length(currency) = 3),
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'paid',
        'failed',
        'partially_refunded',
        'refunded'
      )
    ),
  stripe_environment text not null default 'sandbox',
  stripe_checkout_session_id text unique null,
  stripe_payment_intent_id text unique null,
  stripe_charge_id text unique null,
  stripe_customer_id text null,
  paid_at timestamptz null,
  refunded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_contributions_user_created_idx
  on public.support_contributions (user_id, created_at desc);

create index if not exists support_contributions_status_idx
  on public.support_contributions (status);

create table if not exists public.support_contribution_email_log (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null
    references public.support_contributions(id)
    on delete cascade,
  kind text not null
    check (kind in ('thank_you')),
  recipient text not null,
  status text not null
    check (status in ('sent', 'skipped', 'error')),
  provider_message_id text null,
  error text null,
  created_at timestamptz not null default now()
);

create index if not exists support_contribution_email_log_contribution_idx
  on public.support_contribution_email_log (contribution_id, created_at desc);

alter table public.support_contributions enable row level security;
alter table public.support_contribution_email_log enable row level security;

-- No authenticated-client policies are intentionally created.
-- The authenticated server action and dedicated Stripe webhook use
-- the existing service-role admin client.
