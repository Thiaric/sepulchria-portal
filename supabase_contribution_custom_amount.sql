-- Contribution custom amount support.
-- Baseline: b0353ac
-- Run once in Supabase SQL Editor after supabase_contribution_catalogue.sql.

alter table public.support_contribution_products
  add column if not exists pricing_mode text not null default 'fixed';

alter table public.support_contribution_products
  add column if not exists custom_min_amount_minor integer null;

alter table public.support_contribution_products
  add column if not exists custom_max_amount_minor integer null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'support_contribution_products_pricing_mode_check'
  ) then
    alter table public.support_contribution_products
      add constraint support_contribution_products_pricing_mode_check
      check (pricing_mode in ('fixed', 'custom'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'support_contribution_products_custom_amounts_check'
  ) then
    alter table public.support_contribution_products
      add constraint support_contribution_products_custom_amounts_check
      check (
        pricing_mode = 'fixed'
        or (
          custom_min_amount_minor is not null
          and custom_max_amount_minor is not null
          and custom_min_amount_minor between 100 and 50000
          and custom_max_amount_minor between custom_min_amount_minor and 50000
        )
      );
  end if;
end
$$;
