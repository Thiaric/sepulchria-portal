-- Recurring calendar events
-- Run this once in Supabase SQL Editor before using the code patch.

alter table public.calendar_events
  add column if not exists recurrence_type text not null default 'once';

alter table public.calendar_events
  drop constraint if exists calendar_events_recurrence_type_check;

alter table public.calendar_events
  add constraint calendar_events_recurrence_type_check
  check (
    recurrence_type = any (
      array[
        'once'::text,
        'daily'::text,
        'weekly'::text,
        'monthly'::text,
        'yearly'::text
      ]
    )
  );

-- Existing events remain one-off events.
update public.calendar_events
set recurrence_type = 'once'
where recurrence_type is null
   or recurrence_type not in ('once', 'daily', 'weekly', 'monthly', 'yearly');

select
  id,
  title,
  event_date,
  recurrence_type
from public.calendar_events
order by event_date desc, start_time asc;
