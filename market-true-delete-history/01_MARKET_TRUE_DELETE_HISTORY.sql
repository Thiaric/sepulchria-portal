alter table public.market_transactions
  add column if not exists shop_name_snapshot text,
  add column if not exists shop_slug_snapshot text,
  add column if not exists item_name_snapshot text,
  add column if not exists item_slug_snapshot text;

alter table public.market_transactions disable trigger market_transactions_immutable;

update public.market_transactions mt
set
  shop_name_snapshot = coalesce(mt.shop_name_snapshot, s.name),
  shop_slug_snapshot = coalesce(mt.shop_slug_snapshot, s.slug),
  item_name_snapshot = coalesce(mt.item_name_snapshot, i.name),
  item_slug_snapshot = coalesce(mt.item_slug_snapshot, i.slug)
from public.market_shops s, public.items i
where s.id = mt.shop_id
  and i.id = mt.item_id;

alter table public.market_transactions enable trigger market_transactions_immutable;

alter table public.market_transactions
  alter column shop_name_snapshot set not null,
  alter column shop_slug_snapshot set not null,
  alter column item_name_snapshot set not null,
  alter column item_slug_snapshot set not null,
  alter column listing_id drop not null;

do $$
declare v_constraint text;
begin
  select con.conname into v_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where nsp.nspname='public'
    and rel.relname='market_transactions'
    and con.contype='f'
    and att.attname='listing_id'
  limit 1;

  if v_constraint is not null then
    execute format('alter table public.market_transactions drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.market_transactions
  add constraint market_transactions_listing_id_fkey
  foreign key (listing_id)
  references public.market_listings(id)
  on delete set null;

create or replace function public.snapshot_market_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.shop_name_snapshot is null
     or new.shop_slug_snapshot is null
     or new.item_name_snapshot is null
     or new.item_slug_snapshot is null then
    select s.name, s.slug, i.name, i.slug
    into new.shop_name_snapshot, new.shop_slug_snapshot,
         new.item_name_snapshot, new.item_slug_snapshot
    from public.market_shops s, public.items i
    where s.id = new.shop_id
      and i.id = new.item_id;
  end if;

  return new;
end;
$$;

drop trigger if exists market_transactions_snapshot
  on public.market_transactions;

create trigger market_transactions_snapshot
before insert on public.market_transactions
for each row
execute function public.snapshot_market_transaction();
