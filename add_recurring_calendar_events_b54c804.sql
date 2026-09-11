-- Sepulchria recurring calendar events
-- Existing events remain one-time events.

alter table public.calendar_events
  add column if not exists recurrence_type text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.calendar_events'::regclass
      and conname = 'calendar_events_recurrence_type_check'
  ) then
    alter table public.calendar_events
      add constraint calendar_events_recurrence_type_check
      check (
        recurrence_type in (
          'none',
          'daily',
          'weekly',
          'monthly',
          'yearly'
        )
      );
  end if;
end
$$;

create index if not exists calendar_events_recurrence_lookup_idx
  on public.calendar_events (
    is_active,
    recurrence_type,
    event_date
  );

-- Confirm current values.
select
  id,
  title,
  event_date,
  recurrence_type,
  is_active
from public.calendar_events
order by event_date desc, start_time asc nulls first;
