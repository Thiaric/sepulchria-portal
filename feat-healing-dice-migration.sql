-- Feat healing dice
-- Built for sepulchria-portal commit a4c7e4612a5e8f79a62c096c0dac3b0087b904a8

alter table public.gifts
  add column if not exists health_dice text null;

alter table public.gifts
  drop constraint if exists gifts_health_dice_format_check;

alter table public.gifts
  add constraint gifts_health_dice_format_check
  check (
    health_dice is null
    or health_dice ~ '^[1-9][0-9]*d(4|6|8|10|12|20|100)$'
  );
