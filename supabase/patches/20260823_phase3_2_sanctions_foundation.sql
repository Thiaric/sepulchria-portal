begin;

create table if not exists public.sanction_events (
  id uuid primary key default gen_random_uuid(),
  sanction_id uuid not null references public.sanctions(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sanction_events_event_type_check check (
    event_type in (
      'issued','revoked','expired','status_changed',
      'appeal_submitted','appeal_decided'
    )
  )
);

create index if not exists sanction_events_sanction_created_idx
  on public.sanction_events(sanction_id,created_at desc);

create index if not exists sanctions_target_status_idx
  on public.sanctions(target_user_id,status,issued_at desc);

create index if not exists sanctions_ticket_idx
  on public.sanctions(ticket_id,issued_at desc);

alter table public.sanction_events enable row level security;

commit;
