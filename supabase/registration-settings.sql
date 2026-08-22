-- Registration gate for Sepulchria.
-- Run once in the Supabase SQL Editor.
-- Default is CLOSED.

create table if not exists public.registration_settings (
  id smallint primary key,
  registrations_open boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  constraint registration_settings_singleton check (id = 1)
);

insert into public.registration_settings (
  id,
  registrations_open
)
values (
  1,
  false
)
on conflict (id) do nothing;

alter table public.registration_settings enable row level security;

drop policy if exists "registration settings are publicly readable"
  on public.registration_settings;

create policy "registration settings are publicly readable"
on public.registration_settings
for select
to anon, authenticated
using (true);

drop policy if exists "admins can update registration settings"
  on public.registration_settings;

create policy "admins can update registration settings"
on public.registration_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.staff_members
    where staff_members.user_id = auth.uid()
      and staff_members.role in ('owner', 'admin')
  )
)
with check (
  id = 1
  and exists (
    select 1
    from public.staff_members
    where staff_members.user_id = auth.uid()
      and staff_members.role in ('owner', 'admin')
  )
);

grant select on public.registration_settings to anon, authenticated;
grant update (
  registrations_open,
  updated_at,
  updated_by
) on public.registration_settings to authenticated;
