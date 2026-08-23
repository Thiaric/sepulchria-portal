begin;
create table if not exists public.ticket_notification_reads (
 user_id uuid not null,
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 last_read_at timestamptz not null default now(),
 primary key (user_id,ticket_id)
);
create index if not exists ticket_notification_reads_ticket_idx on public.ticket_notification_reads(ticket_id,last_read_at);
alter table public.ticket_notification_reads enable row level security;
commit;
