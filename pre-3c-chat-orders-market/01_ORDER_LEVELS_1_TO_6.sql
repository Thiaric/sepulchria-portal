do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'order_levels'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%level%'
  loop
    execute format(
      'alter table public.order_levels drop constraint %I',
      r.conname
    );
  end loop;
end
$$;

do $$
declare
  v_order_id uuid;
begin
  for v_order_id in
    select distinct ol.order_id
    from public.order_levels ol
    where ol.level = 0
  loop
    if exists (
      select 1
      from public.order_levels ol
      where ol.order_id = v_order_id
        and ol.level = 6
    ) then
      raise exception
        'Order % contains both Level 0 and Level 6. Migration stopped because the hierarchy is ambiguous.',
        v_order_id;
    end if;

    update public.order_levels set level = 6 where order_id = v_order_id and level = 5;
    update public.order_levels set level = 5 where order_id = v_order_id and level = 4;
    update public.order_levels set level = 4 where order_id = v_order_id and level = 3;
    update public.order_levels set level = 3 where order_id = v_order_id and level = 2;
    update public.order_levels set level = 2 where order_id = v_order_id and level = 1;
    update public.order_levels set level = 1 where order_id = v_order_id and level = 0;
  end loop;
end
$$;

insert into public.order_levels (order_id, level)
select o.id, gs.level
from public.orders o
cross join generate_series(1, 6) as gs(level)
where not exists (
  select 1
  from public.order_levels ol
  where ol.order_id = o.id
    and ol.level = gs.level
);

do $$
begin
  if exists (
    select 1
    from public.order_levels
    where level < 1 or level > 6
  ) then
    raise exception
      'order_levels still contains values outside 1..6. Inspect those rows before continuing.';
  end if;
end
$$;

alter table public.order_levels
  add constraint order_levels_level_1_6_check
  check (level between 1 and 6);

do $$
declare
  r record;
begin
  for r in
    select
      trg.tgname,
      pg_get_functiondef(proc.oid) as function_definition
    from pg_trigger trg
    join pg_class rel on rel.oid = trg.tgrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_proc proc on proc.oid = trg.tgfoid
    where nsp.nspname = 'public'
      and rel.relname = 'orders'
      and not trg.tgisinternal
  loop
    if r.function_definition ilike '%order_levels%' then
      execute format(
        'drop trigger if exists %I on public.orders',
        r.tgname
      );
    end if;
  end loop;
end
$$;

create or replace function public.create_order_levels_1_to_6()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_levels (order_id, level)
  select new.id, gs.level
  from generate_series(1, 6) as gs(level)
  on conflict (order_id, level) do nothing;

  return new;
end;
$$;

drop trigger if exists orders_create_levels_1_to_6
  on public.orders;

create trigger orders_create_levels_1_to_6
after insert on public.orders
for each row
execute function public.create_order_levels_1_to_6();
