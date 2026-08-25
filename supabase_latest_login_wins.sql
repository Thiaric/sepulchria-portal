begin;

create table if not exists public.portal_active_sessions (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,
  portal_instance_id uuid not null,
  claimed_at timestamptz not null
    default now(),
  last_seen_at timestamptz not null
    default now()
);

create index if not exists portal_active_sessions_last_seen_idx
  on public.portal_active_sessions(last_seen_at);

alter table public.portal_active_sessions
  enable row level security;

revoke all
on table public.portal_active_sessions
from anon, authenticated;

commit;
