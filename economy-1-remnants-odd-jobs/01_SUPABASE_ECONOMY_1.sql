-- SEPULCHRIA — ECONOMY 1
create extension if not exists pgcrypto;

create table if not exists public.character_wallets (
  character_id uuid primary key references public.characters(id) on delete cascade,
  balance bigint not null default 100 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remnant_ledger (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  transaction_type text not null,
  source_type text not null,
  source_id text null,
  reason text not null,
  actor_user_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists remnant_ledger_character_created_idx
  on public.remnant_ledger(character_id, created_at desc);

create or replace function public.prevent_remnant_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Remnant ledger entries are immutable.';
end;
$$;

drop trigger if exists remnant_ledger_immutable on public.remnant_ledger;
create trigger remnant_ledger_immutable
before update or delete on public.remnant_ledger
for each row execute function public.prevent_remnant_ledger_mutation();

create or replace function public._post_remnant_transaction(
  p_character_id uuid,
  p_amount bigint,
  p_transaction_type text,
  p_source_type text,
  p_source_id text,
  p_reason text,
  p_actor_user_id uuid default null
)
returns table (ledger_id uuid, new_balance bigint)
language plpgsql security definer set search_path = public
as $$
declare
  v_balance bigint;
  v_new_balance bigint;
  v_ledger_id uuid;
begin
  if p_amount = 0 then raise exception 'Remnant transaction amount cannot be zero.'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'A transaction reason is required.'; end if;

  insert into public.character_wallets(character_id, balance)
  values (p_character_id, 100)
  on conflict (character_id) do nothing;

  select balance into v_balance
  from public.character_wallets
  where character_id = p_character_id
  for update;

  v_new_balance := v_balance + p_amount;
  if v_new_balance < 0 then raise exception 'Insufficient Remnants.'; end if;

  update public.character_wallets
  set balance = v_new_balance, updated_at = now()
  where character_id = p_character_id;

  insert into public.remnant_ledger(
    character_id, amount, balance_after, transaction_type,
    source_type, source_id, reason, actor_user_id
  )
  values (
    p_character_id, p_amount, v_new_balance, p_transaction_type,
    p_source_type, p_source_id, p_reason, p_actor_user_id
  )
  returning id into v_ledger_id;

  return query select v_ledger_id, v_new_balance;
end;
$$;

revoke all on function public._post_remnant_transaction(uuid,bigint,text,text,text,text,uuid)
from public, anon, authenticated;

insert into public.character_wallets(character_id, balance)
select id, 100 from public.characters
on conflict (character_id) do nothing;

insert into public.remnant_ledger(
  character_id, amount, balance_after, transaction_type,
  source_type, source_id, reason, actor_user_id
)
select
  c.id, 100, 100, 'opening_balance', 'character_creation',
  c.id::text, 'Starting balance', c.user_id
from public.characters c
where not exists (
  select 1 from public.remnant_ledger l
  where l.character_id = c.id and l.transaction_type = 'opening_balance'
);

create or replace function public.create_starting_character_wallet()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.character_wallets(character_id, balance)
  values (new.id, 100)
  on conflict (character_id) do nothing;

  if not exists (
    select 1 from public.remnant_ledger
    where character_id = new.id and transaction_type = 'opening_balance'
  ) then
    insert into public.remnant_ledger(
      character_id, amount, balance_after, transaction_type,
      source_type, source_id, reason, actor_user_id
    )
    values (
      new.id, 100, 100, 'opening_balance', 'character_creation',
      new.id::text, 'Starting balance', new.user_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists character_starting_wallet on public.characters;
create trigger character_starting_wallet
after insert on public.characters
for each row execute function public.create_starting_character_wallet();

create or replace function public.staff_adjust_remnants(
  p_character_id uuid,
  p_amount bigint,
  p_reason text
)
returns table (ledger_id uuid, new_balance bigint)
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required.'; end if;
  if not exists (select 1 from public.staff_members where user_id = v_user_id) then
    raise exception 'Staff access required.';
  end if;
  if p_amount = 0 then raise exception 'Adjustment amount cannot be zero.'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'A staff adjustment reason is required.'; end if;

  return query
  select * from public._post_remnant_transaction(
    p_character_id, p_amount, 'staff_adjustment', 'staff',
    v_user_id::text, trim(p_reason), v_user_id
  );
end;
$$;

revoke all on function public.staff_adjust_remnants(uuid,bigint,text) from public, anon;
grant execute on function public.staff_adjust_remnants(uuid,bigint,text) to authenticated;

create table if not exists public.odd_jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.odd_job_daily_rates (
  work_date date not null,
  job_id uuid not null references public.odd_jobs(id) on delete cascade,
  pay integer not null check (pay between 10 and 50),
  generated_at timestamptz not null default now(),
  primary key(work_date, job_id)
);

create table if not exists public.odd_job_claims (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  work_date date not null,
  job_id uuid not null references public.odd_jobs(id),
  pay integer not null check (pay between 10 and 50),
  ledger_id uuid null references public.remnant_ledger(id),
  worked_at timestamptz not null default now(),
  unique(character_id, work_date)
);

insert into public.odd_jobs(name, description, sort_order) values
('Farming','Tend fields, harvest produce, and handle the day''s agricultural work.',10),
('Woodcutting','Cut, split, and stack timber for the city''s workshops and hearths.',20),
('Dock Work','Load, unload, sort, and secure goods moving through the city.',30),
('Stable Hand','Feed, groom, clean, and assist with the care of working animals.',40),
('Courier Work','Carry parcels, notices, and small deliveries across Sepulchria.',50),
('Warehouse Sorting','Sort incoming stock, crates, sacks, and general supplies.',60),
('Street Cleaning','Help keep streets, drains, and public spaces usable and clean.',70),
('Kitchen Help','Prepare ingredients, clean equipment, and assist a busy kitchen.',80)
on conflict(name) do nothing;

create or replace function public._ensure_odd_job_rates(p_work_date date)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.odd_job_daily_rates(work_date, job_id, pay)
  select p_work_date, id, floor(random() * 41 + 10)::integer
  from public.odd_jobs where is_active = true
  on conflict(work_date, job_id) do nothing;
end;
$$;

revoke all on function public._ensure_odd_job_rates(date) from public, anon, authenticated;

create or replace function public.get_my_odd_jobs_state()
returns table (
  job_id uuid, job_name text, job_description text, pay integer,
  sort_order integer, claimed boolean, claimed_job_id uuid,
  claimed_job_name text, claimed_pay integer, wallet_balance bigint,
  work_date date
)
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
  v_work_date date := (now() at time zone 'Europe/London')::date;
begin
  if v_user_id is null then raise exception 'Authentication required.'; end if;

  select id into v_character_id
  from public.characters where user_id = v_user_id limit 1;

  if v_character_id is null then raise exception 'Character not found.'; end if;

  perform public._ensure_odd_job_rates(v_work_date);

  return query
  select
    j.id, j.name, j.description, r.pay, j.sort_order,
    (cl.id is not null), cl.job_id, cj.name, cl.pay, w.balance, v_work_date
  from public.odd_jobs j
  join public.odd_job_daily_rates r
    on r.job_id = j.id and r.work_date = v_work_date
  join public.character_wallets w
    on w.character_id = v_character_id
  left join public.odd_job_claims cl
    on cl.character_id = v_character_id and cl.work_date = v_work_date
  left join public.odd_jobs cj on cj.id = cl.job_id
  where j.is_active = true
  order by j.sort_order, j.name;
end;
$$;

revoke all on function public.get_my_odd_jobs_state() from public, anon;
grant execute on function public.get_my_odd_jobs_state() to authenticated;

create or replace function public.claim_odd_job(p_job_id uuid)
returns table(job_name text, paid integer, new_balance bigint, work_date date)
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
  v_room_id uuid;
  v_status text;
  v_date date := (now() at time zone 'Europe/London')::date;
  v_pay integer;
  v_name text;
  v_claim uuid;
  v_ledger uuid;
  v_balance bigint;
begin
  if v_user_id is null then raise exception 'Authentication required.'; end if;

  select id, current_room_id, status::text
  into v_character_id, v_room_id, v_status
  from public.characters
  where user_id = v_user_id limit 1;

  if v_character_id is null then raise exception 'Character not found.'; end if;
  if v_status <> 'approved' then raise exception 'Only approved characters can work at the Odd Jobs Bureau.'; end if;

  if not exists (
    select 1 from public.rooms
    where id = v_room_id and slug = 'odd-jobs-bureau' and is_active = true
  ) then
    raise exception 'You must be at the Odd Jobs Bureau to work.';
  end if;

  if exists (
    select 1 from public.odd_job_claims
    where character_id = v_character_id and work_date = v_date
  ) then
    raise exception 'You have already worked today. Return tomorrow.';
  end if;

  select name into v_name from public.odd_jobs
  where id = p_job_id and is_active = true;

  if v_name is null then raise exception 'This job is not currently available.'; end if;

  perform public._ensure_odd_job_rates(v_date);

  select pay into v_pay from public.odd_job_daily_rates
  where work_date = v_date and job_id = p_job_id;

  insert into public.odd_job_claims(character_id, work_date, job_id, pay)
  values(v_character_id, v_date, p_job_id, v_pay)
  returning id into v_claim;

  select ledger_id, new_balance into v_ledger, v_balance
  from public._post_remnant_transaction(
    v_character_id, v_pay, 'income', 'odd_job',
    v_claim::text, 'Odd Jobs Bureau — ' || v_name, v_user_id
  );

  update public.odd_job_claims set ledger_id = v_ledger where id = v_claim;

  return query select v_name, v_pay, v_balance, v_date;
end;
$$;

revoke all on function public.claim_odd_job(uuid) from public, anon;
grant execute on function public.claim_odd_job(uuid) to authenticated;

alter table public.character_wallets enable row level security;
alter table public.remnant_ledger enable row level security;
alter table public.odd_jobs enable row level security;
alter table public.odd_job_daily_rates enable row level security;
alter table public.odd_job_claims enable row level security;

drop policy if exists "wallet owner or staff can read" on public.character_wallets;
create policy "wallet owner or staff can read"
on public.character_wallets for select to authenticated
using (
  exists(select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
  or exists(select 1 from public.staff_members s where s.user_id = auth.uid())
);

drop policy if exists "ledger owner or staff can read" on public.remnant_ledger;
create policy "ledger owner or staff can read"
on public.remnant_ledger for select to authenticated
using (
  exists(select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
  or exists(select 1 from public.staff_members s where s.user_id = auth.uid())
);

drop policy if exists "authenticated can read odd jobs" on public.odd_jobs;
create policy "authenticated can read odd jobs"
on public.odd_jobs for select to authenticated using (is_active = true);

drop policy if exists "authenticated can read odd job rates" on public.odd_job_daily_rates;
create policy "authenticated can read odd job rates"
on public.odd_job_daily_rates for select to authenticated using (true);

drop policy if exists "own claims or staff can read" on public.odd_job_claims;
create policy "own claims or staff can read"
on public.odd_job_claims for select to authenticated
using (
  exists(select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
  or exists(select 1 from public.staff_members s where s.user_id = auth.uid())
);
